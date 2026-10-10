'use client';

import React, { useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { useLanguage } from '@/i18n';
import type { VerificationReport } from '@/types/verification';
import { Onest } from 'next/font/google';
import styles from './ShareCardButton.module.css';

export interface ShareCardButtonProps {
  report: VerificationReport;
}

// Onest carries the whole card (design 2b, "Verdict pe culoare"). Not preloaded:
// it is only fetched when the share modal draws, via document.fonts.load.
const onest = Onest({
  weight: ['500', '600', '700', '800'],
  subsets: ['latin', 'latin-ext'],
  preload: false,
  display: 'swap',
});
const FONT = `${onest.style.fontFamily}, 'Helvetica Neue', Arial, sans-serif`;

/** Fixed light palette so the exported PNG looks the same for every viewer. */
const PALETTE = {
  card: '#ffffff',
  ink: '#111111',
  inkMuted: '#8a8a92',
  brandDot: '#e5484d',
} as const;

/** The verdict panel colour — the card is read by this colour first. */
const VERDICT_COLOR: Record<VerificationReport['verdict'], string> = {
  true: '#2f7d5b',
  partial: '#c0892e',
  unclear: '#6c7480',
  false: '#e5484d',
};

/** Wrap `text` to `maxWidth`, capped at `maxLines` with a trailing ellipsis. */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);

  // If we ran out of lines, ellipsize the last one within the width budget.
  const consumed = lines.join(' ').split(/\s+/).length;
  if (consumed < words.length && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 0) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

/** Set font + tracking (em) together; letterSpacing is skipped where unsupported. */
function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number, trackingEm = 0): void {
  ctx.font = `${weight} ${size}px ${FONT}`;
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${trackingEm * size}px`;
  }
}

/** Design 2b ("Verdict pe culoare") at 2.5×: 432×540 artboard → 1080×1350 export. */
function drawCard(report: VerificationReport, locale: string, labels: {
  tagline: string;
  verdictTitle: string;
  verdictLabel: string;
}): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const INSET = 25; // card padding around the verdict panel
  const P = INSET + 60; // text inset for header + claim
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const vc = VERDICT_COLOR[report.verdict];
  const score = Math.round(Math.min(100, Math.max(0, report.score)));

  ctx.fillStyle = PALETTE.card;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Header: "verifact." wordmark + date.
  const headerBase = P + 34;
  setFont(ctx, 700, 45, -0.02);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('verifact', P, headerBase);
  const markW = ctx.measureText('verifact').width;
  ctx.fillStyle = PALETTE.brandDot;
  ctx.fillText('.', P + markW, headerBase);

  const dateStr = formatDate(report.createdAt, locale);
  if (dateStr) {
    setFont(ctx, 500, 32.5);
    ctx.fillStyle = PALETTE.inkMuted;
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, W - P, headerBase);
    ctx.textAlign = 'left';
  }

  // Verdict panel, pinned to the bottom. Rows inside the 60px padding:
  // "Verdict" (33) · 5 · label + score (89) · 40 · bar (15) · 40 · tagline (33).
  const pad = 60;
  const panelH = pad * 2 + 33 + 5 + 89 + 40 + 15 + 40 + 33;
  const panelW = W - INSET * 2;
  const panelY = H - INSET - panelH;
  roundRect(ctx, INSET, panelY, panelW, panelH, 50);
  ctx.fillStyle = vc;
  ctx.fill();

  const left = INSET + pad;
  const right = INSET + panelW - pad;
  let y = panelY + pad;

  setFont(ctx, 500, 32.5);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(labels.verdictTitle, left, y + 27);
  y += 33 + 5;

  // Score on the right; the verdict label shrinks to fit what is left of the row.
  const rowBase = y + 72;
  setFont(ctx, 800, 85, -0.03);
  ctx.fillStyle = '#ffffff';
  const scoreText = `${score}%`;
  const scoreW = ctx.measureText(scoreText).width;
  ctx.textAlign = 'right';
  ctx.fillText(scoreText, right, rowBase);
  ctx.textAlign = 'left';

  const labelMax = right - left - scoreW - 40;
  let labelSize = 85;
  setFont(ctx, 800, labelSize, -0.03);
  while (ctx.measureText(labels.verdictLabel).width > labelMax && labelSize > 48) {
    labelSize -= 2;
    setFont(ctx, 800, labelSize, -0.03);
  }
  ctx.fillText(labels.verdictLabel, left, rowBase);
  y += 89 + 40;

  const barW = right - left;
  roundRect(ctx, left, y, barW, 15, 7.5);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();
  roundRect(ctx, left, y, Math.max(15, (score / 100) * barW), 15, 7.5);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  y += 15 + 40;

  setFont(ctx, 500, 32.5);
  ctx.fillText(labels.tagline, left, y + 27);

  // Claim, vertically centred between header and panel. Long claims step down
  // a size before they get ellipsized.
  const claim = (report.claim ?? report.inputText ?? '').trim();
  const quoted = locale === 'ro' ? `„${claim}”` : locale === 'fr' ? `« ${claim} »` : `“${claim}”`;
  const top = headerBase + 30;
  const bottom = panelY - 30;
  let size = 67.5;
  let lines: string[] = [];
  for (const s of [67.5, 56, 48]) {
    size = s;
    setFont(ctx, 600, size, -0.02);
    lines = wrapLines(ctx, quoted, W - P * 2, Math.floor((bottom - top) / (size * 1.22)));
    if (!lines[lines.length - 1]?.endsWith('…')) break;
  }
  const lineH = size * 1.22;
  let cy = top + (bottom - top - lines.length * lineH) / 2 + size * 0.95;
  ctx.fillStyle = PALETTE.ink;
  for (const line of lines) {
    ctx.fillText(line, P, cy);
    cy += lineH;
  }

  return canvas;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatDate(iso?: string, locale = 'ro'): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const tag = locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'ro-RO';
  // Short month without the abbreviation dot: "8 oct 2026".
  return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' })
    .format(d)
    .replace('.', '');
}

const FILE_TYPE = 'image/png';

export const ShareCardButton: React.FC<ShareCardButtonProps> = ({ report }) => {
  const { locale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);

  const fileName = `verifact-${report.id}.png`;
  const claim = (report.claim ?? report.inputText ?? '').trim();
  const shareText = `„${claim}” — ${t(`verdict.copy.${report.verdict}`)} (${Math.round(report.score)}%)`;
  const shareUrl =
    typeof window !== 'undefined'
      ? report.isPublic || report.visibilityStatus === 'public'
        ? `${window.location.origin}/rapoarte/${report.id}`
        : window.location.origin
      : '';

  const openModal = async () => {
    setOpen(true);
    setCopied(false);
    if (imgUrl) return; // Already rendered this session.
    setBusy(true);
    try {
      if (document.fonts) {
        await Promise.all(
          ['500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 40px ${FONT}`)),
        ).catch(() => undefined);
      }
      const canvas = drawCard(report, locale, {
        tagline: t('reportView.shareCard.tagline'),
        verdictTitle: t('cite.verdictLabel'),
        verdictLabel: t(`verdict.copy.${report.verdict}`),
      });
      const b: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, FILE_TYPE));
      if (!b) throw new Error('toBlob failed');
      setBlob(b);
      setImgUrl(canvas.toDataURL(FILE_TYPE));
    } catch {
      alert(t('reportView.shareCard.error'));
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyImage = async () => {
    const canCopy =
      typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';
    if (!blob || !canCopy) {
      alert(t('reportView.shareCard.copyFail'));
      return;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ [FILE_TYPE]: blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(t('reportView.shareCard.copyFail'));
    }
  };

  const nativeShare = async () => {
    if (!blob) return;
    const file = new File([blob], fileName, { type: FILE_TYPE });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({ files: [file], title: t('reportView.shareCard.shareTitle') });
      } catch {
        /* dismissed */
      }
    }
  };

  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof (navigator as Navigator & { canShare?: unknown }).canShare === 'function';

  const socialLinks = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      key: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
  ];

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={openModal}>
        {t('reportView.shareCard.button')}
      </Button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={t('reportView.shareCard.modalTitle')}>
        <div className={styles.body}>
          <p className={styles.lead}>{t('reportView.shareCard.modalLead')}</p>

          <div className={styles.preview}>
            {busy || !imgUrl ? (
              <div className={styles.skeleton}>{t('reportView.shareCard.generating')}</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgUrl} alt="" className={styles.previewImg} />
            )}
          </div>

          <div className={styles.actions}>
            {canNativeShare ? (
              <Button type="button" variant="primary" size="md" onClick={nativeShare} disabled={!blob} fullWidth>
                {t('reportView.shareCard.nativeShare')}
              </Button>
            ) : null}
            <Button type="button" variant="primary" size="md" onClick={download} disabled={!blob} fullWidth>
              {t('reportView.shareCard.download')}
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={copyImage} disabled={!blob} fullWidth>
              {copied ? t('reportView.shareCard.copied') : t('reportView.shareCard.copy')}
            </Button>
          </div>

          <div className={styles.linkRow}>
            <span className={styles.linkLabel}>{t('reportView.shareCard.linkLabel')}</span>
            <div className={styles.linkButtons}>
              {socialLinks.map((s) => (
                <a
                  key={s.key}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={styles.linkBtn}
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <p className={styles.note}>{t('reportView.shareCard.socialNote')}</p>
        </div>
      </Modal>
    </>
  );
};
