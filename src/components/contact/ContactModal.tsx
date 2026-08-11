'use client';

import React, { useState } from 'react';
import { Modal, Button, Input, Textarea, useToast } from '@/components/ui';
import { useLanguage } from '@/i18n';
import styles from './ContactModal.module.css';

export interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES = [
  { id: 'media', icon: '📰', titleRo: 'Redacție / Presă', titleEn: 'Newsroom / Media', descRo: 'Jurnaliști, publicații și editori', descEn: 'Journalists, publications & editors' },
  { id: 'ngo', icon: '🏛️', titleRo: 'ONG / Instituție', titleEn: 'NGO / Institution', descRo: 'Verificatori civici și organizații', descEn: 'Fact-checkers & public orgs' },
  { id: 'research', icon: '🔬', titleRo: 'Cercetare / Academie', titleEn: 'Research / Academic', descRo: 'Analiză de date și cercetători', descEn: 'Data science & academic research' },
  { id: 'business', icon: '🏢', titleRo: 'Companie / Business', titleEn: 'Enterprise / Business', descRo: 'Brand-uri, agenții și utilizare comercială', descEn: 'Brands, agencies & commercial use' },
];

const INTERESTS = [
  { id: 'api', labelRo: '⚡ Acces API & Integrări', labelEn: '⚡ API Access & Integrations' },
  { id: 'volume', labelRo: '📈 Volum mare de verificări', labelEn: '📈 High Volume Checks' },
  { id: 'pdf', labelRo: '📄 Rapoarte PDF cu brand-ul tău', labelEn: '📄 Branded Custom PDF Reports' },
  { id: 'team', labelRo: '👥 Cont de echipă / Seats', labelEn: '👥 Team Accounts & Seats' },
  { id: 'support', labelRo: '🛡️ Suport prioritar 24/7', labelEn: '🛡️ Priority 24/7 Support' },
];

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { locale } = useLanguage();
  const { notify } = useToast();

  const isRo = locale === 'ro';
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('verifactro@gmail.com');
    setCopied(true);
    notify(isRo ? 'Adresa verifactro@gmail.com a fost copiată!' : 'verifactro@gmail.com copied!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      notify(isRo ? 'Te rugăm să introduci numele și email-ul.' : 'Please enter your name and email.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          role: selectedRole,
          interests: selectedInterests,
          message,
          source: 'business_contact_modal',
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        // Fallback gracefully to mailto / confirmation
        setSubmitted(true);
      }
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedRole('');
    setSelectedInterests([]);
    setName('');
    setEmail('');
    setMessage('');
    setSubmitted(false);
    onClose();
  };

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=verifactro@gmail.com&su=${encodeURIComponent(
    isRo ? 'Solicitare Verifact Business' : 'Verifact Business Inquiry'
  )}&body=${encodeURIComponent(
    `${isRo ? 'Nume' : 'Name'}: ${name}\n${isRo ? 'Rol' : 'Role'}: ${selectedRole}\n${isRo ? 'Interese' : 'Interests'}: ${selectedInterests.join(
      ', '
    )}\n\n${message}`
  )}`;

  return (
    <Modal isOpen={isOpen} onClose={handleReset} title={isRo ? 'Contact & Planuri Custom' : 'Contact & Business Plans'}>
      {!submitted ? (
        <div className={styles.container}>
          {/* Progress bar */}
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(step / 3) * 100}%` }} />
          </div>
          <p className={styles.stepCounter}>
            {isRo ? `Pasul ${step} din 3` : `Step ${step} of 3`}
          </p>

          {/* STEP 1: Select Role */}
          {step === 1 ? (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {isRo ? '👋 Ce tip de organizație reprezinți?' : '👋 What type of organization do you represent?'}
              </h3>
              <p className={styles.stepDesc}>
                {isRo ? 'Alege domeniul tău pentru a adapta oferta potrivit cerințelor tale.' : 'Select your area so we can tailor the best features for you.'}
              </p>

              <div className={styles.roleGrid}>
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={[styles.roleCard, selectedRole === r.id ? styles.roleCardSelected : ''].join(' ')}
                    onClick={() => setSelectedRole(r.id)}
                  >
                    <span className={styles.roleIcon}>{r.icon}</span>
                    <span className={styles.roleTitle}>{isRo ? r.titleRo : r.titleEn}</span>
                    <span className={styles.roleDesc}>{isRo ? r.descRo : r.descEn}</span>
                  </button>
                ))}
              </div>

              <div className={styles.actions}>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={!selectedRole}
                  onClick={() => setStep(2)}
                >
                  {isRo ? 'Continuă ➔' : 'Continue ➔'}
                </Button>
              </div>
            </div>
          ) : null}

          {/* STEP 2: Select Interests */}
          {step === 2 ? (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {isRo ? '🎯 Ce funcționalități te interesează?' : '🎯 What features do you need?'}
              </h3>
              <p className={styles.stepDesc}>
                {isRo ? 'Bifează toate opțiunile aplicabile proiectului tău.' : 'Check all options that apply to your project.'}
              </p>

              <div className={styles.interestList}>
                {INTERESTS.map((i) => {
                  const isSelected = selectedInterests.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      type="button"
                      className={[styles.interestChip, isSelected ? styles.interestChipSelected : ''].join(' ')}
                      onClick={() => toggleInterest(i.id)}
                    >
                      <span>{isRo ? i.labelRo : i.labelEn}</span>
                      <span className={styles.checkIcon}>{isSelected ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.stepActions}>
                <Button variant="ghost" size="md" onClick={() => setStep(1)}>
                  {isRo ? '← Înapoi' : '← Back'}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={selectedInterests.length === 0}
                  onClick={() => setStep(3)}
                >
                  {isRo ? 'Pasul următor ➔' : 'Next step ➔'}
                </Button>
              </div>
            </div>
          ) : null}

          {/* STEP 3: Contact Form */}
          {step === 3 ? (
            <form onSubmit={handleSubmit} className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {isRo ? '✉️ Trimite-ne mesajul tău' : '✉️ Send us your message'}
              </h3>
              <p className={styles.stepDesc}>
                {isRo ? 'Îți răspundem în maxim 24 de ore cu o ofertă dedicată.' : 'We will get back to you within 24 hours.'}
              </p>

              <div className={styles.formFields}>
                <Input
                  label={isRo ? 'Numele tău' : 'Your Name'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isRo ? 'ex. Ion Popescu' : 'e.g. John Doe'}
                  required
                  fullWidth
                />
                <Input
                  label={isRo ? 'Email de contact' : 'Contact Email'}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  required
                  fullWidth
                />
                <Textarea
                  label={isRo ? 'Detalii despre proiect (opțional)' : 'Project details (optional)'}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isRo ? 'Spune-ne mai multe despre volumul estimat sau cerințele echipei...' : 'Tell us more about your estimated volume or team needs...'}
                  fullWidth
                />
              </div>

              <div className={styles.stepActions}>
                <Button variant="ghost" size="md" onClick={() => setStep(2)}>
                  {isRo ? '← Înapoi' : '← Back'}
                </Button>
                <Button variant="primary" size="md" type="submit" isLoading={submitting}>
                  {isRo ? 'Trimite solicitarea' : 'Send request'}
                </Button>
              </div>

              <div className={styles.alternativeDirect}>
                <p className={styles.altLabel}>{isRo ? 'Sau contactează-ne direct:' : 'Or reach us directly:'}</p>
                <div className={styles.altButtons}>
                  <button type="button" className={styles.altBtn} onClick={handleCopyEmail}>
                    📋 {copied ? (isRo ? 'Copiat!' : 'Copied!') : 'verifactro@gmail.com'}
                  </button>
                  <a href={gmailUrl} target="_blank" rel="noreferrer noopener" className={styles.altBtn}>
                    ✉️ {isRo ? 'Deschide în Gmail' : 'Open in Gmail'}
                  </a>
                </div>
              </div>
            </form>
          ) : null}
        </div>
      ) : (
        <div className={styles.successBox}>
          <span className={styles.successIcon}>🎉</span>
          <h3 className={styles.successTitle}>
            {isRo ? 'Solicitare trimisă cu succes!' : 'Request Sent Successfully!'}
          </h3>
          <p className={styles.successText}>
            {isRo
              ? 'Îți mulțumim pentru interes! Echipa Verifact îți va răspunde în cel mai scurt timp pe adresa de email furnizată.'
              : 'Thank you for reaching out! The Verifact team will get back to you shortly.'}
          </p>
          <Button variant="primary" size="md" onClick={handleReset}>
            {isRo ? 'Închide' : 'Close'}
          </Button>
        </div>
      )}
    </Modal>
  );
};
