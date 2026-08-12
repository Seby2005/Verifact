import { getStateMediaInfo, extractDomainFromUrl } from '@/lib/verification/state-media';

describe('State Media Registry & Detection', () => {
  it('should correctly extract domains from various URL formats', () => {
    expect(extractDomainFromUrl('https://www.rt.com/news/123')).toBe('rt.com');
    expect(extractDomainFromUrl('http://tass.com/article')).toBe('tass.com');
    expect(extractDomainFromUrl('subdomain.presstv.ir/path')).toBe('subdomain.presstv.ir');
    expect(extractDomainFromUrl('')).toBe('');
  });

  it('should identify Russian state-controlled media outlets', () => {
    const rtInfo = getStateMediaInfo('https://www.rt.com/news/article-123');
    expect(rtInfo).not.toBeNull();
    expect(rtInfo?.countryCode).toBe('RU');
    expect(rtInfo?.controlLevel).toBe('state_controlled');
    expect(rtInfo?.badgeLabel).toContain('Rusia');

    const tassInfo = getStateMediaInfo('https://tass.com/world/1000000');
    expect(tassInfo).not.toBeNull();
    expect(tassInfo?.countryCode).toBe('RU');
    expect(tassInfo?.name).toContain('TASS');
  });

  it('should identify Iranian state-controlled media outlets', () => {
    const pressTv = getStateMediaInfo('https://www.presstv.ir/Detail/2026/08/12/12345');
    expect(pressTv).not.toBeNull();
    expect(pressTv?.countryCode).toBe('IR');
    expect(pressTv?.controlLevel).toBe('state_controlled');
  });

  it('should identify US state-funded media outlets', () => {
    const voa = getStateMediaInfo('https://www.voanews.com/a/world-news/1234.html');
    expect(voa).not.toBeNull();
    expect(voa?.countryCode).toBe('US');
    expect(voa?.controlLevel).toBe('state_funded');
  });

  it('should identify public service broadcasters like BBC', () => {
    const bbc = getStateMediaInfo('https://www.bbc.com/news/world-123456');
    expect(bbc).not.toBeNull();
    expect(bbc?.countryCode).toBe('GB');
    expect(bbc?.controlLevel).toBe('public_broadcaster');
  });

  it('should return null for independent/unlisted news outlets', () => {
    const reuters = getStateMediaInfo('https://www.reuters.com/world/article-1');
    expect(reuters).toBeNull();

    const g4media = getStateMediaInfo('https://www.g4media.ro/stire-test.html');
    expect(g4media).toBeNull();
  });
});
