'use client';

import React, { useState, useEffect } from 'react';
import { Button, Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { ContactModal } from '@/components/contact/ContactModal';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

const BUSINESS_EMAIL = 'verifactro@gmail.com';

type Billing = 'monthly' | 'yearly';

/** A cell in the comparison table is either a short value or an included flag. */
type Cell = string | boolean;

function CellMark({ value, included, excluded }: { value: Cell; included: string; excluded: string }) {
  if (typeof value === 'string') {
    return <span className={styles.cellValue}>{value}</span>;
  }
  if (value) {
    return (
      <span className={styles.markYes}>
        <svg viewBox="0 0 20 20" className={styles.markIcon} aria-hidden="true">
          <path
            d="M4 10.5 8 14.5 16 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.srOnly}>{included}</span>
      </span>
    );
  }
  return (
    <span className={styles.markNo}>
      <svg viewBox="0 0 20 20" className={styles.markIcon} aria-hidden="true">
        <path
          d="M6 6 14 14 M14 6 6 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.srOnly}>{excluded}</span>
    </span>
  );
}

export default function PreturiPage() {
  const { locale } = useLanguage();
  const isEn = locale === 'en';
  const [billing, setBilling] = useState<Billing>('yearly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout') === 'success') {
        setCheckoutSuccess(true);
      }
    }
  }, []);

  const handleProCheckout = async () => {
    setIsSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/checkout/creem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.status === 401) {
        window.location.href = '/cont';
        return;
      }

      if (!res.ok || !data.checkoutUrl) {
        setCheckoutError(
          data.error || (isEn ? 'Failed to initiate checkout session.' : 'Nu am putut iniția sesiunea de plată.')
        );
        setIsSubmitting(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      const errMsg = isEn
        ? 'A network error occurred.'
        : locale === 'fr'
        ? 'Une erreur réseau est survenue. Veuillez réessayer.'
        : 'A apărut o eroare de rețea. Te rugăm să reîncerci.';
      setCheckoutError(errMsg);
      setIsSubmitting(false);
    }
  };

  const c =
    locale === 'fr'
      ? {
          eyebrow: 'Tarifs',
          title: 'Gratuit au quotidien. Accessible pour les usages intensifs.',
          billing: { monthly: 'Mensuel', yearly: 'Annuel', save: 'Économisez 25%', aria: 'Période de facturation' },
          recommended: 'Recommandé',
          perMonth: '/mois',
          billedYearly: 'facturé 35,90 € par an',
          successTitle: 'Abonnement activé !',
          successMsg: 'Votre abonnement Pro est actif ! Vous bénéficiez de toutes les fonctionnalités avancées.',
          free: {
            name: 'Gratuit',
            price: 'Gratuit',
            tagline: 'Pour vérifier facilement les publications de votre fil d’actualité.',
            checks: '3 vérifications par mois',
            features: [
              '3 vérifications complètes par mois (texte, capture OCR, URL)',
              'Verdict, score de fiabilité 0–100 et classement',
              'Sources citées publiques et contexte explicatif',
              'Carte visuelle de verdict à partager (réseaux & messageries)',
              'Historique personnel et favoris enregistrés',
            ],
            cta: 'Commencer gratuitement',
          },
          pro: {
            name: 'Pro',
            priceMonthly: '3,99 €',
            priceYearly: '2,99 €',
            tagline: 'Pour journalistes, chercheurs et utilisateurs quotidiens.',
            checks: 'Plus de 10× plus de vérifications (50+ / mois)',
            features: [
              '50+ vérifications par mois (priorité haute)',
              'AI Report Deep-Dive : Assistant interactif Q&R sur le rapport',
              'Téléchargement du rapport complet en PDF imprimable',
              'Lien direct avec surlignage sur la phrase citée',
              'Support prioritaire par e-mail',
            ],
            cta: isSubmitting ? 'Connexion à Creem...' : 'Choisir Pro',
          },
          business: {
            name: 'Business',
            price: 'Sur devis',
            tagline: 'Pour rédactions, ONG et équipes professionnelles.',
            checks: 'Volume sur-mesure ou illimité',
            features: [
              'Volume élevé ou illimité de vérifications',
              'Dossier Pro complet : consensus, sous-affirmations, manipulation & enquête',
              'Accès complet API REST & Webhooks (intégrations CMS)',
              'Comptes d’équipe multi-sièges & facturation centralisée',
              'Flux live de veille & détection des opportunités de fact-checking',
              'Rapports PDF personnalisés avec votre propre marque (White-label)',
              'Piste d’audit vérifiable & conformité EEAT / IFCN',
              'SLA garanti & gestionnaire de compte dédié 1-on-1',
            ],
            cta: 'Nous contacter',
          },
          compareTitle: 'Comparatif détaillé des forfaits',
          included: 'Inclus',
          excluded: 'Non inclus',
          rows: [
            { label: 'Vérifications mensuelles', free: '3', pro: '50+ / mois', business: 'Sur devis / Illimité' },
            { label: 'Vérification texte, capture (OCR) et URL', free: true, pro: true, business: true },
            { label: 'Verdict, score 0–100 et classement', free: true, pro: true, business: true },
            { label: 'Carte de verdict partageable (WhatsApp, FB, X)', free: true, pro: true, business: true },
            { label: 'Historique des recherches et favoris', free: true, pro: true, business: true },
            { label: 'Téléchargement du rapport complet en PDF', free: false, pro: true, business: true },
            { label: 'Lien direct avec surlignage de la phrase citée', free: false, pro: true, business: true },
            { label: 'Dossier Pro : Matrice de consensus entre sources', free: false, pro: false, business: true },
            { label: 'Dossier Pro : Décomposition des sous-affirmations', free: false, pro: false, business: true },
            { label: 'Dossier Pro : Analyse des techniques de manipulation', free: false, pro: false, business: true },
            { label: 'Dossier Pro : Kit d’investigation journalistique', free: false, pro: false, business: true },
            { label: 'AI Deep-Dive : Assistant interactif Q&R sur le rapport', free: false, pro: true, business: true },
            { label: 'File d’attente prioritaire (modèles IA haute vitesse)', free: false, pro: true, business: true },
            { label: 'Support prioritaire par e-mail', free: false, pro: true, business: true },
            { label: 'Accès API REST & intégrations Webhook', free: false, pro: false, business: true },
            { label: 'Comptes d’équipe & gestion centralisée des sièges', free: false, pro: false, business: true },
            { label: 'Flux de veille thématique & détection désinformation', free: false, pro: false, business: true },
            { label: 'Piste d’audit vérifiable & conformité EEAT / IFCN', free: false, pro: false, business: true },
            { label: 'Rapports PDF personnalisés (White-label & logo)', free: false, pro: false, business: true },
            { label: 'SLA garanti & support technique dédié', free: false, pro: false, business: true },
          ],
          footnotePrefix: 'Aucune carte bancaire requise pour le forfait gratuit. Pour toute demande sur-mesure, écrivez à ',
        }
      : isEn
      ? {
          eyebrow: 'Pricing',
          title: 'Free for everyday checks. Paid when you check a lot.',
          billing: { monthly: 'Monthly', yearly: 'Yearly', save: 'Save 25%', aria: 'Billing period' },
          recommended: 'Recommended',
          perMonth: '/mo',
          billedYearly: 'billed €35.90 a year',
          successTitle: 'Subscription Active!',
          successMsg: 'Your Pro subscription is now active! You have full Pro access.',
          free: {
            name: 'Free',
            price: 'Free',
            tagline: 'For anyone who wants to check what they see in their feed.',
            checks: '3 verifications a month',
            features: [
              '3 full verifications per month (text, OCR screenshot, URL)',
              'Credibility score 0–100 & transparent verdict breakdown',
              'Public cited sources and context explanations',
              'Shareable visual verdict card (Social Media & Chat)',
              'Personal history & bookmarks in your account',
            ],
            cta: 'Start free',
          },
          pro: {
            name: 'Pro',
            priceMonthly: '€3.99',
            priceYearly: '€2.99',
            tagline: 'For journalists, researchers, and anyone who checks daily.',
            checks: 'Over 10× more checks (50+ / month)',
            features: [
              '50+ checks per month (high priority)',
              'AI Report Deep-Dive: Interactive Q&A on report context',
              'Download full printable PDF report',
              'Exact deep-link & highlight to cited sentence in each source',
              'Priority email support',
            ],
            cta: isSubmitting ? 'Connecting to Creem...' : 'Choose Pro',
          },
          business: {
            name: 'Business',
            price: 'Contact',
            tagline: 'For newsrooms, NGOs, and teams.',
            checks: 'Custom or unlimited volume',
            features: [
              'High-volume or unlimited monthly verifications',
              'Full Pro Dossier: consensus, sub-claims, manipulation & investigation toolkit',
              'Full REST API access & Webhooks (CMS & bot integration)',
              'Multi-seat team accounts & centralized billing',
              'Live disinformation monitoring & content opportunities feed',
              'Custom branded PDF reports (White-label with your logo)',
              'Verifiable report audit trail & EEAT / IFCN compliance',
              'Guaranteed SLA & dedicated 1-on-1 account manager',
            ],
            cta: 'Get in touch',
          },
          compareTitle: 'Detailed Plan Comparison',
          included: 'Included',
          excluded: 'Not included',
          rows: [
            { label: 'Verifications per month', free: '3', pro: '50+ / mo', business: 'Custom / Unlimited' },
            { label: 'Text, screenshot (OCR), and URL checks', free: true, pro: true, business: true },
            { label: 'Verdict, score 0–100, and cited sources', free: true, pro: true, business: true },
            { label: 'Shareable verdict card (WhatsApp, FB, X)', free: true, pro: true, business: true },
            { label: 'Personal search history and bookmarks', free: true, pro: true, business: true },
            { label: 'Download the full report as PDF', free: false, pro: true, business: true },
            { label: 'Exact link & highlight to cited sentence', free: false, pro: true, business: true },
            { label: 'Pro Dossier: Cross-source consensus matrix', free: false, pro: false, business: true },
            { label: 'Pro Dossier: Sub-claims breakdown & verdicts', free: false, pro: false, business: true },
            { label: 'Pro Dossier: Manipulation technique analysis', free: false, pro: false, business: true },
            { label: 'Pro Dossier: Journalist investigation toolkit', free: false, pro: false, business: true },
            { label: 'AI Deep-Dive: Interactive Q&A on the report', free: false, pro: true, business: true },
            { label: 'Fast-track priority queue (top AI models)', free: false, pro: true, business: true },
            { label: 'Priority email support', free: false, pro: true, business: true },
            { label: 'REST API access & Webhook integrations', free: false, pro: false, business: true },
            { label: 'Team accounts & centralized seat billing', free: false, pro: false, business: true },
            { label: 'Live topic monitoring & misinformation feed', free: false, pro: false, business: true },
            { label: 'Verifiable audit trail & EEAT / IFCN compliance', free: false, pro: false, business: true },
            { label: 'Custom branded PDF reports (White-label)', free: false, pro: false, business: true },
            { label: 'Guaranteed SLA & dedicated account manager', free: false, pro: false, business: true },
          ],
          footnotePrefix: 'No card needed for the free plan. For anything custom, write to ',
        }
      : {
          eyebrow: 'Prețuri',
          title: 'Gratuit pentru verificări de zi cu zi. Plătit când verifici mult.',
          billing: { monthly: 'Lunar', yearly: 'Anual', save: 'Economisești 25%', aria: 'Perioadă de facturare' },
          recommended: 'Recomandat',
          perMonth: '/lună',
          billedYearly: 'facturat €35,90 pe an',
          successTitle: 'Abonament Activat!',
          successMsg: 'Abonamentul tău Pro a fost activat cu succes! Ai acum acces la toate funcțiile Pro.',
          free: {
            name: 'Free',
            price: 'Gratuit',
            tagline: 'Pentru oricine vrea să verifice ce vede în feed.',
            checks: '3 verificări pe lună',
            features: [
              '3 verificări complete pe lună (text, captură OCR, link URL)',
              'Verdict, scor de veridicitate 0–100 și explicații detaliate',
              'Surse citate publice și context factual',
              'Card vizual de verdict share-abil (Social Media & Chat)',
              'Salvare istoric căutări și marcaje în contul tău',
            ],
            cta: 'Începe gratuit',
          },
          pro: {
            name: 'Pro',
            priceMonthly: '€3,99',
            priceYearly: '€2,99',
            tagline: 'Pentru jurnaliști, cercetători și oricine verifică zilnic.',
            checks: 'De peste 10× mai multe verificări (50+ / lună)',
            features: [
              '50+ verificări pe lună (prioritate ridicată)',
              'AI Report Deep-Dive: Asistent interactiv Q&A pe raport',
              'Descarcă raportul complet în format PDF gata de tipar',
              'Link direct cu highlight pe propoziția exactă din fiecare sursă',
              'Suport prioritar prin email',
            ],
            cta: isSubmitting ? 'Se conectează la Creem...' : 'Alege Pro',
          },
          business: {
            name: 'Business',
            price: 'Contact',
            tagline: 'Pentru redacții, ONG-uri și echipe.',
            checks: 'Volum personalizat sau nelimitat',
            features: [
              'Volum ridicat sau nelimitat de verificări lunare',
              'Dosar Pro complet: consens, sub-afirmații, manipulare & investigație',
              'Acces complet API REST & Webhooks (integrare CMS)',
              'Conturi de echipă multi-seat & facturare centralizată',
              'Feed live de monitorizare teme & oportunități de dezinformare',
              'Rapoarte PDF personalizate cu brandul organizației tale (White-label)',
              'Pistă de audit verificabilă & conformitate EEAT / IFCN',
              'SLA garantat & asistență tehnică dedicată 1-la-1',
            ],
            cta: 'Scrie-ne',
          },
          compareTitle: 'Comparativ detaliat al planurilor',
          included: 'Inclus',
          excluded: 'Neinclus',
          rows: [
            { label: 'Verificări pe lună', free: '3', pro: '50+ / lună', business: 'La cerere / Nelimitat' },
            { label: 'Verificare din text, screenshot (OCR) și URL', free: true, pro: true, business: true },
            { label: 'Verdict, scor 0–100 și surse citate', free: true, pro: true, business: true },
            { label: 'Card de verdict share-abil (WhatsApp, FB, X)', free: true, pro: true, business: true },
            { label: 'Istoric personal și marcaje salvate', free: true, pro: true, business: true },
            { label: 'Descarcă raportul complet ca PDF', free: false, pro: true, business: true },
            { label: 'Link exact cu highlight la propoziția din sursă', free: false, pro: true, business: true },
            { label: 'Dosar Pro: Matrice de consens între surse', free: false, pro: false, business: true },
            { label: 'Dosar Pro: Descompunere pe sub-afirmații', free: false, pro: false, business: true },
            { label: 'Dosar Pro: Criminalistică tehnici de manipulare', free: false, pro: false, business: true },
            { label: 'Dosar Pro: Kit de investigație jurnalistică', free: false, pro: false, business: true },
            { label: 'AI Deep-Dive: Asistent interactiv Q&A pe raport', free: false, pro: true, business: true },
            { label: 'Coadă prioritară Fast-Track (modele AI de top)', free: false, pro: true, business: true },
            { label: 'Suport prioritar prin email', free: false, pro: true, business: true },
            { label: 'Acces API REST & integrări Webhook', free: false, pro: false, business: true },
            { label: 'Conturi de echipă & facturare centralizată', free: false, pro: false, business: true },
            { label: 'Monitorizare teme & flux live oportunități dezinformare', free: false, pro: false, business: true },
            { label: 'Pistă de audit verificabilă & conformitate EEAT / IFCN', free: false, pro: false, business: true },
            { label: 'Rapoarte PDF personalizate (White-label)', free: false, pro: false, business: true },
            { label: 'SLA garantat & manager dedicat de cont', free: false, pro: false, business: true },
          ],
          footnotePrefix: 'Fără card pentru planul gratuit. Pentru orice nevoie aparte, scrie-ne la ',
        };

  const proPrice = billing === 'yearly' ? c.pro.priceYearly : c.pro.priceMonthly;

  const renderCardFeatures = (features: string[]) => (
    <ul className={styles.featureList}>
      {features.map((feat, idx) => (
        <li key={idx} className={styles.featureItem}>
          <svg viewBox="0 0 20 20" className={styles.featureIcon} aria-hidden="true">
            <path
              d="M4 10.5 8 14.5 16 5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{feat}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{c.eyebrow}</p>
        <h1 className={shell.title}>{c.title}</h1>
      </header>

      <div className={shell.body}>
        {checkoutSuccess && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Callout label={c.successTitle}>{c.successMsg}</Callout>
          </div>
        )}

        {checkoutError && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Callout label="Eroare Plată">{checkoutError}</Callout>
          </div>
        )}

        {/* Billing period toggle — monthly vs a cheaper yearly. */}
        <div className={styles.billingToggle} role="group" aria-label={c.billing.aria}>
          <button
            type="button"
            className={[styles.billingOption, billing === 'monthly' ? styles.billingActive : '']
              .filter(Boolean)
              .join(' ')}
            aria-pressed={billing === 'monthly'}
            onClick={() => setBilling('monthly')}
          >
            {c.billing.monthly}
          </button>
          <button
            type="button"
            className={[styles.billingOption, billing === 'yearly' ? styles.billingActive : '']
              .filter(Boolean)
              .join(' ')}
            aria-pressed={billing === 'yearly'}
            onClick={() => setBilling('yearly')}
          >
            {c.billing.yearly}
            <span className={styles.saveChip}>{c.billing.save}</span>
          </button>
        </div>

        <div className={styles.grid}>
          {/* Free */}
          <section className={styles.plan}>
            <div className={styles.planHead}>
              <h2 className={styles.planName}>{c.free.name}</h2>
              <p className={styles.priceRow}>
                <span className={styles.price}>{c.free.price}</span>
              </p>
              <p className={styles.checks}>{c.free.checks}</p>
              <p className={styles.forWho}>{c.free.tagline}</p>
              {renderCardFeatures(c.free.features)}
            </div>
            <div className={styles.planCta}>
              <Button variant="secondary" size="md" fullWidth href="/cont">
                {c.free.cta}
              </Button>
            </div>
          </section>

          {/* Pro — highlighted */}
          <section className={`${styles.plan} ${styles.planHighlight}`}>
            <span className={styles.recommendedTag}>{c.recommended}</span>
            <div className={styles.planHead}>
              <h2 className={styles.planName}>{c.pro.name}</h2>
              <p className={styles.priceRow}>
                <span className={styles.price}>{proPrice}</span>
                <span className={styles.cadence}>{c.perMonth}</span>
              </p>
              <p className={styles.billedNote}>
                {billing === 'yearly' ? c.billedYearly : '\u00A0'}
              </p>
              <p className={styles.checks}>{c.pro.checks}</p>
              <p className={styles.forWho}>{c.pro.tagline}</p>
              {renderCardFeatures(c.pro.features)}
            </div>
            <div className={styles.planCta}>
              <Button
                variant="primary"
                size="md"
                fullWidth
                disabled={isSubmitting}
                onClick={handleProCheckout}
              >
                {c.pro.cta}
              </Button>
            </div>
          </section>

          {/* Business */}
          <section className={styles.plan}>
            <div className={styles.planHead}>
              <h2 className={styles.planName}>{c.business.name}</h2>
              <p className={styles.priceRow}>
                <span className={styles.price}>{c.business.price}</span>
              </p>
              <p className={styles.checks}>{c.business.checks}</p>
              <p className={styles.forWho}>{c.business.tagline}</p>
              {renderCardFeatures(c.business.features)}
            </div>
            <div className={styles.planCta}>
              <Button variant="secondary" size="md" fullWidth onClick={() => setContactOpen(true)}>
                {c.business.cta}
              </Button>
            </div>
          </section>
        </div>

        {/* Feature comparison */}
        <section className={shell.sectionRule}>
          <h2 className={styles.compareTitle}>{c.compareTitle}</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col" className={styles.rowHead}>
                    <span className={styles.srOnly}>{c.compareTitle}</span>
                  </th>
                  <th scope="col" className={styles.planCol}>{c.free.name}</th>
                  <th scope="col" className={`${styles.planCol} ${styles.planColHi}`}>{c.pro.name}</th>
                  <th scope="col" className={styles.planCol}>{c.business.name}</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className={styles.rowHead}>{row.label}</th>
                    <td className={styles.cell}>
                      <CellMark value={row.free} included={c.included} excluded={c.excluded} />
                    </td>
                    <td className={`${styles.cell} ${styles.cellHi}`}>
                      <CellMark value={row.pro} included={c.included} excluded={c.excluded} />
                    </td>
                    <td className={styles.cell}>
                      <CellMark value={row.business} included={c.included} excluded={c.excluded} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className={shell.sectionRule}>
          <p className={styles.footnote}>
            {c.footnotePrefix}
            <button
              type="button"
              className={styles.textLink}
              onClick={() => setContactOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {BUSINESS_EMAIL}
            </button>
            .
          </p>
        </div>
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}

