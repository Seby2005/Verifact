'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Card,
  Badge,
  Modal,
  ToastProvider,
  useToast,
  Skeleton,
  EmptyState,
  Tabs,
  ProgressBar,
  Select,
  Tooltip,
  Avatar,
} from '@/components/ui';
import { APP_NAME } from '@/config/branding';
import { Search, Trash2, ArrowRight, Sun, Moon } from 'lucide-react';
import styles from './page.module.css';

function CatalogContent() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('text');
  const [selectValue, setSelectValue] = useState('ro');
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Design System Showcase & Catalog — {APP_NAME}</h1>
          <p className={styles.subtitle}>
            Inspecție vizuală pentru toate cele 13 componente primitive UI, variantele și stările lor.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={toggleTheme}
          leftIcon={theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        >
          {theme === 'light' ? 'Mod Întunecat' : 'Mod Luminos'}
        </Button>
      </header>

      {/* 1. Button */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Button</h2>
        <div className={styles.grid}>
          <div>
            <h3>Variante</h3>
            <div className={styles.row}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger" leftIcon={<Trash2 size={16} />}>Danger</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>

          <div>
            <h3>Dimensiuni</h3>
            <div className={styles.row}>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>

          <div>
            <h3>Stări: Loading, Disabled & Tooltip</h3>
            <div className={styles.row}>
              <Button isLoading>Se încarcă</Button>
              <Button disabled>Dezactivat</Button>
              <Button disabled tooltipWhenDisabled="Necesită abonament Pro">
                Pro Feature
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Input & Textarea */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Input & Textarea</h2>
        <div className={styles.grid2}>
          <div className={styles.stack}>
            <Input
              label="Câmp Căutare (cu Icon Stânga)"
              placeholder="Caută în rapoarte..."
              leftIcon={<Search size={18} />}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />

            <Input
              label="Câmp cu Eroare & Descriere"
              placeholder="Introdu o adresă URL"
              error="Format URL nevalid (trebuie să înceapă cu https://)"
              value="invalid-url"
              onChange={() => {}}
            />
          </div>

          <div className={styles.stack}>
            <Textarea
              label="Text de verificat (cu Contor Caractere)"
              placeholder="Lipește afirmația..."
              value={textareaValue}
              onChange={(e) => setTextareaValue(e.target.value)}
              characterCount={{ current: textareaValue.length, max: 2000 }}
              helperText="Minim 10 caractere necesare pentru analiză."
            />
          </div>
        </div>
      </section>

      {/* 3. Card */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Card</h2>
        <div className={styles.grid3}>
          <Card variant="default">
            <h3>Card Default (Shadow)</h3>
            <p>Afișează umbră subtilă și border de container standard.</p>
          </Card>
          <Card variant="flat">
            <h3>Card Flat</h3>
            <p>Container doar cu border, fără umbră de fundal.</p>
          </Card>
          <Card variant="interactive">
            <h3>Card Interactiv</h3>
            <p>Efect de hover lift și umbră extinsă pentru feed-uri clickabile.</p>
          </Card>
        </div>
      </section>

      {/* 4. Badge */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Badge (Verdicte Fact-Checking)</h2>
        <div className={styles.row}>
          <Badge variant="true" size="sm" />
          <Badge variant="partial" size="sm" />
          <Badge variant="unclear" size="sm" />
          <Badge variant="false" size="sm" />
          <Badge variant="neutral" size="sm">Tier Free</Badge>
        </div>
        <div className={styles.row} style={{ marginTop: '1rem' }}>
          <Badge variant="true" size="lg" />
          <Badge variant="partial" size="lg" />
          <Badge variant="unclear" size="lg" />
          <Badge variant="false" size="lg" />
        </div>
      </section>

      {/* 5. Modal & Toast */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Modal & Toast Notifications</h2>
        <div className={styles.row}>
          <Button onClick={() => setIsModalOpen(true)}>Deschide Modal Accesibil</Button>

          <Button
            variant="secondary"
            onClick={() =>
              toast({
                type: 'success',
                title: 'Verificare finalizată',
                message: 'Raportul a fost generat cu succes.',
              })
            }
          >
            Toast Succes
          </Button>

          <Button
            variant="danger"
            onClick={() =>
              toast({
                type: 'error',
                title: 'Eroare la verificare',
                message: 'A apărut o eroare de rețea. Te rugăm să reîncerci.',
              })
            }
          >
            Toast Eroare (Persistent)
          </Button>
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Verificare Raport Incongruent"
        >
          <p>
            Acest dialog folosește React Portal, Focus Trap din tastatură, închidere pe Escape și
            restaurarea focusului la închidere.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Anulează
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Confirmă</Button>
          </div>
        </Modal>
      </section>

      {/* 6. Skeleton & EmptyState */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. Skeleton & EmptyState</h2>
        <div className={styles.grid2}>
          <div>
            <h3>Skeleton Shimmer</h3>
            <div className={styles.stack} style={{ marginTop: '0.5rem' }}>
              <Skeleton variant="circle" />
              <Skeleton variant="text" lines={3} />
              <Skeleton variant="card" height={100} />
            </div>
          </div>
          <div>
            <h3>EmptyState Fallback</h3>
            <EmptyState
              title="Nicio verificare găsită"
              description="Nu ai efectuat nicio verificare recentă. Introdu un text sau un screenshot pentru a începe."
              actionButton={<Button rightIcon={<ArrowRight size={16} />}>Începe prima verificare</Button>}
            />
          </div>
        </div>
      </section>

      {/* 7. Tabs, ProgressBar, Select, Tooltip, Avatar */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. Tabs, ProgressBar, Select, Tooltip & Avatar</h2>

        <div className={styles.stack}>
          <h3>Tabs Formular (Săgeți Tastatură)</h3>
          <Tabs
            activeTabId={activeTab}
            onChange={setActiveTab}
            items={[
              { id: 'screenshot', label: 'Upload Screenshot', content: <p>Formular upload imagine.</p> },
              { id: 'text', label: 'Text Direct', content: <p>Textarea introducere afirmație.</p> },
              { id: 'url', label: 'URL Articol', content: <p>Input link articol știre.</p> },
            ]}
          />
        </div>

        <div className={styles.grid2} style={{ marginTop: '2rem' }}>
          <div>
            <h3>ProgressBar (Circular & Liniar)</h3>
            <div className={styles.row} style={{ alignItems: 'center', marginTop: '1rem' }}>
              <ProgressBar variant="circular" value={92} size={100} label="Adevărat" />
              <ProgressBar variant="circular" value={72} size={100} label="Parțial" />
              <ProgressBar variant="circular" value={45} size={100} label="Neclar" />
              <ProgressBar variant="circular" value={22} size={100} label="Fals" />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <ProgressBar variant="linear" value={85} label="Încredere algoritm" />
            </div>
          </div>

          <div className={styles.stack}>
            <h3>Select & Tooltip & Avatar</h3>
            <Select
              label="Selectează Limba"
              value={selectValue}
              onChange={setSelectValue}
              options={[
                { value: 'ro', label: 'Română (RO)' },
                { value: 'en', label: 'English (EN)' },
              ]}
            />

            <div className={styles.row} style={{ alignItems: 'center', marginTop: '1rem' }}>
              <Tooltip content="Utilizator verificat cu abonament Pro">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <Avatar name="Ion Popescu" size="md" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ion Popescu</span>
                </div>
              </Tooltip>

              <Avatar name="alexandra.david@example.com" size="lg" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <ToastProvider>
      <CatalogContent />
    </ToastProvider>
  );
}
