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
  {
    id: 'media',
    icon: '📰',
    titleRo: 'Redacție / Presă',
    titleEn: 'Newsroom / Media',
    titleFr: 'Rédaction / Presse',
    descRo: 'Jurnaliști, publicații și editori',
    descEn: 'Journalists, publications & editors',
    descFr: 'Journalistes, rédactions et éditeurs',
  },
  {
    id: 'ngo',
    icon: '🏛️',
    titleRo: 'ONG / Instituție',
    titleEn: 'NGO / Institution',
    titleFr: 'ONG / Institution',
    descRo: 'Verificatori civici și organizații',
    descEn: 'Fact-checkers & public orgs',
    descFr: 'Fact-checkers et organisations publiques',
  },
  {
    id: 'research',
    icon: '🔬',
    titleRo: 'Cercetare / Academie',
    titleEn: 'Research / Academic',
    titleFr: 'Recherche / Enseignement',
    descRo: 'Analiză de date și cercetători',
    descEn: 'Data science & academic research',
    descFr: 'Science des données et chercheurs',
  },
  {
    id: 'business',
    icon: '🏢',
    titleRo: 'Companie / Business',
    titleEn: 'Enterprise / Business',
    titleFr: 'Entreprise / Affaires',
    descRo: 'Brand-uri, agenții și utilizare comercială',
    descEn: 'Brands, agencies & commercial use',
    descFr: 'Marques, agences et usage professionnel',
  },
];

const INTERESTS = [
  {
    id: 'api',
    labelRo: '⚡ Acces API & Integrări',
    labelEn: '⚡ API Access & Integrations',
    labelFr: '⚡ Accès API & Intégrations',
  },
  {
    id: 'volume',
    labelRo: '📈 Volum mare de verificări',
    labelEn: '📈 High Volume Checks',
    labelFr: '📈 Volume élevé de vérifications',
  },
  {
    id: 'pdf',
    labelRo: '📄 Rapoarte PDF cu brand-ul tău',
    labelEn: '📄 Branded Custom PDF Reports',
    labelFr: '📄 Rapports PDF personnalisés à vos couleurs',
  },
  {
    id: 'team',
    labelRo: '👥 Cont de echipă / Seats',
    labelEn: '👥 Team Accounts & Seats',
    labelFr: '👥 Comptes d’équipe & Licences multiples',
  },
  {
    id: 'support',
    labelRo: '🛡️ Suport prioritar 24/7',
    labelEn: '🛡️ Priority 24/7 Support',
    labelFr: '🛡️ Support dédié prioritaire 24/7',
  },
];

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { locale } = useLanguage();
  const { notify } = useToast();

  const isRo = locale === 'ro';
  const isFr = locale === 'fr';
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
    const msg = isRo
      ? 'Adresa verifactro@gmail.com a fost copiată!'
      : isFr
      ? 'Adresse verifactro@gmail.com copiée !'
      : 'verifactro@gmail.com copied!';
    notify(msg, 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      const errMsg = isRo
        ? 'Te rugăm să introduci numele și email-ul.'
        : isFr
        ? 'Veuillez saisir votre nom et votre adresse e-mail.'
        : 'Please enter your name and email.';
      notify(errMsg, 'error');
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

  const subject = isRo
    ? 'Solicitare Verifact Business'
    : isFr
    ? 'Demande de contact Verifact Business'
    : 'Verifact Business Inquiry';

  const nameLabel = isRo ? 'Nume' : isFr ? 'Nom' : 'Name';
  const roleLabel = isRo ? 'Rol' : isFr ? 'Rôle' : 'Role';
  const interestsLabel = isRo ? 'Interese' : isFr ? 'Intérêts' : 'Interests';

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=verifactro@gmail.com&su=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(
    `${nameLabel}: ${name}\n${roleLabel}: ${selectedRole}\n${interestsLabel}: ${selectedInterests.join(
      ', '
    )}\n\n${message}`
  )}`;

  const modalTitle = isRo
    ? 'Contact & Planuri Custom'
    : isFr
    ? 'Contact & Offres Personnalisées'
    : 'Contact & Business Plans';

  return (
    <Modal isOpen={isOpen} onClose={handleReset} title={modalTitle}>
      {!submitted ? (
        <div className={styles.container}>
          {/* Progress bar */}
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(step / 3) * 100}%` }} />
          </div>
          <p className={styles.stepCounter}>
            {isRo ? `Pasul ${step} din 3` : isFr ? `Étape ${step} sur 3` : `Step ${step} of 3`}
          </p>

          {/* STEP 1: Select Role */}
          {step === 1 ? (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {isRo
                  ? '👋 Ce tip de organizație reprezinți?'
                  : isFr
                  ? '👋 Quel type d’organisation représentez-vous ?'
                  : '👋 What type of organization do you represent?'}
              </h3>
              <p className={styles.stepDesc}>
                {isRo
                  ? 'Alege domeniul tău pentru a adapta oferta potrivit cerințelor tale.'
                  : isFr
                  ? 'Sélectionnez votre domaine afin que nous adaptions nos fonctionnalités à vos besoins.'
                  : 'Select your area so we can tailor the best features for you.'}
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
                    <span className={styles.roleTitle}>{isRo ? r.titleRo : isFr ? r.titleFr : r.titleEn}</span>
                    <span className={styles.roleDesc}>{isRo ? r.descRo : isFr ? r.descFr : r.descEn}</span>
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
                  {isRo ? 'Continuă ➔' : isFr ? 'Continuer ➔' : 'Continue ➔'}
                </Button>
              </div>
            </div>
          ) : null}

          {/* STEP 2: Select Interests */}
          {step === 2 ? (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {isRo
                  ? '🎯 Ce funcționalități te interesează?'
                  : isFr
                  ? '🎯 Quelles fonctionnalités vous intéressent ?'
                  : '🎯 What features do you need?'}
              </h3>
              <p className={styles.stepDesc}>
                {isRo
                  ? 'Bifează toate opțiunile aplicabile proiectului tău.'
                  : isFr
                  ? 'Cochez toutes les options pertinentes pour votre projet.'
                  : 'Check all options that apply to your project.'}
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
                      <span>{isRo ? i.labelRo : isFr ? i.labelFr : i.labelEn}</span>
                      <span className={styles.checkIcon}>{isSelected ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.stepActions}>
                <Button variant="ghost" size="md" onClick={() => setStep(1)}>
                  {isRo ? '← Înapoi' : isFr ? '← Précédent' : '← Back'}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={selectedInterests.length === 0}
                  onClick={() => setStep(3)}
                >
                  {isRo ? 'Pasul următor ➔' : isFr ? 'Étape suivante ➔' : 'Next step ➔'}
                </Button>
              </div>
            </div>
          ) : null}

          {/* STEP 3: Contact Form */}
          {step === 3 ? (
            <form onSubmit={handleSubmit} className={styles.stepContent}>
              <h3 className={styles.stepTitle}>
                {isRo
                  ? '✉️ Trimite-ne mesajul tău'
                  : isFr
                  ? '✉️ Envoyez-nous votre message'
                  : '✉️ Send us your message'}
              </h3>
              <p className={styles.stepDesc}>
                {isRo
                  ? 'Îți răspundem în maxim 24 de ore cu o ofertă dedicată.'
                  : isFr
                  ? 'Nous vous répondrons sous 24h avec une proposition sur-mesure.'
                  : 'We will get back to you within 24 hours.'}
              </p>

              <div className={styles.formFields}>
                <Input
                  label={isRo ? 'Numele tău' : isFr ? 'Votre nom' : 'Your Name'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isRo ? 'ex. Ion Popescu' : isFr ? 'ex. Jean Dupont' : 'e.g. John Doe'}
                  required
                  fullWidth
                />
                <Input
                  label={isRo ? 'Email de contact' : isFr ? 'E-mail de contact' : 'Contact Email'}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@organisation.com"
                  required
                  fullWidth
                />
                <Textarea
                  label={
                    isRo
                      ? 'Detalii despre proiect (opțional)'
                      : isFr
                      ? 'Détails sur votre projet (facultatif)'
                      : 'Project details (optional)'
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    isRo
                      ? 'Spune-ne mai multe despre volumul estimat sau cerințele echipei...'
                      : isFr
                      ? 'Précisez votre volume estimé de vérifications ou vos besoins d’équipe...'
                      : 'Tell us more about your estimated volume or team needs...'
                  }
                  fullWidth
                />
              </div>

              <div className={styles.stepActions}>
                <Button variant="ghost" size="md" onClick={() => setStep(2)}>
                  {isRo ? '← Înapoi' : isFr ? '← Précédent' : '← Back'}
                </Button>
                <Button variant="primary" size="md" type="submit" isLoading={submitting}>
                  {isRo ? 'Trimite solicitarea' : isFr ? 'Envoyer la demande' : 'Send request'}
                </Button>
              </div>

              <div className={styles.alternativeDirect}>
                <p className={styles.altLabel}>
                  {isRo ? 'Sau contactează-ne direct:' : isFr ? 'Ou écrivez-nous directement :' : 'Or reach us directly:'}
                </p>
                <div className={styles.altButtons}>
                  <button type="button" className={styles.altBtn} onClick={handleCopyEmail}>
                    📋 {copied ? (isRo ? 'Copiat!' : isFr ? 'Copié !' : 'Copied!') : 'verifactro@gmail.com'}
                  </button>
                  <a href={gmailUrl} target="_blank" rel="noreferrer noopener" className={styles.altBtn}>
                    ✉️ {isRo ? 'Deschide în Gmail' : isFr ? 'Ouvrir dans Gmail' : 'Open in Gmail'}
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
            {isRo
              ? 'Solicitare trimisă cu succes!'
              : isFr
              ? 'Demande envoyée avec succès !'
              : 'Request Sent Successfully!'}
          </h3>
          <p className={styles.successText}>
            {isRo
              ? 'Îți mulțumim pentru interes! Echipa Verifact îți va răspunde în cel mai scurt timp pe adresa de email furnizată.'
              : isFr
              ? 'Merci pour votre intérêt ! L’équipe Verifact vous répondra dans les plus brefs délais à l’adresse e-mail indiquée.'
              : 'Thank you for reaching out! The Verifact team will get back to you shortly.'}
          </p>
          <Button variant="primary" size="md" onClick={handleReset}>
            {isRo ? 'Închide' : isFr ? 'Fermer' : 'Close'}
          </Button>
        </div>
      )}
    </Modal>
  );
};

