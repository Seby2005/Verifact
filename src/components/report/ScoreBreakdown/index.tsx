'use client';
import { useState } from 'react';
import type { ScoreBreakdown as ScoreBreakdownType } from '@/types/verification';
import styles from './ScoreBreakdown.module.css';

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType;
}

const LAYER_LABELS = ['L1 Fact-check DB', 'L2 Stiri', 'L3 Surse oficiale', 'L4 Social media'];
const LAYER_KEYS = ['layer1Score', 'layer2Score', 'layer3Score', 'layer4Score'] as const;

function ScoreBar({ value, label, max = 100 }: { value: number; label: string; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = value >= 85 ? 'success' : value >= 60 ? 'warning' : value >= 40 ? 'unclear' : 'error';
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack} role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
        <div className={`${styles.barFill} ${styles[color]}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.barValue}>{value}/100</span>
    </div>
  );
}

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  const [showFormula, setShowFormula] = useState(false);
  const { finalScore } = breakdown;
  const color = finalScore >= 85 ? 'success' : finalScore >= 60 ? 'warning' : finalScore >= 40 ? 'unclear' : 'error';

  return (
    <section className={styles.card} aria-labelledby="score-heading">
      <div className={styles.header}>
        <h2 id="score-heading" className={styles.heading}>Scor pe straturi</h2>
        <button
          className={styles.formulaBtn}
          onClick={() => setShowFormula(v => !v)}
          aria-expanded={showFormula}
          aria-controls="score-formula"
          type="button"
        >
          Cum se calculeaza scorul? {showFormula ? '▲' : '▼'}
        </button>
      </div>

      {showFormula && (
        <div id="score-formula" className={styles.formulaBox}>
          <p>Formula: <code>Scor = L1×35% + L2×30% + L3×25% + L4×10%</code></p>
          <p>Straturile indisponibile au greutatea redistribuita proportional intre cele disponibile.</p>
          <p>Scor 85-100% = Probabil Adevarat · 60-84% = Partial · 40-59% = Neclar · 0-39% = Probabil Fals</p>
        </div>
      )}

      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Scor total:</span>
        <div className={styles.totalBarWrap}>
          <div className={styles.totalTrack} role="progressbar" aria-valuenow={finalScore} aria-valuemax={100} aria-label={`Scor total ${finalScore}`}>
            <div className={`${styles.totalFill} ${styles[color]}`} style={{ width: `${finalScore}%` }} />
          </div>
          <span className={`${styles.totalValue} ${styles[color]}`}>{finalScore}%</span>
        </div>
      </div>

      <div className={styles.layerBars}>
        {LAYER_KEYS.map((key, i) => (
          <ScoreBar key={key} value={breakdown[key]} label={LAYER_LABELS[i]} />
        ))}
      </div>

      {breakdown.adjustedForAvailability && (
        <p className={styles.adjustedNote}>
          * Scorul a fost ajustat — {4 - breakdown.availableLayers} strat(uri) au fost indisponibile la momentul verificarii.
        </p>
      )}
    </section>
  );
}
