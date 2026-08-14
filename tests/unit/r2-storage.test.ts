import { isR2Configured, getR2PublicUrl, uploadToR2, deleteFromR2 } from '@/lib/storage/r2';

describe('Cloudflare R2 Storage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('detects when R2 is not configured', () => {
    delete process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    expect(isR2Configured()).toBe(false);
  });

  it('detects when R2 is configured', () => {
    process.env.CLOUDFLARE_R2_ACCOUNT_ID = 'acc123';
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'key123';
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'sec123';
    process.env.CLOUDFLARE_R2_BUCKET_NAME = 'my-bucket';

    expect(isR2Configured()).toBe(true);
  });

  it('generates public URL using custom domain if configured', () => {
    process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN = 'https://assets.verifact.ro';
    expect(getR2PublicUrl('images/claim-123.webp')).toBe('https://assets.verifact.ro/images/claim-123.webp');
    expect(getR2PublicUrl('/images/claim-123.webp')).toBe('https://assets.verifact.ro/images/claim-123.webp');
  });

  it('returns failure when uploadToR2 called without credentials', async () => {
    delete process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;

    const result = await uploadToR2({
      key: 'test.jpg',
      data: 'test-data',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/);
  });

  it('returns failure when deleteFromR2 called without credentials', async () => {
    delete process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;

    const result = await deleteFromR2('test.jpg');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/);
  });
});
