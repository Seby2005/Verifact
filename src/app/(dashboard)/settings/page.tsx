'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import styles from './Settings.module.css';

export default function SettingsPage() {
  const { user, refreshProfile, signOut } = useAuth();
  const supabase = createBrowserClient();

  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      if (username !== user?.username) {
        const res = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Eroare la salvarea numelui de utilizator');
        }
        await refreshProfile();
      }

      if (newPassword) {
        if (newPassword.length < 8) {
          throw new Error('Parola nouă trebuie să aibă minim 8 caractere');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('Parolele noi nu se potrivesc');
        }

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
      }

      setStatusMessage({ type: 'success', text: 'Setările au fost salvate cu succes!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la salvarea setărilor';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      if (user?.id) {
        await supabase.from('verifications').delete().eq('user_id', user.id);
        await supabase.from('profiles').delete().eq('id', user.id);
      }
      await signOut();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nu am putut șterge contul';
      setStatusMessage({ type: 'error', text: msg });
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Setări cont</h1>
        <p className={styles.subtitle}>Gestionează profilul, securitatea și preferințele contului tău.</p>
      </header>

      {statusMessage && (
        <div
          className={`${styles.noticeAlert} ${
            statusMessage.type === 'success' ? styles.successAlert : styles.errorAlert
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* PROFIL SECTION */}
      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Profil & Securitate</h2>
        <form onSubmit={handleSaveProfile}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="email-display">
              Email (needitabil)
            </label>
            <input
              id="email-display"
              type="text"
              className={styles.input}
              value={user?.email || ''}
              disabled
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="username-input">
              Nume utilizator (username)
            </label>
            <input
              id="username-input"
              type="text"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: ioan_popescu"
            />
            <p className={styles.helpText}>Numele de utilizator este vizibil pe rapoartele tale publice.</p>
          </div>

          <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--color-gray-100)' }} />

          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Schimbare parolă</h3>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="current-pass">
              Parola curentă
            </label>
            <input
              id="current-pass"
              type="password"
              className={styles.input}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="new-pass">
              Parolă nouă
            </label>
            <input
              id="new-pass"
              type="password"
              className={styles.input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="confirm-pass">
              Confirmă parola nouă
            </label>
            <input
              id="confirm-pass"
              type="password"
              className={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className={styles.saveBtn} disabled={isSaving}>
            {isSaving ? 'Se salvează...' : 'Salvează modificările'}
          </button>
        </form>
      </section>

      {/* CONT & ABONAMENT SECTION */}
      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Abonament & Danger Zone</h2>

        <div className={styles.tierInfo}>
          <div>
            <div style={{ fontWeight: 600 }}>Plan curent</div>
            <div className={styles.helpText}>Limita ta se resetează lunar</div>
          </div>
          <span className={styles.tierBadge}>{user?.tier || 'free'}</span>
        </div>

        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#DC2626', marginBottom: '8px' }}>
            Ștergere cont
          </h3>
          <p className={styles.helpText} style={{ marginBottom: '16px' }}>
            După ștergerea contului, toate datele și istoricul verificărilor vor fi eliminate definitiv.
          </p>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => setShowDeleteModal(true)}
          >
            Șterge contul definitiv
          </button>
        </div>
      </section>

      {/* NOTIFICĂRI PLACEHOLDER */}
      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Notificări (În curând)</h2>
        <p className={styles.helpText}>Setările pentru notificări prin email și webhook-uri vor fi disponibile în versiunea v2.</p>
      </section>

      {/* MODAL ȘTERGERE CONT */}
      {showDeleteModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Ești absolut sigur?</h3>
            <p className={styles.modalText}>
              Această acțiune nu poate fi anulată. Contul tău, datele de profil și tot istoricul verificărilor vor fi șterse definitiv din sistem.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Renunță
              </button>
              <button
                type="button"
                className={styles.confirmDeleteBtn}
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? 'Se șterge...' : 'Da, șterge contul'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
