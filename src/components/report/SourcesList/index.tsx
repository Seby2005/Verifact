import type { CombinedSource } from '@/types/verification';
import styles from './SourcesList.module.css';

interface SourcesListProps {
  sources: CombinedSource[];
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  fact_check: 'Fact-check',
  factcheck: 'Fact-check',
  official: 'Oficial',
  news: 'Stire',
  social: 'Social media',
};

const SOURCE_TYPE_COLORS: Record<string, string> = {
  fact_check: 'factcheck',
  factcheck: 'factcheck',
  official: 'official',
  news: 'news',
  social: 'social',
};

export function SourcesList({ sources }: SourcesListProps) {
  if (sources.length === 0) {
    return (
      <section className={styles.section} aria-labelledby="sources-heading">
        <h2 id="sources-heading" className={styles.heading}>Surse folosite</h2>
        <p className={styles.empty}>Nu au fost identificate surse externe in aceasta verificare.</p>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-labelledby="sources-heading">
      <h2 id="sources-heading" className={styles.heading}>
        Surse folosite in verificare ({sources.length})
      </h2>
      <ol className={styles.list}>
        {sources.map((source, i) => {
          const typeKey = source.sourceType || source.type || 'news';
          return (
            <li key={i} className={styles.item}>
              <div className={styles.itemHeader}>
                <span className={`${styles.typeBadge} ${styles[SOURCE_TYPE_COLORS[typeKey] || 'news']}`}>
                  {SOURCE_TYPE_LABELS[typeKey] || 'Sursa'}
                </span>
                {source.supports === true && <span className={styles.supportsBadge} aria-label="Confirma afirmatia">✓ Confirma</span>}
                {source.supports === false && <span className={styles.deniesBadge} aria-label="Infirma afirmatia">✗ Infirma</span>}
              </div>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.title}
                aria-label={`${source.title} - deschide in tab nou`}
              >
                {source.title}
              </a>
              <div className={styles.meta}>
                <span className={styles.publisher}>{source.publisher}</span>
                {(source.publishedAt || source.date) && (
                  <>
                    <span className={styles.dot} aria-hidden="true">·</span>
                    <time className={styles.date} dateTime={source.publishedAt || source.date}>
                      {new Date(source.publishedAt || source.date || '').toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </time>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
