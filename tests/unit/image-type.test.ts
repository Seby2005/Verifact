import { sniffImageType } from '@/lib/utils/image-type';

describe('sniffImageType', () => {
  it('detects a JPEG by its SOI marker', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(sniffImageType(jpeg)).toBe('image/jpeg');
  });

  it('detects a PNG by its 8-byte signature', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(sniffImageType(png)).toBe('image/png');
  });

  it('detects a WEBP by its RIFF/WEBP container', () => {
    const webp = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x00, 0x00, 0x00, 0x00]), // file size, ignored
      Buffer.from('WEBP', 'ascii'),
    ]);
    expect(sniffImageType(webp)).toBe('image/webp');
  });

  it('rejects an SVG mislabelled as an image', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', 'utf8');
    expect(sniffImageType(svg)).toBeNull();
  });

  it('rejects HTML disguised as an image', () => {
    const html = Buffer.from('<!doctype html><script>alert(1)</script>', 'utf8');
    expect(sniffImageType(html)).toBeNull();
  });

  it('rejects a truncated buffer too short to carry any signature', () => {
    expect(sniffImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(sniffImageType(Buffer.alloc(0))).toBeNull();
  });

  it('rejects a RIFF container that is not WEBP (e.g. a WAV)', () => {
    const wav = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from('WAVE', 'ascii'),
    ]);
    expect(sniffImageType(wav)).toBeNull();
  });
});
