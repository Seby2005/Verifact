'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { useLanguage } from '@/i18n';
import type {
  VerificationReport,
  ProReportSynthesis,
  SourceComparisonEntry,
  SubClaimCheck,
  SourceInsight,
  ManipulationTechnique,
} from '@/types/verification';
import { synthesisFromReport } from '@/lib/ai/report-synthesis';
import { sourceHref } from '@/components/verify/ReportView/sourceLink';
import styles from './ProReportDossier.module.css';

export interface ProReportDossierProps {
  report: VerificationReport;
  isPremium: boolean;
}

type TabKey = 'matrix' | 'subclaims' | 'sources' | 'manipulation' | 'investigation';

export const ProReportDossier: React.FC<ProReportDossierProps> = ({ report, isPremium }) => {
  const { locale, t } = useLanguage();
  const isEn = locale === 'en';
  const [activeTab, setActiveTab] = useState<TabKey>('matrix');

  const synthesis: ProReportSynthesis =
    report.proSynthesis || synthesisFromReport(report, locale);

  if (!isPremium) {
    return (
      <section className={styles.dossierContainer} aria-label={t('proDossier.title')}>
        <div className={styles.teaserCard}>
          <div className={styles.teaserHead}>
            <span className={styles.proBadge}>{t('proDossier.teaser.badge')}</span>
            <h3 className={styles.teaserTitle}>{t('proDossier.teaser.title')}</h3>
          </div>
          <p className={styles.teaserDesc}>{t('proDossier.teaser.description')}</p>

          <div className={styles.teaserFeatures}>
            <div className={styles.teaserFeatureItem}>
              <svg className={styles.teaserCheckIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{t('proDossier.teaser.feature1')}</span>
            </div>
            <div className={styles.teaserFeatureItem}>
              <svg className={styles.teaserCheckIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{t('proDossier.teaser.feature2')}</span>
            </div>
            <div className={styles.teaserFeatureItem}>
              <svg className={styles.teaserCheckIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{t('proDossier.teaser.feature3')}</span>
            </div>
            <div className={styles.teaserFeatureItem}>
              <svg className={styles.teaserCheckIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{t('proDossier.teaser.feature4')}</span>
            </div>
          </div>

          <div className={styles.teaserCtaRow}>
            <Link href="/preturi">
              <Button variant="primary" size="md">
                {t('proDossier.teaser.unlockBtn')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const { crossSourceAnalysis, subClaims, sourceInsights, manipulationAnalysis, narrativeAndImpact, investigatorToolkit } = synthesis;

  const renderConsensusBadge = (level: string) => {
    let text = t('proDossier.consensus.mixed');
    let cls = styles.consensusMixed;
    if (level === 'unanimous') {
      text = t('proDossier.consensus.unanimous');
      cls = styles.consensusUnanimous;
    } else if (level === 'strong') {
      text = t('proDossier.consensus.strong');
      cls = styles.consensusStrong;
    } else if (level === 'conflicting') {
      text = t('proDossier.consensus.conflicting');
      cls = styles.consensusConflicting;
    }
    return <span className={`${styles.consensusLevelBadge} ${cls}`}>{text}</span>;
  };

  const renderStanceBadge = (stance: SourceComparisonEntry['stance'] | SourceInsight['stance']) => {
    const s = String(stance).toLowerCase();
    if (s.includes('confirm')) {
      return <span className={`${styles.stanceBadge} ${styles.stanceConfirms}`}>{t('proDossier.sources.stanceConfirms')}</span>;
    }
    if (s.includes('contra') || s.includes('refut')) {
      return <span className={`${styles.stanceBadge} ${styles.stanceContradicts}`}>{t('proDossier.sources.stanceContradicts')}</span>;
    }
    return <span className={`${styles.stanceBadge} ${styles.stanceContext}`}>{t('proDossier.sources.stanceContext')}</span>;
  };

  const renderSubClaimVerdictBadge = (verdict: SubClaimCheck['verdict']) => {
    if (verdict === 'true') {
      return <span className={`${styles.subClaimVerdictBadge} ${styles.subClaimTrue}`}>{t('proDossier.subclaims.verdictTrue')}</span>;
    }
    if (verdict === 'false') {
      return <span className={`${styles.subClaimVerdictBadge} ${styles.subClaimFalse}`}>{t('proDossier.subclaims.verdictFalse')}</span>;
    }
    if (verdict === 'partial') {
      return <span className={`${styles.subClaimVerdictBadge} ${styles.subClaimPartial}`}>{t('proDossier.subclaims.verdictPartial')}</span>;
    }
    return <span className={`${styles.subClaimVerdictBadge} ${styles.subClaimUnverified}`}>{t('proDossier.subclaims.verdictUnverified')}</span>;
  };

  return (
    <section className={styles.dossierContainer} aria-label={t('proDossier.title')}>
      <header className={styles.header}>
        <div className={styles.headerTitleRow}>
          <h3 className={styles.title}>{t('proDossier.title')}</h3>
          <span className={styles.proBadge}>{t('proDossier.badge')}</span>
        </div>
        <p className={styles.subtitle}>{t('proDossier.subtitle')}</p>
      </header>

      {/* Tabs */}
      <div className={styles.tabNav} role="tablist" aria-label={t('proDossier.title')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'matrix'}
          className={`${styles.tabBtn} ${activeTab === 'matrix' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          {t('proDossier.tabs.matrix')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'subclaims'}
          className={`${styles.tabBtn} ${activeTab === 'subclaims' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('subclaims')}
        >
          {t('proDossier.tabs.subclaims')} ({subClaims?.length ?? 0})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'sources'}
          className={`${styles.tabBtn} ${activeTab === 'sources' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('sources')}
        >
          {t('proDossier.tabs.sources')} ({sourceInsights?.length ?? 0})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'manipulation'}
          className={`${styles.tabBtn} ${activeTab === 'manipulation' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('manipulation')}
        >
          {t('proDossier.tabs.manipulation')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'investigation'}
          className={`${styles.tabBtn} ${activeTab === 'investigation' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('investigation')}
        >
          {t('proDossier.tabs.investigation')}
        </button>
      </div>

      {/* Panel 1: Cross-Source Matrix & Consensus */}
      {activeTab === 'matrix' && (
        <div className={styles.panel} role="tabpanel">
          <div className={styles.consensusCard}>
            <div className={styles.consensusHeader}>
              <span className={styles.consensusLabel}>{t('proDossier.consensus.label')}</span>
              {renderConsensusBadge(crossSourceAnalysis?.consensusLevel || 'mixed')}
            </div>

            <div className={styles.pointsGrid}>
              <div className={styles.pointBox}>
                <span className={styles.pointBoxTitle}>{t('proDossier.consensus.agreementsTitle')}</span>
                <p className={styles.pointBoxText}>
                  {crossSourceAnalysis?.agreements || t('reportView.partialAnalysisText')}
                </p>
              </div>

              <div className={styles.pointBox}>
                <span className={styles.pointBoxTitle}>{t('proDossier.consensus.contradictionsTitle')}</span>
                <p className={styles.pointBoxText}>
                  {crossSourceAnalysis?.contradictions ||
                    (isEn
                      ? 'No direct contradictions observed among verified primary sources.'
                      : locale === 'fr'
                      ? 'Aucune contradiction directe observée parmi les sources primaires vérifiées.'
                      : 'Nu au fost identificate contradicții directe între sursele primare verificate.')}
                </p>
              </div>
            </div>
          </div>

          {crossSourceAnalysis?.comparisonMatrix && crossSourceAnalysis.comparisonMatrix.length > 0 && (
            <div className={styles.matrixWrapper}>
              <table className={styles.matrixTable}>
                <thead>
                  <tr>
                    <th>{t('proDossier.consensus.colSource')}</th>
                    <th>{t('proDossier.consensus.colStance')}</th>
                    <th>{t('proDossier.consensus.colKeyPoint')}</th>
                  </tr>
                </thead>
                <tbody>
                  {crossSourceAnalysis.comparisonMatrix.map((item, idx) => (
                    <tr key={idx}>
                      <td className={styles.sourceCell}>
                        {item.url ? (
                          <a
                            href={sourceHref(item.url, item.keyPoint, isPremium)}
                            target="_blank"
                            rel="noreferrer noopener"
                            className={styles.sourceLink}
                          >
                            {item.sourceName}
                          </a>
                        ) : (
                          item.sourceName
                        )}
                      </td>
                      <td>{renderStanceBadge(item.stance)}</td>
                      <td>{item.keyPoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Panel 2: Sub-Claims Verification */}
      {activeTab === 'subclaims' && (
        <div className={styles.panel} role="tabpanel">
          <p className={styles.subtitle}>{t('proDossier.subclaims.intro')}</p>
          <div className={styles.subClaimsList}>
            {subClaims.map((sub, idx) => (
              <article key={idx} className={styles.subClaimCard}>
                <div className={styles.subClaimHeader}>
                  <p className={styles.subClaimText}>{sub.subClaim}</p>
                  {renderSubClaimVerdictBadge(sub.verdict)}
                </div>
                <p className={styles.subClaimExplanation}>{sub.explanation}</p>
                {sub.evidenceSourceIndexes && sub.evidenceSourceIndexes.length > 0 && (
                  <span className={styles.subClaimSources}>
                    {t('proDossier.subclaims.sourcesCited')}{' '}
                    {sub.evidenceSourceIndexes.map((i) => `#${i}`).join(', ')}
                  </span>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Panel 3: Detailed Source Insights */}
      {activeTab === 'sources' && (
        <div className={styles.panel} role="tabpanel">
          <div className={styles.sourceInsightsList}>
            {sourceInsights.map((insight) => (
              <article key={insight.index} className={styles.sourceInsightCard}>
                <div className={styles.sourceInsightHead}>
                  <span className={styles.sourceInsightPublisher}>
                    [{insight.index}] {insight.publisher}
                  </span>
                  {renderStanceBadge(insight.stance)}
                </div>

                <p className={styles.sourceInsightTakeaway}>{insight.takeaway}</p>

                {insight.directQuote && (
                  <blockquote className={styles.sourceInsightQuote}>
                    &ldquo;{insight.directQuote}&rdquo;
                  </blockquote>
                )}

                <div className={styles.sourceInsightMeta}>
                  {insight.credibilityNote && (
                    <span>
                      <strong>{t('proDossier.sources.credibilityLabel')}</strong> {insight.credibilityNote}
                    </span>
                  )}
                  {insight.sourceUrl && (
                    <a
                      href={sourceHref(insight.sourceUrl, insight.directQuote || insight.takeaway, isPremium)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={styles.sourceLink}
                    >
                      {t('proDossier.sources.visitSource')} &rarr;
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Panel 4: Manipulation Techniques Forensics */}
      {activeTab === 'manipulation' && (
        <div className={styles.panel} role="tabpanel">
          {manipulationAnalysis?.techniques && manipulationAnalysis.techniques.length > 0 ? (
            <div className={styles.techniquesGrid}>
              {manipulationAnalysis.techniques.map((tech, idx) => (
                <div key={idx} className={styles.techniqueCard}>
                  <span className={styles.techniqueName}>{tech.name}</span>
                  <p className={styles.techniqueDesc}>{tech.description}</p>
                  <div className={styles.techniqueManifestation}>
                    <strong>{t('proDossier.manipulation.manifestationLabel')}</strong> {tech.manifestationInClaim}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.consensusCard}>
              <span className={styles.consensusLabel}>{t('proDossier.manipulation.noneDetectedTitle')}</span>
              <p className={styles.pointBoxText}>{manipulationAnalysis?.summary}</p>
            </div>
          )}

          {narrativeAndImpact && (
            <div className={styles.narrativeBlock}>
              <div className={styles.pointBox}>
                <span className={styles.pointBoxTitle}>{t('proDossier.manipulation.narrativeTitle')}</span>
                <p className={styles.pointBoxText}>{narrativeAndImpact.originAndPropagation}</p>
              </div>
              <div className={styles.pointBox}>
                <span className={styles.pointBoxTitle}>{t('proDossier.manipulation.motiveTitle')}</span>
                <p className={styles.pointBoxText}>{narrativeAndImpact.motiveAssessment}</p>
              </div>
              <div className={styles.pointBox}>
                <span className={styles.pointBoxTitle}>{t('proDossier.manipulation.impactTitle')}</span>
                <p className={styles.pointBoxText}>{narrativeAndImpact.publicImpact}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panel 5: Journalist Toolkit & Missing Evidence */}
      {activeTab === 'investigation' && (
        <div className={styles.panel} role="tabpanel">
          <div className={styles.toolkitGrid}>
            <div className={styles.toolkitBox}>
              <span className={styles.pointBoxTitle}>{t('proDossier.investigation.missingEvidenceTitle')}</span>
              <ul className={styles.toolkitList}>
                {investigatorToolkit?.missingEvidence?.map((item, idx) => (
                  <li key={idx} className={styles.toolkitListItem}>{item}</li>
                ))}
              </ul>
            </div>

            {investigatorToolkit?.foiaRecommendations && investigatorToolkit.foiaRecommendations.length > 0 && (
              <div className={styles.toolkitBox}>
                <span className={styles.pointBoxTitle}>{t('proDossier.investigation.foiaTitle')}</span>
                <ul className={styles.toolkitList}>
                  {investigatorToolkit.foiaRecommendations.map((item, idx) => (
                    <li key={idx} className={styles.toolkitListItem}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {investigatorToolkit?.journalistFaq && investigatorToolkit.journalistFaq.length > 0 && (
              <div className={styles.toolkitBox}>
                <span className={styles.pointBoxTitle}>{t('proDossier.investigation.faqTitle')}</span>
                <div>
                  {investigatorToolkit.journalistFaq.map((faq, idx) => (
                    <div key={idx} className={styles.faqItem}>
                      <p className={styles.faqQuestion}>Q: {faq.question}</p>
                      <p className={styles.faqAnswer}>A: {faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
