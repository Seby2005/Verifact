'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button, Input, Modal, Callout } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import shell from '../../page-shell.module.css';
import styles from './page.module.css';

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

interface UserProfile {
  id: string;
  tier: string;
  role: string;
  username: string | null;
}

function ApiKeysContent() {
  const [user, setUser] = useState<{ id: string; email: string | null } | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create Key Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // One-time key display state
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Revoke Key Modal State
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyItem | null>(null);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  // Load User & Session
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email ?? null });
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession?.user) {
        setUser({ id: newSession.user.id, email: newSession.user.email ?? null });
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch profile
      const profileRes = await fetch('/api/user/profile');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile ?? null);

        // If business or admin, fetch keys
        const isBusinessOrAdmin =
          profileData.profile?.tier === 'business' || profileData.profile?.role === 'admin';

        if (isBusinessOrAdmin) {
          const keysRes = await fetch('/api/user/keys');
          if (keysRes.ok) {
            const keysData = await keysRes.json();
            setKeys(keysData.keys || []);
          }
        }
      }
    } catch {
      setError('A apărut o eroare la încărcarea datelor.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/user/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() || 'Default Key' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la crearea cheii API');
      }

      setCreatedRawKey(data.apiKey.rawKey);
      setIsCreateOpen(false);
      setNewKeyName('');
      await fetchData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Eroare necunoscută');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;
    setIsRevoking(true);

    try {
      const res = await fetch(`/api/user/keys/${keyToRevoke.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Eroare la revocarea cheii');
      }

      setKeyToRevoke(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la revocarea cheii');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopyRawKey = () => {
    if (!createdRawKey) return;
    navigator.clipboard.writeText(createdRawKey);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Loading skeleton
  if (user === undefined || isLoading) {
    return (
      <div className={`container ${shell.page}`}>
        <header className={shell.head}>
          <p className="eyebrow">Verifact API</p>
          <h1 className={shell.title}>Chei API & Acces Programatic</h1>
          <p className={shell.lead}>Se încarcă datele de autentificare...</p>
        </header>
        <div className={shell.body}>
          <div
            style={{
              height: '280px',
              background: 'var(--color-surface)',
              border: 'var(--border-width-hairline) solid var(--color-line)',
              borderRadius: 'var(--radius-lg)',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
        </div>
      </div>
    );
  }

  // Unauthenticated
  if (!user) {
    return (
      <div className={`container ${shell.page}`}>
        <header className={shell.head}>
          <p className="eyebrow">Verifact API</p>
          <h1 className={shell.title}>Chei API & Acces Programatic</h1>
          <p className={shell.lead}>
            Autentifică-te pentru a gestiona cheile API și integrarea automată.
          </p>
        </header>
        <div className={shell.body}>
          <div className={styles.tierGateCard}>
            <h2 className={styles.tierGateTitle}>Autentificare Necesară</h2>
            <p className={styles.tierGateLead}>
              Pentru a accesa și configura cheile API Verifact, te rugăm să te autentifici în contul tău.
            </p>
            <div className={styles.tierGateActions}>
              <Link href="/cont">
                <Button type="button" variant="primary" size="md">
                  Mergi la Autentificare
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isBusinessOrAdmin = profile?.tier === 'business' || profile?.role === 'admin';

  // Tier Gate for Free / Pro
  if (!isBusinessOrAdmin) {
    return (
      <div className={`container ${shell.page}`}>
        <div className={styles.container}>
          <Link href="/cont" className={styles.backLink}>
            ← Înapoi la Contul Meu
          </Link>
        </div>

        <header className={shell.head}>
          <p className="eyebrow">Verifact API v1</p>
          <h1 className={shell.title}>Acces Programatic & Chei API</h1>
          <p className={shell.lead}>
            Integrează verificarea automată a știrilor direct în aplicațiile și fluxurile tale editoriale.
          </p>
        </header>

        <div className={shell.body}>
          <div className={styles.tierGateCard}>
            <span className={styles.tierGateBadge}>Exclusiv Plan Business</span>
            <h2 className={styles.tierGateTitle}>Deblochează Accesul la Verifact API</h2>
            <p className={styles.tierGateLead}>
              Generarea cheilor API și accesul direct la endpoint-ul <code>POST /api/v1/verify</code> sunt
              rezervate partenerilor și abonaților din planul <strong>Business</strong>.
            </p>

            <ul className={styles.tierGateFeatures}>
              <li className={styles.tierGateFeatureItem}>
                <span className={styles.tierGateFeatureIcon}>✓</span>
                <span><strong>1.000 verificări factuale pe lună</strong> incluse</span>
              </li>
              <li className={styles.tierGateFeatureItem}>
                <span className={styles.tierGateFeatureIcon}>✓</span>
                <span><strong>Chei API securizate</strong> (format <code>vf_live_...</code>)</span>
              </li>
              <li className={styles.tierGateFeatureItem}>
                <span className={styles.tierGateFeatureIcon}>✓</span>
                <span>Răspunsuri unice JSON structurate cu scor și surse citate</span>
              </li>
              <li className={styles.tierGateFeatureItem}>
                <span className={styles.tierGateFeatureIcon}>✓</span>
                <span>Suport tehnic dedicat și SLA prioritar</span>
              </li>
            </ul>

            <div className={styles.tierGateActions}>
              <Link href="/preturi">
                <Button type="button" variant="primary" size="md">
                  Vezi Planul Business
                </Button>
              </Link>
              <a href="mailto:contact@verifact.ro?subject=Solicitare%20Acces%20API%20Business">
                <Button type="button" variant="secondary" size="md">
                  Contactează Echipa
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Business / Admin Dashboard
  return (
    <div className={`container ${shell.page}`}>
      <div className={styles.container}>
        <Link href="/cont" className={styles.backLink}>
          ← Înapoi la Contul Meu
        </Link>

        <header className={shell.head}>
          <p className="eyebrow">Verifact API v1</p>
          <h1 className={shell.title}>Chei API & Acces Programatic</h1>
          <p className={shell.lead}>
            Gestionează cheile de autentificare pentru integrarea automată a verificărilor în sistemele tale.
          </p>
        </header>

        <div className={shell.body}>
          {error && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Callout label="Eroare" tone="plain">
                {error}
              </Callout>
            </div>
          )}

          {/* One-time created key banner */}
          {createdRawKey && (
            <div style={{ marginBottom: 'var(--space-8)' }}>
              <Callout label="Cheie API generată cu succes!" tone="plain">
                <div className={styles.rawKeyContainer}>
                  <p style={{ margin: '0 0 var(--space-2) 0', fontWeight: 600 }}>
                    ⚠️ Atenție: Copiază această cheie acum. Din motive de securitate, nu o vei mai putea vedea niciodată!
                  </p>
                  <div className={styles.keyDisplayBox}>
                    <code className={styles.rawKeyText}>{createdRawKey}</code>
                    <Button type="button" variant="primary" size="sm" onClick={handleCopyRawKey}>
                      {hasCopied ? 'Copiat!' : 'Copiază Cheia'}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreatedRawKey(null)}
                    style={{ marginTop: 'var(--space-2)' }}
                  >
                    Am salvat cheia în siguranță (Închide)
                  </Button>
                </div>
              </Callout>
            </div>
          )}

          {/* Header & Create Button */}
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Cheile Tale Active</h2>
              <p className={styles.sectionLead}>
                Folosește aceste chei în antetul HTTP <code>Authorization: Bearer vf_live_...</code>
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setCreateError(null);
                setIsCreateOpen(true);
              }}
            >
              + Generează Cheie Nouă
            </Button>
          </div>

          {/* Keys Table Card */}
          <div className={styles.keysCard}>
            {keys.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🔑</div>
                <h3 className={styles.emptyTitle}>Nu ai nicio cheie API creată</h3>
                <p className={styles.emptyText}>
                  Apasă pe butonul de mai sus pentru a genera prima ta cheie API Business.
                </p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nume</th>
                      <th>Prefix Cheie</th>
                      <th>Creată la</th>
                      <th>Ultima Utilizare</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => {
                      const isRevoked = Boolean(key.revokedAt);
                      return (
                        <tr key={key.id}>
                          <td>
                            <strong>{key.name}</strong>
                          </td>
                          <td>
                            <code className={styles.keyPrefix}>{key.keyPrefix}••••••••</code>
                          </td>
                          <td>{new Date(key.createdAt).toLocaleDateString('ro-RO')}</td>
                          <td>
                            {key.lastUsedAt
                              ? new Date(key.lastUsedAt).toLocaleDateString('ro-RO')
                              : 'Niciodată'}
                          </td>
                          <td>
                            {isRevoked ? (
                              <span className={styles.badgeRevoked}>Revocată</span>
                            ) : (
                              <span className={styles.badgeActive}>Activă</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {!isRevoked && (
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => setKeyToRevoke(key)}
                              >
                                Revocă
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Integration Guide */}
          <section className={styles.docsSection}>
            <h3 className={styles.docsTitle}>Ghid Rapid de Integrare (API v1)</h3>
            <p className={styles.docsLead}>
              Efectuează un request HTTP <code>POST</code> la <code>/api/v1/verify</code> trimițând cheia ta ca Bearer token.
            </p>

            <div className={styles.codeBlockWrap}>
              <pre style={{ margin: 0 }}>
{`curl -X POST https://verifact.ro/api/v1/verify \\
  -H "Authorization: Bearer vf_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Textul sau știrea pe care dorești să o verifici...",
    "inputType": "text",
    "language": "ro"
  }'`}
              </pre>
            </div>

            <h4 style={{ fontSize: 'var(--font-size-base)', margin: 'var(--space-4) 0 var(--space-2)' }}>
              Coduri de Răspuns HTTP:
            </h4>
            <table className={styles.docsTable}>
              <thead>
                <tr>
                  <th>Cod HTTP</th>
                  <th>Eroare (code)</th>
                  <th>Descriere</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>200 OK</code></td>
                  <td>-</td>
                  <td>Verificare finalizată cu succes. Conține raportul detaliat și cota rămasă.</td>
                </tr>
                <tr>
                  <td><code>400 Bad Request</code></td>
                  <td><code>INPUT_INVALID</code></td>
                  <td>Text lipsă, prea scurt sau URL invalid.</td>
                </tr>
                <tr>
                  <td><code>401 Unauthorized</code></td>
                  <td><code>AUTH_INVALID</code></td>
                  <td>Cheie API invalidă, expirată sau revocată.</td>
                </tr>
                <tr>
                  <td><code>403 Forbidden</code></td>
                  <td><code>USAGE_LIMIT</code> / <code>FORBIDDEN</code></td>
                  <td>Cota lunară a fost atinsă sau contul nu este de nivel Business.</td>
                </tr>
                <tr>
                  <td><code>429 Too Many Requests</code></td>
                  <td><code>RATE_LIMIT</code></td>
                  <td>Rată de apeluri prea mare (throttling per IP/cheie).</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        {/* Modal: Create Key */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Generează o nouă Cheie API"
        >
          <form onSubmit={handleCreateKey}>
            <p className={styles.modalLead}>
              Dă un nume descriptiv cheii tale pentru a identifica mediul sau aplicația care o folosește
              (ex: <em>Producție Bot</em>, <em>Site Staging</em>).
            </p>

            <Input
              label="Nume Cheie API"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="ex: Server Producție"
              required
              fullWidth
              autoFocus
            />

            {createError && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <Callout label="Eroare" tone="plain">
                  {createError}
                </Callout>
              </div>
            )}

            <div className={styles.modalActions}>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setIsCreateOpen(false)}
              >
                Anulează
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isCreating}
              >
                Creează Cheia
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Revoke Key Confirmation */}
        <Modal
          isOpen={Boolean(keyToRevoke)}
          onClose={() => setKeyToRevoke(null)}
          title="Confirmare Revocare Cheie API"
        >
          <p className={styles.modalLead}>
            Ești sigur că vrei să revoci cheia <strong>{keyToRevoke?.name}</strong> (
            <code>{keyToRevoke?.keyPrefix}••••••••</code>)?
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: '#dc2626' }}>
            Această acțiune este ireversibilă. Orice aplicație sau script care folosește această cheie nu va mai putea efectua verificări.
          </p>

          <div className={styles.modalActions}>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setKeyToRevoke(null)}
            >
              Păstrează Cheia
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              isLoading={isRevoking}
              onClick={handleRevokeKey}
            >
              Revocă Cheia Imediat
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  return (
    <Suspense fallback={null}>
      <ApiKeysContent />
    </Suspense>
  );
}
