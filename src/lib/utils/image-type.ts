/**
 * A file's declared type (a `Content-Type` header or a `mimeType` field) is
 * just a claim the sender makes — trivially forged. The bytes don't lie: an
 * image format announces itself in its first few bytes ("magic bytes"). We
 * read those to decide what a payload *actually* is before handing it to an
 * OCR provider, so a caller can't slip through something that isn't one of the
 * image formats we accept by simply mislabelling it.
 *
 * Returns the detected MIME type, or `null` when the bytes match none of the
 * formats we support — which the caller treats as "reject this upload".
 */
export type SupportedImageType = 'image/jpeg' | 'image/png' | 'image/webp';

export function sniffImageType(buffer: Buffer): SupportedImageType | null {
  // JPEG: SOI marker FF D8, followed by another FF starting the first segment.
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: the 8-byte signature 89 'P' 'N' 'G' 0D 0A 1A 0A.
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WEBP: a RIFF container ("RIFF" at 0, "WEBP" at 8). Bytes 4-7 hold the file
  // size, so they're skipped.
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}
