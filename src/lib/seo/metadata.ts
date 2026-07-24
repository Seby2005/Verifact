import type { Metadata } from 'next';

export interface CreateMetadataOptions {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
}

export function createMetadata(options: CreateMetadataOptions): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fact-checker-ai.vercel.app';
  const url = options.path ? `${baseUrl}${options.path}` : baseUrl;
  const image = options.image || `${baseUrl}/og-image.png`;

  return {
    title: options.title,
    description: options.description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: options.title,
      description: options.description,
      url,
      siteName: 'Fact-Checker AI',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: options.title,
        },
      ],
      type: options.type || 'website',
      locale: 'ro_RO',
    },
    twitter: {
      card: 'summary_large_image',
      title: options.title,
      description: options.description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
