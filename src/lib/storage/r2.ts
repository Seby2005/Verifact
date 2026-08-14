import crypto from 'node:crypto';
import { logger } from '@/lib/utils/logger';

export interface R2UploadOptions {
  key: string;
  data: Buffer | Uint8Array | ArrayBuffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface R2UploadResult {
  success: boolean;
  key: string;
  url?: string;
  error?: string;
}

export interface R2DeleteResult {
  success: boolean;
  key: string;
  error?: string;
}

interface R2Config {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  publicDomain?: string;
}

function getR2Config(): R2Config {
  return {
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'verifact-storage',
    publicDomain: process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_DOMAIN,
  };
}

/**
 * Checks if Cloudflare R2 is configured in the environment.
 */
export function isR2Configured(): boolean {
  const config = getR2Config();
  return Boolean(config.accountId && config.accessKeyId && config.secretAccessKey && config.bucketName);
}

/**
 * Gets the public URL for an object stored in R2.
 */
export function getR2PublicUrl(key: string): string {
  const config = getR2Config();
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;

  if (config.publicDomain) {
    const domain = config.publicDomain.replace(/\/+$/, '');
    const prefix = domain.startsWith('http') ? domain : `https://${domain}`;
    return `${prefix}/${cleanKey}`;
  }

  return `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${cleanKey}`;
}

/**
 * Generates an AWS Signature Version 4 Authorization Header for Cloudflare R2 S3 API.
 */
function generateAwsSigV4Headers(
  method: string,
  url: URL,
  headers: Record<string, string>,
  body: Buffer,
  config: Required<Pick<R2Config, 'accessKeyId' | 'secretAccessKey'>>
): Record<string, string> {
  const service = 's3';
  const region = 'auto'; // Cloudflare R2 uses 'auto'
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8); // YYYYMMDD
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z'; // YYYYMMDDTHHMMSSZ

  const sha256Hex = (data: Buffer | string): string => {
    return crypto.createHash('sha256').update(data).digest('hex');
  };

  const hmacSha256 = (key: Buffer | string, data: string): Buffer => {
    return crypto.createHmac('sha256', key).update(data).digest();
  };

  const payloadHash = sha256Hex(body);

  const reqHeaders: Record<string, string> = {
    ...headers,
    host: url.host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
  };

  const sortedHeaderKeys = Object.keys(reqHeaders).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((k) => `${k.toLowerCase()}:${reqHeaders[k].trim()}\n`)
    .join('');
  const signedHeaders = sortedHeaderKeys.map((k) => k.toLowerCase()).join(';');

  const canonicalRequest = [
    method,
    url.pathname,
    url.search ? url.search.slice(1) : '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kSecret = Buffer.from(`AWS4${config.secretAccessKey}`, 'utf-8');
  const kDate = hmacSha256(kSecret, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...reqHeaders,
    Authorization: authorizationHeader,
  };
}

/**
 * Uploads an object to Cloudflare R2 bucket using S3-compatible API.
 */
export async function uploadToR2(options: R2UploadOptions): Promise<R2UploadResult> {
  const config = getR2Config();

  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
    logger.warn('R2 credentials missing, skipping upload', { service: 'R2Storage', key: options.key });
    return {
      success: false,
      key: options.key,
      error: 'Cloudflare R2 is not configured.',
    };
  }

  const cleanKey = options.key.startsWith('/') ? options.key.slice(1) : options.key;
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${cleanKey}`;
  const url = new URL(endpoint);

  let bodyBuffer: Buffer;
  if (typeof options.data === 'string') {
    bodyBuffer = Buffer.from(options.data, 'utf-8');
  } else if (Buffer.isBuffer(options.data)) {
    bodyBuffer = options.data;
  } else if (options.data instanceof Uint8Array) {
    bodyBuffer = Buffer.from(options.data);
  } else if (options.data instanceof ArrayBuffer) {
    bodyBuffer = Buffer.from(options.data);
  } else {
    bodyBuffer = Buffer.alloc(0);
  }

  const contentType = options.contentType || 'application/octet-stream';
  const initialHeaders: Record<string, string> = {
    'content-type': contentType,
    'content-length': String(bodyBuffer.length),
  };

  try {
    const signedHeaders = generateAwsSigV4Headers(
      'PUT',
      url,
      initialHeaders,
      bodyBuffer,
      {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      }
    );

    const arrayBuffer = bodyBuffer.buffer.slice(
      bodyBuffer.byteOffset,
      bodyBuffer.byteOffset + bodyBuffer.byteLength
    ) as ArrayBuffer;

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: signedHeaders,
      body: new Blob([arrayBuffer]),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      logger.error('R2 upload failed', {
        service: 'R2Storage',
        status: response.status,
        errorText,
        key: cleanKey,
      });
      return {
        success: false,
        key: cleanKey,
        error: `R2 upload returned status ${response.status}`,
      };
    }

    const publicUrl = getR2PublicUrl(cleanKey);
    return {
      success: true,
      key: cleanKey,
      url: publicUrl,
    };
  } catch (error) {
    logger.error('R2 upload error', {
      service: 'R2Storage',
      key: cleanKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      key: cleanKey,
      error: error instanceof Error ? error.message : 'Unknown R2 upload error',
    };
  }
}

/**
 * Deletes an object from Cloudflare R2 bucket.
 */
export async function deleteFromR2(key: string): Promise<R2DeleteResult> {
  const config = getR2Config();

  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
    return {
      success: false,
      key,
      error: 'Cloudflare R2 is not configured.',
    };
  }

  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${cleanKey}`;
  const url = new URL(endpoint);

  try {
    const signedHeaders = generateAwsSigV4Headers(
      'DELETE',
      url,
      {},
      Buffer.alloc(0),
      {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      }
    );

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: signedHeaders,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok && response.status !== 404) {
      return {
        success: false,
        key: cleanKey,
        error: `R2 delete returned status ${response.status}`,
      };
    }

    return {
      success: true,
      key: cleanKey,
    };
  } catch (error) {
    return {
      success: false,
      key: cleanKey,
      error: error instanceof Error ? error.message : 'Unknown R2 delete error',
    };
  }
}
