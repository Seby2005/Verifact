'use client';
import { useState } from 'react';
import type { Layer1Result, Layer2Result, Layer3Result, Layer4Result, OfficialSource } from '@/types/verification';
import styles from './LayerDetails.module.css';

interface LayerDetailsProps {
  layer1: Layer1Result;
  layer2: Layer2Result;
  layer3: Layer3Result;
  layer4: Layer4Result;
  aiAnalysis: string;
}

function AccordionPanel({ title, count, status, children }: { title: string; count: number; status: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const isUnavailable = status === 'unavailable' || status === 'error';
  const isSkipped = status === 'skipped';
  return (
    <div className={styles.panel}>
      <button
        className={styles.panelHeader}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        type="button"
      >
        <span className={styles.panelTitle}>{title}</span>
        <span className={styles.panelMeta}>
          {isUnavailable ? 'Indisponibil' : isSkipped ? 'Neaplicabil' : `${count} gasite`}
        </span>
        <span className={styles.chevron} aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className={styles.panelBody}>{children}</div>}
    </div>
  );
}

export function LayerDetails({ layer1, layer2, layer3, layer4, aiAnalysis }: LayerDetailsProps) {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <section aria-labelledby="layers-heading">
      <h2 id="layers-heading" className={styles.sectionTitle}>Analiza pe straturi</h2>

      {/* AI Analysis accordion */}
      <div className={`${styles.panel} ${styles.aiPanel}`}>
        <button
          className={styles.panelHeader}
          onClick={() => setAiOpen(v => !v)}
          aria-expanded={aiOpen}
          type="button"
        >
          <span className={styles.panelTitle}>🤖 Analiza detaliata AI</span>
          <span className={styles.chevron} aria-hidden="true">{aiOpen ? '▲' : '▼'}</span>
        </button>
        {aiOpen && (
          <div className={styles.panelBody}>
            <div className={styles.aiText} dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
          </div>
        )}
      </div>

      {/* Layer 1 */}
      <AccordionPanel title="Fact-check-uri anterioare" count={layer1?.results?.length ?? layer1?.matches?.length ?? 0} status={layer1?.status ?? 'unavailable'}>
        {(!layer1?.results || layer1.results.length === 0) ? (
          <p className={styles.emptyMsg}>Nu au fost gasite fact-check-uri anterioare pentru aceasta afirmatie.</p>
        ) : (
          <ul className={styles.resultList}>
            {layer1.results.map((r, i) => (
              <li key={i} className={styles.resultItem}>
                <span className={`${styles.rating} ${(r.ratingValue ?? 0) < 0.4 ? styles.ratingFalse : (r.ratingValue ?? 0) > 0.6 ? styles.ratingTrue : styles.ratingPartial}`}>
                  {r.rating}
                </span>
                <span className={styles.resultText}>{(r.claimReviewed || r.title || '').slice(0, 120)}</span>
                <a href={r.reviewUrl || r.url} target="_blank" rel="noopener noreferrer" className={styles.link}>{r.publisher} →</a>
              </li>
            ))}
          </ul>
        )}
      </AccordionPanel>

      {/* Layer 2 */}
      <AccordionPanel title="Articole jurnalistice" count={layer2?.results?.length ?? layer2?.articles?.length ?? 0} status={layer2?.status ?? 'unavailable'}>
        {(!layer2?.results || layer2.results.length === 0) ? (
          <p className={styles.emptyMsg}>Nu au fost gasite articole relevante.</p>
        ) : (
          <ul className={styles.resultList}>
            {layer2.results.map((a, i) => (
              <li key={i} className={styles.resultItem}>
                <span className={`${styles.sentiment} ${styles[`sentiment_${a.sentiment || 'neutral'}`]}`}>
                  {a.sentiment === 'confirms' ? '✓ Confirma' : a.sentiment === 'contradicts' ? '✗ Contrazice' : '• Neutru'}
                </span>
                <span className={styles.resultText}>{a.title}</span>
                <a href={a.articleUrl || a.url} target="_blank" rel="noopener noreferrer" className={styles.link}>{a.source} →</a>
              </li>
            ))}
          </ul>
        )}
      </AccordionPanel>

      {/* Layer 3 */}
      <AccordionPanel title="Surse guvernamentale & oficiale" count={layer3?.results?.length ?? layer3?.sources?.length ?? 0} status={layer3?.status ?? 'unavailable'}>
        {(!layer3?.results || layer3.results.length === 0) ? (
          <p className={styles.emptyMsg}>Nu au fost gasite comunicate oficiale relevante.</p>
        ) : (
          <ul className={styles.resultList}>
            {layer3.results.map((doc: OfficialSource, i: number) => (
              <li key={i} className={styles.resultItem}>
                <span className={styles.govTag}>[Gov / Oficial]</span>
                <span className={styles.resultText}>{doc.title}</span>
                <a href={doc.documentUrl || doc.url} target="_blank" rel="noopener noreferrer" className={styles.link}>{doc.publisher || doc.organization || 'Sursa oficiala'} →</a>
              </li>
            ))}
          </ul>
        )}
      </AccordionPanel>

      {/* Layer 4 */}
      <AccordionPanel title="Declaratii publice" count={layer4?.results?.length ?? layer4?.posts?.length ?? 0} status={layer4?.status ?? 'unavailable'}>
        {layer4?.status === 'skipped' ? (
          <p className={styles.emptyMsg}>Nu au fost identificate persoane publice in aceasta afirmatie — stratul nu se aplica.</p>
        ) : (!layer4?.results || layer4.results.length === 0) ? (
          <p className={styles.emptyMsg}>Nu au fost gasite declaratii relevante.</p>
        ) : (
          <ul className={styles.resultList}>
            {layer4.results.map((p, i) => (
              <li key={i} className={styles.resultItem}>
                <strong className={styles.org}>{p.author}{p.authorRole ? ` (${p.authorRole})` : ''}</strong>
                <span className={styles.resultText}>{(p.content || p.snippet || p.text || '').slice(0, 200)}</span>
                <a href={p.postUrl || p.url} target="_blank" rel="noopener noreferrer" className={styles.link}>{p.platform} →</a>
              </li>
            ))}
          </ul>
        )}
      </AccordionPanel>
    </section>
  );
}
