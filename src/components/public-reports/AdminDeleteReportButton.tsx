'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

export interface AdminDeleteReportButtonProps {
  reportId: string;
  onDeleted?: () => void;
  variant?: 'button' | 'icon';
}

export const AdminDeleteReportButton: React.FC<AdminDeleteReportButtonProps> = ({
  reportId,
  onDeleted,
  variant = 'button',
}) => {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        const userEmail = data.user.email?.toLowerCase();
        if (userEmail === 'sebi.iancu23@gmail.com') {
          setIsAdmin(true);
          return;
        }

        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if ((profile as { role?: string } | null)?.role === 'admin') {
          setIsAdmin(true);
        }
      }
    });
  }, []);

  if (!isAdmin) {
    return null;
  }

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'A apărut o eroare la ștergerea raportului.');
      } else {
        setIsOpen(false);
        if (onDeleted) {
          onDeleted();
        } else {
          router.refresh();
        }
      }
    } catch {
      setError('A apărut o eroare de rețea. Reîncearcă.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          title="Șterge raport (Admin)"
          style={{
            background: 'rgba(220, 38, 38, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          🗑️ Șterge (Admin)
        </button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          style={{
            borderColor: '#ef4444',
            color: '#ef4444',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
          }}
        >
          🗑️ Șterge raport (Admin)
        </Button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirmă ștergerea raportului (Admin)"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-ink-secondary)' }}>
            Ești sigur că vrei să ștergi acest raport din galeria publică? Vizitatorii nu îl vor mai putea accesa.
          </p>

          {error && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              disabled={isDeleting}
              fullWidth
            >
              Anulează
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleDelete}
              isLoading={isDeleting}
              fullWidth
              style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c', color: '#ffffff' }}
            >
              Șterge definitiv
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
