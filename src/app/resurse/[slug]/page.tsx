import React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getResourceBySlug, RESOURCE_ARTICLES } from '@/content/resurse';
import { JsonLd } from '@/components/JsonLd';

interface DynamicArticleProps {
  params: Promise<{ slug: string }>;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.verifact.ro';

export async function generateStaticParams() {
  return RESOURCE_ARTICLES.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: DynamicArticleProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceBySlug(slug);

  if (!article) {
    return {
      title: 'Articol negăsit — Verifact',
    };
  }

  return {
    title: `${article.title} — Verifact`,
    description: article.description,
    openGraph: {
      title: article.title,
      description: article.description,
      url: `/resurse/${article.slug}`,
      type: 'article',
    },
  };
}

export default async function DynamicArticlePage({ params }: DynamicArticleProps) {
  const { slug } = await params;

  if (slug === 'glosar-dezinformare') {
    redirect('/resurse/glosar-dezinformare');
  }

  const article = getResourceBySlug(slug);

  if (!article) {
    notFound();
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: `${baseUrl}/resurse/${article.slug}`,
    datePublished: article.publishedAt,
    inLanguage: 'ro-RO',
    author: {
      '@type': 'Organization',
      name: article.author,
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Verifact',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo/verifact-v-logo-transparent.png`,
      },
    },
  };

  return (
    <div className="container">
      <JsonLd data={articleSchema} />
      <header style={{ padding: '4rem 0 2rem' }}>
        <p className="eyebrow">Resurse · {article.category}</p>
        <h1>{article.title}</h1>
        <p style={{ color: 'var(--color-ink-secondary)' }}>{article.description}</p>
      </header>
    </div>
  );
}
