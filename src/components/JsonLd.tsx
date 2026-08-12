import React from 'react';

type JsonLdData = Record<string, unknown> | Array<Record<string, unknown>>;

interface JsonLdProps {
  data: JsonLdData;
}

/**
 * Reusable JsonLd component for injecting Schema.org structured data into <head>.
 * Automatically escapes '<' to '\u003c' to prevent XSS script injection.
 */
export function JsonLd({ data }: JsonLdProps) {
  const jsonString = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}
