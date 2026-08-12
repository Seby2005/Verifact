import { JsonLd } from '@/components/JsonLd';

describe('JsonLd Component', () => {
  it('is defined and is a function component', () => {
    expect(JsonLd).toBeDefined();
    expect(typeof JsonLd).toBe('function');
  });

  it('generates correct props with application/ld+json type and JSON string payload', () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Verifact',
      url: 'https://www.verifact.ro',
    };

    const element = JsonLd({ data });

    expect(element.props.type).toBe('application/ld+json');
    expect(element.props.dangerouslySetInnerHTML.__html).toBe(JSON.stringify(data));
  });

  it('escapes less-than characters to prevent XSS script injection', () => {
    const data = {
      description: '<script>alert("xss")</script>',
    };

    const element = JsonLd({ data });

    expect(element.props.dangerouslySetInnerHTML.__html).not.toContain('<script');
    expect(element.props.dangerouslySetInnerHTML.__html).toContain('\\u003cscript');
  });

  it('handles array of data objects correctly', () => {
    const dataList = [
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'Verifact' },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Verifact' },
    ];

    const element = JsonLd({ data: dataList });

    expect(element.props.dangerouslySetInnerHTML.__html).toBe(JSON.stringify(dataList));
  });
});
