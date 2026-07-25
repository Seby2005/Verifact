'use client';

import React, { useState } from 'react';
import { Button, Input, Card, Badge, Modal } from '@/components/ui';
import styles from './page.module.css';

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>AI Fact-Checker</h1>
          <p className={styles.subtitle}>
            Sprint 0 — Design System & Componente Primitive UI
          </p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Variante Verdict Badges</h2>
          <div className={styles.row}>
            <Badge variant="true">ADEVĂRAT (85-100%)</Badge>
            <Badge variant="partial">PARȚIAL ADEVĂRAT (60-84%)</Badge>
            <Badge variant="unclear">NECLAR (40-59%)</Badge>
            <Badge variant="false">PROBABIL FALS (0-39%)</Badge>
            <Badge variant="trust">SURSĂ VERIFICATĂ</Badge>
            <Badge variant="primary" icon={false}>INFO PRO</Badge>
            <Badge variant="secondary" icon={false}>DRAFT</Badge>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Variante Butoane (Button)</h2>
          <div className={styles.row}>
            <Button variant="primary">Buton Principal</Button>
            <Button variant="secondary">Buton Secundar</Button>
            <Button variant="danger">Șterge Raport</Button>
            <Button variant="outline">Contur Albastru</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="primary" isLoading>
              Se încarcă...
            </Button>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Câmpuri de Input (Input)</h2>
          <div className={styles.grid}>
            <Input
              label="Text / Afirmație de verificat"
              placeholder="Introduceți o afirmație..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helperText="Tastați cel puțin 10 caractere"
              fullWidth
            />
            <Input
              label="Câmp cu Eroare de Validare"
              placeholder="Exemplu eroare"
              error="Acest câmp este obligatoriu!"
              fullWidth
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Carduri (Card) & Modal Interactive</h2>
          <div className={styles.grid}>
            <Card variant="default" padding="md">
              <h3 className={styles.cardTitle}>Card Standard (Shadow + Border)</h3>
              <p className={styles.cardText}>
                Acest card este folosit pentru afișarea raportului și a containerelor principale.
              </p>
              <div style={{ marginTop: '1rem' }}>
                <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
                  Deschide Modal Demo
                </Button>
              </div>
            </Card>

            <Card variant="bordered" padding="md">
              <h3 className={styles.cardTitle}>Card BORDURED</h3>
              <p className={styles.cardText}>
                Varianta cu contur fin, utilă pentru elemente din feed sau liste secundare.
              </p>
            </Card>
          </div>
        </section>

        {/* Modal Demo */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Modal Demo — Componentă Primitivă UI"
        >
          <p style={{ marginBottom: '1rem', color: 'var(--color-gray-600)' }}>
            Această componentă modală acceptă orice conținut, suportă închidere la tasta ESC, dând click pe fundal sau pe butonul &times;.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Anulează
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Am înțeles
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
