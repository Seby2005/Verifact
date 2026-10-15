function hostOf(urlOrDomain: string): string {
  try {
    const withScheme = /^https?:\/\//i.test(urlOrDomain) ? urlOrDomain : `https://${urlOrDomain}`;
    return new URL(withScheme).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * The publisher's own site for a citation whose link goes through someone
 * else's redirect — a Google News result links to news.google.com, not to
 * digi24.ro. Returns undefined when the link already points at the publisher,
 * which is the normal case and needs no special handling.
 *
 * Everything that reads a source's identity off its link (credibility tier,
 * favicon, the site-only link free plans get, the origin shown to the AI
 * source filter) must prefer this when it is set, or every such source would
 * be attributed to the aggregator.
 *
 * @param link      Where the citation points.
 * @param publisher The publisher's domain or URL, as the search engine reported it.
 */
export function publisherSiteOf(link: string, publisher?: string): string | undefined {
  const publisherHost = publisher ? hostOf(publisher) : '';
  if (!publisherHost.includes('.')) return undefined;

  const linkHost = hostOf(link);
  const samePublisher =
    linkHost === publisherHost || linkHost.endsWith(`.${publisherHost}`) || publisherHost.endsWith(`.${linkHost}`);
  return samePublisher ? undefined : `https://${publisherHost}`;
}
