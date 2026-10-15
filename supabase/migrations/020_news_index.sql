-- =============================================================================
-- Own news index — headlines from Romanian outlets, fact-checkers and
-- institutions, collected from their RSS feeds and searched in-database.
-- =============================================================================
-- Why: the press layer otherwise depends on third-party search (Google News /
-- Bing News RSS). Those are free but uncontracted and can throttle or change
-- at any time. This table is a search source nobody else can switch off.
--
-- Written and read only by the server (service role): RLS is enabled with no
-- policies, so the anon and authenticated roles cannot touch it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Diacritic folding, shared by indexing and querying
-- -----------------------------------------------------------------------------
-- People type "pensii marite" and outlets write "pensii mărite" (and older
-- pages use the cedilla forms ş/ţ). Both sides go through this one function,
-- so they can never disagree on what a word looks like.
CREATE OR REPLACE FUNCTION public.news_index_fold(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT translate(lower(coalesce(input, '')), 'ăâîșşțţáàéèêíóöőúüű', 'aaissttaaeeeiooouuu');
$$;

-- -----------------------------------------------------------------------------
-- 2. Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.news_index (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  snippet TEXT NOT NULL DEFAULT '',
  source_name TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'news' CHECK (kind IN ('news', 'factcheck', 'official')),
  published_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Headline words weigh more than words that only appear in the description.
  tsv TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('romanian', public.news_index_fold(title)), 'A') ||
    setweight(to_tsvector('romanian', public.news_index_fold(snippet)), 'B')
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_news_index_tsv ON public.news_index USING GIN (tsv);
-- Pruning deletes by (kind, age); the freshness check reads the newest fetch.
CREATE INDEX IF NOT EXISTS idx_news_index_kind_published ON public.news_index (kind, published_at);
CREATE INDEX IF NOT EXISTS idx_news_index_fetched ON public.news_index (fetched_at DESC);

ALTER TABLE public.news_index ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. Search
-- -----------------------------------------------------------------------------
-- Matches ANY word of the query and ranks by how many, and how prominently,
-- they appear. Requiring all words (the default for a search box) returns
-- nothing for a claim-length query; the callers re-check relevance anyway.
CREATE OR REPLACE FUNCTION public.search_news_index(p_query TEXT, p_limit INTEGER DEFAULT 12)
RETURNS TABLE (
  url TEXT,
  title TEXT,
  snippet TEXT,
  source_name TEXT,
  source_domain TEXT,
  kind TEXT,
  published_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH q AS (
    -- plainto_tsquery sanitises free text and ANDs the lexemes; swapping the
    -- operator turns that into the OR query described above.
    SELECT NULLIF(replace(plainto_tsquery('romanian', public.news_index_fold(p_query))::TEXT, '&', '|'), '')::TSQUERY AS tsq
  )
  SELECT n.url, n.title, n.snippet, n.source_name, n.source_domain, n.kind, n.published_at,
         ts_rank_cd(n.tsv, q.tsq) AS rank
  FROM public.news_index n, q
  WHERE q.tsq IS NOT NULL AND n.tsv @@ q.tsq
  ORDER BY rank DESC, n.published_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.search_news_index(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_news_index(TEXT, INTEGER) TO service_role;

-- The API layer caches the schema; without this the new table and function
-- stay invisible to it ("Could not find the function ... in the schema cache").
NOTIFY pgrst, 'reload schema';
