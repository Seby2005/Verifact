import React from 'react';
import type { InputType, VerdictType } from '@/types/database';
import { USAGE_PERIODS, type UsageShare, type UsageStats as Stats, type UsageTotals } from '@/lib/verification/usage-stats';
import styles from './UsageStats.module.css';

interface UsageStatsProps {
  stats: Stats;
}

// Same copy as VerdictLabel's VERDICT_COPY; that module is 'use client', so
// its constants can't be read from this server component.
const VERDICT_COPY: Record<VerdictType, string> = {
  true: 'Probabil adevărat',
  partial: 'Parțial adevărat',
  unclear: 'Neclar',
  false: 'Probabil fals',
};

const INPUT_TYPE_COPY: Record<InputType, string> = {
  text: 'Text',
  screenshot: 'Captură',
  url: 'Link',
};

const LANGUAGE_COPY: Record<string, string> = {
  ro: 'Română',
  en: 'Engleză',
  fr: 'Franceză',
};

const dayFormat = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const momentFormat = new Intl.DateTimeFormat('ro-RO', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Bucharest',
});

/** "13 oct." for a YYYY-MM-DD day. */
function dayLabel(date: string): string {
  return dayFormat.format(new Date(`${date}T00:00:00Z`));
}

/** A count with its noun, by the Romanian rule: 1 zi, 7 zile, 30 de zile. */
function counted(n: number, one: string, many: string): string {
  if (n === 1) return `1 ${one}`;
  const lastTwo = n % 100;
  return n === 0 || (lastTwo >= 1 && lastTwo <= 19) ? `${n} ${many}` : `${n} de ${many}`;
}

function change(current: number, previous: number): string {
  const diff = current - previous;
  if (diff === 0) return 'la fel ca în perioada dinainte';
  return `${diff > 0 ? '+' : '−'}${Math.abs(diff)} față de perioada dinainte`;
}

function Tile({
  label,
  field,
  stats,
  foot,
}: {
  label: string;
  field: keyof UsageTotals;
  stats: Stats;
  foot: string;
}) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{stats.current[field]}</span>
      <span className={styles.tileChange}>{change(stats.current[field], stats.previous[field])}</span>
      <span className={styles.tileFoot}>{foot}</span>
    </div>
  );
}

function Breakdown<K extends string>({
  title,
  rows,
  labelOf,
  fillClassOf,
}: {
  title: string;
  rows: UsageShare<K>[];
  labelOf: (key: K) => string;
  fillClassOf?: (key: K) => string;
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>{title}</h2>
      {rows.length === 0 ? (
        <p className={styles.empty}>Nimic în această perioadă.</p>
      ) : (
        <ul className={styles.shares}>
          {rows.map((row) => (
            <li key={row.key} className={styles.share}>
              <span className={styles.shareLabel}>{labelOf(row.key)}</span>
              <span className={styles.shareValue}>
                {row.count} · {Math.round((row.count / total) * 100)}%
              </span>
              <span className={styles.shareTrack}>
                <span
                  className={`${styles.shareFill} ${fillClassOf?.(row.key) ?? ''}`}
                  style={{ width: `${(row.count / total) * 100}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Server-rendered usage statistics: totals, a day-by-day chart, breakdowns and the most active people. */
export const UsageStats: React.FC<UsageStatsProps> = ({ stats }) => {
  const { current, daily } = stats;
  const peak = Math.max(...daily.map((d) => d.verifications));
  const peakIndex = daily.findIndex((d) => d.verifications === peak);
  const anonymous = current.verifications - stats.fromAccounts;

  return (
    <div className={styles.stats}>
      <nav className={styles.periods} aria-label="Perioadă">
        {USAGE_PERIODS.map((days) => (
          <a
            key={days}
            href={days === 30 ? '/admin/statistici' : `/admin/statistici?zile=${days}`}
            className={`${styles.chip} ${stats.days === days ? styles.chipActive : ''}`}
            aria-current={stats.days === days ? 'page' : undefined}
          >
            Ultimele {counted(days, 'zi', 'zile')}
          </a>
        ))}
      </nav>

      <div className={styles.tiles}>
        <Tile
          label="Verificări"
          field="verifications"
          stats={stats}
          foot={`${stats.fromAccounts} din cont · ${anonymous} fără cont`}
        />
        <Tile label="Oameni diferiți" field="people" stats={stats} foot="conturi și cititori anonimi" />
        <Tile label="Au revenit" field="returning" stats={stats} foot="au verificat în cel puțin două zile" />
        <Tile
          label="Conturi noi"
          field="signups"
          stats={stats}
          foot={`${counted(stats.accounts.total, 'cont', 'conturi')} în total`}
        />
      </div>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Verificări pe zi</h2>
        {peak === 0 ? (
          <p className={styles.empty}>Nicio verificare în această perioadă.</p>
        ) : (
          <>
            <div
              className={styles.chart}
              role="img"
              aria-label={`Verificări pe zi în ultimele ${counted(stats.days, 'zi', 'zile')}; cele mai multe, ${peak}, pe ${dayLabel(daily[peakIndex].date)}.`}
            >
              {daily.map((day, i) => (
                <div
                  key={day.date}
                  className={`${styles.slot} ${i < daily.length / 3 ? styles.slotStart : i >= (daily.length * 2) / 3 ? styles.slotEnd : ''}`}
                >
                  {day.verifications > 0 && (
                    <span className={styles.bar} style={{ height: `${(day.verifications / peak) * 100}%` }}>
                      {i === peakIndex && <span className={styles.peak}>{peak}</span>}
                    </span>
                  )}
                  <span className={styles.tip}>
                    <strong>{dayLabel(day.date)}</strong>
                    {counted(day.verifications, 'verificare', 'verificări')} · {counted(day.people, 'om', 'oameni')}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.axis} aria-hidden="true">
              <span>{dayLabel(daily[0].date)}</span>
              <span>{dayLabel(daily[Math.floor(daily.length / 2)].date)}</span>
              <span>{dayLabel(daily[daily.length - 1].date)}</span>
            </div>
            <details className={styles.table}>
              <summary>Cifrele pe zile</summary>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Zi</th>
                    <th scope="col">Verificări</th>
                    <th scope="col">Oameni</th>
                    <th scope="col">Conturi noi</th>
                  </tr>
                </thead>
                <tbody>
                  {[...daily].reverse().map((day) => (
                    <tr key={day.date}>
                      <th scope="row">{dayLabel(day.date)}</th>
                      <td>{day.verifications}</td>
                      <td>{day.people}</td>
                      <td>{day.signups}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </section>

      <div className={styles.breakdowns}>
        <Breakdown title="Ce trimit la verificat" rows={stats.byInputType} labelOf={(key) => INPUT_TYPE_COPY[key] ?? key} />
        <Breakdown
          title="Ce verdicte primesc"
          rows={stats.byVerdict}
          labelOf={(key) => VERDICT_COPY[key] ?? key}
          fillClassOf={(key) => styles[key] ?? ''}
        />
        <Breakdown title="În ce limbă" rows={stats.byLanguage} labelOf={(key) => LANGUAGE_COPY[key] ?? key} />
        <Breakdown title="Conturi pe planuri" rows={stats.accounts.byTier} labelOf={(key) => key} />
      </div>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Cei mai activi</h2>
        {stats.topPeople.length === 0 ? (
          <p className={styles.empty}>Nimeni în această perioadă.</p>
        ) : (
          <div className={styles.people}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Cine</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Verificări</th>
                  <th scope="col">Zile active</th>
                  <th scope="col">Ultima dată</th>
                </tr>
              </thead>
              <tbody>
                {stats.topPeople.map((person) => (
                  <tr key={`${person.label}-${person.lastSeen}`}>
                    <th scope="row">{person.label}</th>
                    <td>{person.tier ?? '—'}</td>
                    <td>{person.verifications}</td>
                    <td>{person.activeDays}</td>
                    <td>{momentFormat.format(new Date(person.lastSeen))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className={styles.note}>
        Cifrele vin din verificările salvate și nu includ echipa. O verificare servită din cache nu se salvează, iar
        cine doar deschide site-ul nu apare aici: vizitele, sursele lor și paginile citite sunt în{' '}
        <a href="https://cloud.umami.is" target="_blank" rel="noopener noreferrer">
          Umami
        </a>
        . Un cititor fără cont e recunoscut după rețea și browser, deci aceeași persoană de pe telefon și de pe
        laptop apare de două ori.
      </p>
    </div>
  );
};
