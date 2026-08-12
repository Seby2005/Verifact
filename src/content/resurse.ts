export interface ResourceArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  updatedAt?: string;
  readingTime: string;
  author: string;
  externalHref?: string;
  isGlossary?: boolean;
}

export const RESOURCE_ARTICLES: ResourceArticle[] = [
  {
    slug: 'glosar-dezinformare',
    title: 'Glosar de dezinformare: Termeni-cheie pe înțelesul tuturor',
    description:
      'Ghid explicativ cu privire la termenii esențiali din domeniul dezinformării: de la diferența dintre misinformare și malinformare, la deepfake, fact-checking și ferme de boți.',
    category: 'Glosar',
    publishedAt: '2026-08-12',
    readingTime: '5 min',
    author: 'Verifact',
    isGlossary: true,
  },
  {
    slug: 'cum-verifici-o-sursa-de-incredere',
    title: 'Cum verifici dacă o sursă online este de încredere',
    description:
      'Ghid practic în 5 pași pentru evaluarea veridicității site-urilor de știri, autorilor și publicațiilor din mediul online. Învață să deosebești sursele primare de cele secundare.',
    category: 'Ghid Practic',
    publishedAt: '2026-08-12',
    readingTime: '4 min',
    author: 'Verifact',
  },
  {
    slug: 'cum-identifici-deepfake',
    title: 'Cum identifici un Deepfake sau o imagine generată prin AI',
    description:
      'Află cum poți recunoaște ușor imaginile, videoclipurile și vocile generate prin inteligență artificială. Semne vizibile, anomaliile de detaliu și cum verifici rapid o poză suspectă.',
    category: 'Ghid Practic',
    publishedAt: '2026-08-10',
    readingTime: '4 min',
    author: 'Verifact',
    externalHref: '/despre-dezinformare/cum-identifici-deepfake',
  },
  {
    slug: 'scheme-phishing-social-media',
    title: 'Cum recunoști escrocheriile și phishing-ul pe rețelele sociale',
    description:
      'Ghid practic împotriva ciber-escrocheriilor de pe Facebook, WhatsApp și TikTok. Învață să identifici ofertele financiare false, mesajele capcană și furtul de identitate.',
    category: 'Securitate',
    publishedAt: '2026-08-08',
    readingTime: '4 min',
    author: 'Verifact',
    externalHref: '/despre-dezinformare/scheme-phishing-social-media',
  },
];

export function getResourceBySlug(slug: string): ResourceArticle | undefined {
  return RESOURCE_ARTICLES.find((article) => article.slug === slug);
}
