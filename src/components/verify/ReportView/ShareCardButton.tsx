'use client';

import React, { useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { useLanguage } from '@/i18n';
import type { VerificationReport } from '@/types/verification';
import styles from './ShareCardButton.module.css';

export interface ShareCardButtonProps {
  report: VerificationReport;
}

/** Light-theme brand tokens, mirrored from globals.css so the exported PNG looks
 * the same for every viewer regardless of their active theme. */
const PALETTE = {
  paper: '#f3f2ed',
  surface: '#ffffff',
  ink: '#17140f',
  inkSecondary: '#524d44',
  inkMuted: '#8a8478',
  line: '#e5e3db',
  accent: '#d63a2c',
} as const;

const VERDICT_COLOR: Record<VerificationReport['verdict'], string> = {
  true: '#2f7d5b',
  partial: '#c0892e',
  unclear: '#6c7480',
  false: '#d63a2c',
};

const SANS = "'Helvetica Neue', Arial, system-ui, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

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

function drawCard(report: VerificationReport, locale: string, labels: {
  eyebrow: string;
  tagline: string;
  scoreLabel: string;
  verdictLabel: string;
}): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const P = 88;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const vc = VERDICT_COLOR[report.verdict];

  // Background.
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, W, H);

  // Left accent rule — the single spine of colour.
  ctx.fillStyle = vc;
  ctx.fillRect(0, 0, 12, H);

  // Wordmark.
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PALETTE.accent;
  ctx.beginPath();
  ctx.arc(P + 10, P + 26, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `700 40px ${SANS}`;
  ctx.textAlign = 'left';
  ctx.save();
  drawTracked(ctx, 'VERIFACT', P + 34, P + 40, 4);
  ctx.restore();

  // Date, right-aligned on the wordmark baseline.
  const dateStr = formatDate(report.createdAt, locale);
  if (dateStr) {
    ctx.fillStyle = PALETTE.inkMuted;
    ctx.font = `500 26px ${SANS}`;
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, W - P, P + 36);
    ctx.textAlign = 'left';
  }

  // Header hairline.
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(P, P + 88);
  ctx.lineTo(W - P, P + 88);
  ctx.stroke();

  // Eyebrow.
  ctx.fillStyle = PALETTE.inkMuted;
  ctx.font = `700 24px ${SANS}`;
  drawTracked(ctx, labels.eyebrow.toUpperCase(), P, P + 168, 3);

  // Claim — the verified question, editorial serif.
  const claim = (report.claim ?? report.inputText ?? '').trim();
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `600 54px ${SERIF}`;
  const claimLines = wrapLines(ctx, `“${claim}”`, W - P * 2, 5);
  let cy = P + 240;
  for (const line of claimLines) {
    ctx.fillText(line, P, cy);
    cy += 68;
  }

  // Verdict block, anchored toward the lower third.
  const vy = 1000;
  ctx.fillStyle = vc;
  ctx.beginPath();
  ctx.arc(P + 16, vy - 18, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `700 66px ${SERIF}`;
  ctx.fillText(labels.verdictLabel, P + 52, vy);

  // Score label + big number.
  ctx.fillStyle = PALETTE.inkMuted;
  ctx.font = `700 24px ${SANS}`;
  drawTracked(ctx, labels.scoreLabel.toUpperCase(), P, vy + 78, 3);

  ctx.fillStyle = vc;
  ctx.font = `700 88px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(report.score)}%`, W - P, vy + 96);
  ctx.textAlign = 'left';

  // Score bar.
  const barY = vy + 140;
  const barW = W - P * 2;
  roundRect(ctx, P, barY, barW, 16, 8);
  ctx.fillStyle = PALETTE.line;
  ctx.fill();
  const fillW = Math.max(16, (Math.min(100, Math.max(0, report.score)) / 100) * barW);
  roundRect(ctx, P, barY, fillW, 16, 8);
  ctx.fillStyle = vc;
  ctx.fill();

  // Footer hairline + tagline.
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(P, H - P - 44);
  ctx.lineTo(W - P, H - P - 44);
  ctx.stroke();

  ctx.fillStyle = PALETTE.inkSecondary;
  ctx.font = `500 28px ${SANS}`;
  ctx.fillText(labels.tagline, P, H - P + 4);

  return canvas;
}

/** Manual letter-spacing — canvas has no letterSpacing in older engines. */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
): void {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
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
  return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
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
      if (document.fonts?.ready) await document.fonts.ready;
      const canvas = drawCard(report, locale, {
        eyebrow: t('reportView.shareCard.eyebrow'),
        tagline: t('reportView.shareCard.tagline'),
        scoreLabel: t('reportView.downloadScoreLabel'),
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
