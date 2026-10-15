import React from 'react';
import type { VerdictType } from '@/types/database';
import {
  verificationLogHref,
  type VerificationLogFilter,
  type VerificationLogPage,
  type VerificationLogQuery,
} from '@/lib/verification/admin-log';
import styles from './VerificationLog.module.css';

interface VerificationLogProps {
  log: VerificationLogPage;
  query: VerificationLogQuery;
}

// Same copy as VerdictLabel's VERDICT_COPY; that module is 'use client', so
// its constants can't be read from this server component.
const VERDICT_COPY: Record<VerdictType, string> = {
  true: 'Probabil adevărat',
  partial: 'Parțial adevărat',
  unclear: 'Neclar',
  false: 'Probabil fals',
};

const FILTER_LABELS: Record<VerificationLogFilter, string> = {
  all: 'Toate',
  true: VERDICT_COPY.true,
  partial: VERDICT_COPY.partial,
  unclear: VERDICT_COPY.unclear,
  false: VERDICT_COPY.false,
  weak: 'Semnale slabe',
};

const INPUT_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  screenshot: 'Captură',
  url: 'Link',
};

const dateFormat = new Intl.DateTimeFormat('ro-RO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Bucharest',
});

/** Server-rendered list of every verification: question, answer, weak signals. */
export const VerificationLog: React.FC<VerificationLogProps> = ({ log, query }) => {
  return (
    <div className={styles.log}>
      <form action="/admin/verificari" method="get" className={styles.searchRow}>
        {query.filter !== 'all' && <input type="hidden" name="filtru" value={query.filter} />}
        {query.includeStaff && <input type="hidden" name="echipa" value="1" />}
        <label htmlFor="log-search" className={styles.srOnly}>
          Caută în întrebări
        </label>
        <input
          id="log-search"
          type="search"
          name="q"
          defaultValue={query.search}
          placeholder="Caută în întrebări (ex. vaccin, Georgescu, pensii)"
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchButton}>
          Caută
        </button>
      </form>

      <nav className={styles.filters} aria-label="Filtre verificări">
        {(Object.keys(FILTER_LABELS) as VerificationLogFilter[]).map((filter) => (
          <a
            key={filter}
            href={verificationLogHref(query, { filter, page: 1 })}
            className={`${styles.chip} ${query.filter === filter ? styles.chipActive : ''}`}
            aria-current={query.filter === filter ? 'page' : undefined}
          >
            {FILTER_LABELS[filter]}
            <span className={styles.chipCount}>{log.counts[filter]}</span>
          </a>
        ))}
        <a
          href={verificationLogHref(query, { includeStaff: !query.includeStaff, page: 1 })}
          className={styles.staffToggle}
        >
          {query.includeStaff ? 'Ascunde verificările echipei' : 'Arată și verificările echipei'}
        </a>
      </nav>

      {log.entries.length === 0 ? (
        <p className={styles.empty}>Nicio verificare pentru filtrele alese.</p>
      ) : (
        <ol className={styles.list}>
          {log.entries.map((entry) => (
            <li key={entry.id} className={styles.item}>
              <details>
                <summary className={styles.summary}>
                  <div className={styles.meta}>
                    <time dateTime={entry.createdAt}>{dateFormat.format(new Date(entry.createdAt))}</time>
                    <span>·</span>
                    <span>
                      {entry.author
                        ? `${entry.author.email ?? 'cont fără email'} (${entry.author.tier}${entry.author.isStaff ? ', echipă' : ''})`
                        : 'Anonim'}
                    </span>
                    <span>·</span>
                    <span>{INPUT_TYPE_LABELS[entry.inputType] ?? entry.inputType}</span>
                  </div>

                  <p className={styles.question}>{entry.verifiedClaim || entry.inputText}</p>

                  <div className={styles.answerLine}>
                    {entry.verdict ? (
                      <span className={`${styles.verdict} ${styles[entry.verdict]}`}>
                        {VERDICT_COPY[entry.verdict]}
                        {typeof entry.score === 'number' ? ` · ${entry.score}%` : ''}
                      </span>
                    ) : (
                      <span className={styles.verdict}>Fără verdict</span>
                    )}
                    {entry.weakSignals.map((signal) => (
                      <span key={signal} className={styles.signal}>
                        {signal}
                      </span>
                    ))}
                  </div>
                </summary>

                <div className={styles.detail}>
                  <section>
                    <h3 className={styles.detailTitle}>Întrebarea trimisă</h3>
                    <p className={styles.preserve}>{entry.inputText}</p>
                    {entry.verifiedClaim && entry.verifiedClaim !== entry.inputText && (
                      <p className={styles.note}>
                        <strong>Afirmația extrasă și căutată:</strong> {entry.verifiedClaim}
                      </p>
                    )}
                    {entry.posterCommentary && (
                      <p className={styles.note}>
                        <strong>Comentariul celui care a distribuit:</strong> {entry.posterCommentary}
                      </p>
                    )}
                  </section>

                  <section>
                    <h3 className={styles.detailTitle}>Răspunsul dat</h3>
                    <p className={styles.preserve}>{entry.executiveSummary || '—'}</p>
                    {entry.keyTakeaways.length > 0 && (
                      <ul className={styles.takeaways}>
                        {entry.keyTakeaways.map((takeaway, i) => (
                          <li key={i}>{takeaway}</li>
                        ))}
                      </ul>
                    )}
                    <p className={styles.note}>
                      Încredere: {entry.confidence ?? '—'} · Limbă: {entry.language} · Timp:{' '}
                      {entry.processingTimeMs ? `${(entry.processingTimeMs / 1000).toFixed(1)}s` : '—'}
                    </p>
                  </section>

                  <section>
                    <h3 className={styles.detailTitle}>Surse ({entry.sources.length})</h3>
                    {entry.sources.length === 0 ? (
                      <p className={styles.note}>Nicio sursă găsită.</p>
                    ) : (
                      <ul className={styles.sources}>
                        {entry.sources.map((source, i) => (
                          <li key={i}>
                            <a href={source.url} target="_blank" rel="noopener noreferrer">
                              {source.title || source.url}
                            </a>
                            <span className={styles.sourceMeta}>
                              {source.publisher}
                              {source.supports === true ? ' · susține' : source.supports === false ? ' · contrazice' : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <p className={styles.id}>ID: {entry.id}</p>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}

      {log.pageCount > 1 && (
        <nav className={styles.pagination} aria-label="Paginare">
          {log.page > 1 ? (
            <a href={verificationLogHref(query, { page: log.page - 1 })} className={styles.pageLink}>
              ← Mai noi
            </a>
          ) : (
            <span />
          )}
          <span className={styles.pageInfo}>
            Pagina {log.page} din {log.pageCount} · {log.total} verificări
          </span>
          {log.page < log.pageCount ? (
            <a href={verificationLogHref(query, { page: log.page + 1 })} className={styles.pageLink}>
              Mai vechi →
            </a>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
};
