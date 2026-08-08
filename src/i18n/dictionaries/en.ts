import type { Translations } from './ro';

export const en: Translations = {
  common: {
    close: 'Close',
    closeAria: 'Close dialog',
  },
  header: {
    nav: {
      disinformation: 'Disinformation',
      transparency: 'Transparency',
      pricing: 'Pricing',
      account: 'Account',
      ariaNav: 'Main navigation',
      toggleLangAria: 'Switch language to Romanian',
    },
    theme: {
      toDark: 'Switch to dark theme',
      toLight: 'Switch to light theme',
    },
  },
  verdict: {
    copy: {
      true: 'Likely True',
      partial: 'Partially True',
      unclear: 'Unclear',
      false: 'Likely False',
    },
    note: {
      partial: 'Missing Context',
      unclear: 'Inconclusive',
    },
    scoreLabel: 'Credibility score: ',
  },

  footer: {
    privacy:
      'What you check stays yours. We never sell data and publish nothing without your say-so.',
    sections: {
      product: {
        title: 'Product',
        verify: 'Verify a claim',
        pricing: 'Pricing',
        account: 'Account',
      },
      project: {
        title: 'Project',
        disinformation: 'About disinformation',
        mission: 'Mission',
        transparency: 'Transparency',
        openSource: 'Open source & privacy',
      },
      legal: {
        title: 'Legal',
        terms: 'Terms of service',
        privacy: 'Privacy policy',
      },
    },
    copyright: '© {year} Verifact. MIT License.',
    repoLink: 'Source code on GitHub',
  },
  home: {
    hero: {
      eyebrow: 'Independent verification · public sources',
      title: 'True or false?',
      titleAccent: 'Check the sources.',
      lead:
        'Paste a claim — get a verdict, a score, and the sources behind it.',
    },
    try: {
      label: 'Try',
      example1: 'Lightning never strikes the same place twice',
      example2: 'We only use 10% of our brain',
      example3: 'The Great Wall of China is visible from space',
    },
    trust: {
      line: 'Don’t take our word for it — see the sources.',
    },
    sample: {
      eyebrow: 'What an answer looks like',
      title: 'The verdict, not a wall of text.',
      scoreCaption: 'score',
      meta: '4/4 evidence layers · 12.3 s',
      sourcesLabel: 'The sources behind it',
      claim: 'mRNA vaccines alter human DNA.',
      summary:
        'Messenger RNA from the vaccine does not enter the cell nucleus where DNA is located, and degrades within days after producing the spike protein. There is no known mechanism by which this process could modify the human genome.',
    },
    steps: {
      title: 'How it works',
      step1: {
        number: '01',
        title: 'Submit the claim',
        text: 'Text, link to an article, or screenshot from a post. No account required for a verification.',
      },
      step2: {
        number: '02',
        title: 'We search sources, not model memory',
        text: 'The claim is queried against fact-checking databases, conventional news media, official sources, and public statements — four independent layers.',
      },
      step3: {
        number: '03',
        title: 'Receive a report with sources',
        text: 'Verdict, credibility score, and the complete list of supporting sources so you can verify everything yourself.',
      },
    },
    callout: {
      label: 'Core principle',
      text:
        'A verdict without sources is just another opinion. That is why every Verifact report cites its supporting sources in full, and the algorithm weighting them is open to the public.',
      methodologyLink: 'View full methodology',
      openSourceLink: 'Open source & privacy',
    },
  },
  verifyTool: {
    layers: {
      ariaLabel: 'Evidence layers consulted',
      searching: 'searching…',
      found: '{count} results',
      foundOne: '1 result',
      empty: 'no results',
      unavailable: 'unavailable',
      notApplicable: 'not applicable',
      aiScored: 'assessed {score}/100',
    },
    heading: 'Verify a claim',
    ariaTabContent: 'Content type to verify',
    tabs: {
      text: 'Text',
      screenshot: 'Screenshot',
      url: 'URL',
    },
    textarea: {
      label: 'Claim to verify',
      placeholder: 'Paste the text or claim you want to verify here.',
      helper: 'Minimum 10 characters. Works best with a single concrete claim.',
    },
    dropzone: {
      title: 'Choose an image or drop it here',
      hint: 'PNG, JPG, or WebP — up to 10 MB',
      fileSelected: 'Selected file: {name}',
    },
    urlInput: {
      label: 'Link to article or post',
      placeholder: 'https://example.com/article',
      helper: 'We extract the article text and verify the main claims.',
    },
    actions: {
      submit: 'Verify now',
      privacyHint: 'Your check stays private until you choose to publish it.',
      pending: 'Verifying…',
    },
    errors: {
      emptyText: 'Please enter the content you want to verify.',
      emptyImage: 'Please choose an image before starting verification.',
      ocrFailed:
        'Could not extract readable text from the image. Try a clearer screenshot or paste the text manually.',
      generic: 'An error occurred during verification.',
      network: 'Could not reach the server. Please check your connection and try again.',
      unavailableLabel: 'Currently unavailable',
      errorLabel: 'Error',
    },
  },
  reportView: {
    analyzedIn: 'analyzed in {seconds}s',
    layersWithEvidence: '{count}/4 layers with evidence',
    claimLabel: 'Verified claim',
    partialAnalysisLabel: 'Partial analysis',
    partialAnalysisText:
      'Natural language analysis could not be generated for this report. The verdict and sources below are complete from source searching; only the narrative summary is missing.',
    summaryLabel: 'Summary',
    sourcesLabel: 'Sources ({count})',
    disclaimerLabel: 'Disclaimer',
    disclaimerText:
      'This report is generated automatically and does not constitute a final editorial decision. Read cited sources for full context.',
    downloadBtn: 'Download PDF',
    downloadDocTitle: 'Verification report',
    downloadGeneratedOn: 'Generated on',
    downloadScoreLabel: 'Credibility score',
    premiumModalTitle: 'The full PDF report is a Pro feature',
    premiumModalLead:
      'Below is a slice of the report and a few exact sources. The full PDF — every source linked straight to the sentence checked — comes with the Pro plan.',
    premiumSourcesLabel: 'A few of the sources',
    premiumUpgradeCta: 'See the plans',
    premiumCloseCta: 'Close',
    printId: 'Report ID',
  },
  cite: {
    button: 'Copy citation',
    copiedShort: 'Copied',
    copied: 'Citation copied to clipboard',
    failed: 'Could not copy the citation. Select the text manually.',
    heading: 'Verifact — independent information verification',
    claimLabel: 'Claim',
    verdictLabel: 'Verdict',
    scoreLabel: 'credibility score',
    layersLabel: 'Evidence layers',
    sourcesLabel: 'Sources consulted',
    reportLabel: 'Report',
    accessed: 'accessed',
  },
  dispute: {
    reportErrorBtn: 'Report error',
    modalTitle: 'Report an error',
    sentLabel: 'Submitted',
    sentText:
      'Thank you. The dispute has been recorded and the report was flagged for re-verification.',
    reasonLabel: 'What is incorrect in this report?',
    reasonHelper: 'Minimum 10 characters.',
    reasonMinError: 'Please describe the error in at least 10 characters.',
    emailLabel: 'Email (optional)',
    emailPlaceholder: 'name@example.com',
    emailHelper: 'Only if you would like us to contact you regarding this dispute.',
    submitBtn: 'Submit dispute',
    legalNote: 'Error reports are reviewed confidentially to maintain accuracy.',
    errorGeneric: 'An error occurred. Please try again.',
    errorNetwork: 'Could not reach the server. Please check your connection and try again.',
  },
  auth: {
    tabs: {
      login: 'Sign in',
      signup: 'Create account',
      ariaLabel: 'Authentication mode',
    },
    session: {
      heading: 'Your account',
      email: 'Email',
      plan: 'Plan',
      verificationsThisMonth: 'Verifications this month',
      verificationsValue: '{current} of {limit}',
      signOut: 'Sign out',
      dangerLead:
        'Deleting your account is permanent: your private reports will be deleted forever, while published ones will remain in the public database, anonymized. Details in the Privacy Policy.',
      deleteBtn: 'Delete account',
    },
    deleteModal: {
      title: 'Delete account permanently?',
      lead:
        'This action cannot be undone. All your private reports will be deleted. Published reports remain, but disassociated from your account.',
      confirmLabel: 'Type "{phrase}" to confirm',
      cancelBtn: 'Cancel',
      confirmBtn: 'Permanently delete account',
      errorLabel: 'Action failed',
      errorGeneric: 'Account deletion failed.',
    },
    form: {
      ariaLabel: 'Authentication',
      loginSubtitle: 'Welcome back. Sign in to pick up your verifications.',
      signupSubtitle: 'A free account in seconds. No card, no spam.',
      emailLabel: 'Email',
      emailPlaceholder: 'name@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Minimum 8 characters',
      passwordHelperSignup: 'Choose a password with at least 8 characters.',
      confirmPasswordLabel: 'Confirm password',
      confirmPasswordPlaceholder: 'Repeat the password',
      passwordMismatch: 'The passwords do not match.',
      submitLogin: 'Sign in',
      submitSignup: 'Create account',
      socialGoogle: 'Continue with Google',
      orDivider: 'or use email and password',
      termsPrefix: 'By creating an account, you agree to the ',
      termsLink: 'Terms',
      termsMid: ' and ',
      privacyLink: 'Privacy Policy',
      termsSuffix: '.',
      privacyNote:
        'Your verifications stay private. No one else can see them.',
      successSignup:
        'Account created. Please check your email for the confirmation link.',
      successLogin: 'Signed in successfully.',
      errorGeneric: 'An error occurred during authentication.',
      errorLabel: 'Action failed',
      successLabel: 'Done',
    },
    tiers: {
      free: 'Free',
      pro: 'Pro',
      business: 'Business',
    },
    twoFactor: {
      hint: "We sent a code to {email}. Enter it below to confirm it's really you.",
      codeLabel: 'Code from email',
      codePlaceholder: '123456',
      submitBtn: 'Confirm code',
      resendBtn: 'Resend code',
      resendSuccess: 'Code resent by email.',
      backBtn: 'Back',
      errorGeneric: 'The code you entered is not valid.',
    },
  },
  contPage: {
    metadata: {
      title: 'Account',
      description:
        'Create a Verifact account or sign in. Your reports and history remain private.',
    },
    eyebrow: 'Account',
    title: 'Sign in or create an account',
    lead:
      'You only need an account if you want to save your verification history. A simple claim check works without one.',
    oauthError: {
      label: 'Sign-in error',
      message:
        'Signing in with that social network failed. Please try again, or use your email and password.',
    },
    aside: {
      title: 'What happens to your data',
      bullet1Strong: 'Everything is private.',
      bullet1Text:
        ' Your reports, history, and account remain yours. A report only becomes public if you click the publish button.',
      bullet2Strong: 'We do not sell data.',
      bullet2Text:
        ' There are no data brokers, advertising profiling, or third-party trackers in Verifact.',
      bullet3Strong: 'Screenshots are not stored.',
      bullet3Text:
        ' Uploaded images are used solely to extract text and are then deleted, not archived.',
      bullet4Strong: 'You can leave anytime.',
      bullet4Text: ' Deleting your account permanently removes your reports.',
      noteText: 'Full details can be found on the ',
      noteLink: 'Open source & privacy page',
    },
  },
  misiunePage: {
    metadata: {
      title: 'Mission',
      description:
        'Why Verifact exists: instant access to fact verification through transparent AI and verifiable sources.',
    },
    eyebrow: 'Mission',
    title: 'Why Verifact exists',
    calloutLabel: 'Product Mission',
    calloutText:
      'We give every citizen instant access to truth, through transparent artificial intelligence and verifiable sources.',
    problemTitle: 'The Problem',
    problemText1:
      'A false story reaches millions within hours. The correction arrives days later — if at all.',
    problemText2:
      'Verifact makes verification instant, transparent, and free for personal use.',
    romaniaTitle: 'Why Romania First',
    romaniaBullets: [
      'There is no native automated fact-checking tool in the Romanian language.',
      'Demand for independent verification is high and growing.',
      'Independent journalism — G4Media, PressOne, Recorder — are natural partners, not competitors.',
    ],
    notTitle: 'What We Are Not',
    notText:
      'We are not an arbiter of truth and we do not replace newsrooms. An automated report is a starting point backed by sources, not an editorial judgment. That is why every verdict shows its score and its sources — so you can check the conclusion yourself, including against us.',
    valuesTitle: 'Our Values',
    values: [
      {
        title: 'Transparency',
        text: 'The algorithm is open source. Anyone can inspect how verification is performed.',
      },
      {
        title: 'Fairness',
        text: 'We do not take political sides. We verify facts, not opinions.',
      },
      {
        title: 'Accessibility',
        text: 'Free for everyday users.',
      },
      {
        title: 'Accountability',
        text: 'Every report includes verifiable sources, not just assertions.',
      },
      {
        title: 'Privacy',
        text: 'User screenshots are never stored permanently.',
      },
    ],
    followText: 'See also the ',
    methodologyLink: 'verification methodology',
    orText: ' or the ',
    openSourceLink: 'code and privacy policy',
  },
  transparentaPage: {
    metadata: {
      title: 'Transparency',
      description:
        'Verifact methodology: the four source layers, how credibility scores are calculated, and what each verdict means.',
    },
    eyebrow: 'Transparency',
    title: 'How we reach a verdict',
    lead:
      'A verdict without methodology is an opinion with borrowed authority. Below: what we consult, how we weight it, where we stop.',
    layersTitle: 'The Four Source Layers',
    layersWeight: 'Weight {weight}',
    layers: [
      {
        number: '01',
        title: 'Existing Fact-Checks',
        weight: '35%',
        text:
          'We search the claim in published fact-checking databases. If a recognized organization has already verified it, that carries the most weight.',
      },
      {
        number: '02',
        title: 'Conventional News',
        weight: '30%',
        text:
          'How the topic was reported across outlets with an editorial record — for context and contradictions.',
      },
      {
        number: '03',
        title: 'Official Sources',
        weight: '25%',
        text:
          'Institutional sites — .gov.ro, .europa.eu, WHO, UN, and other relevant public bodies.',
      },
      {
        number: '04',
        title: 'Social Media & Public Statements',
        weight: '10%',
        text:
          'We check whether a statement attributed to someone was actually made. This applies only to claims naming a public figure; otherwise the layer is skipped.',
      },
      {
        number: '05',
        title: 'AI Contextual Analysis',
        weight: '10%',
        text:
          'An AI model assesses the claim against the evidence above and flags missing context. Its nominal weight is small, but when the searches find nothing their weight is redistributed and the AI assessment counts for far more — up to carrying the score on its own.',
      },
    ],
    scoreTitle: 'What the Score Means',
    scoreIntro:
      'The final score is a weighted average of the five layers. The band it falls into determines the verdict — nothing else.',
    bands: [
      {
        range: '85–100%',
        label: 'Likely True',
        text: 'Confirmed by multiple independent sources with no significant contradictions.',
      },
      {
        range: '60–84%',
        label: 'Partially True / Missing Context',
        text: 'The core claim holds, but missing context alters the interpretation.',
      },
      {
        range: '40–59%',
        label: 'Unclear / Inconclusive',
        text: 'Sources are scarce, conflicting, or of uncertain quality. No firm conclusion drawn.',
      },
      {
        range: '0–39%',
        label: 'Likely False',
        text: 'Contradicted by credible sources or built on a demonstrably false premise.',
      },
    ],
    limitsTitle: 'Methodological Limitations',
    /** Split into a heading and its detail so the list can be scanned first. */
    limits: [
      {
        title: 'We verify facts, not opinions',
        text: 'We do not evaluate predictions or value judgments. "X is wrong" cannot receive a score.',
      },
      {
        title: 'If sources are missing, we say "unclear"',
        text: 'For a recent or niche topic the verdict stays "unclear", not "false".',
      },
      {
        title: 'A high score is not a guarantee',
        text: 'It measures how well the claim held up in the sources available at the time of checking.',
      },
      {
        title: 'We do not detect satire reliably',
        text: 'A claim taken from a satirical context may be read literally.',
      },
    ],
    calloutLabel: 'Open code',
    calloutText:
      'This is the methodology the verification runs on. The code that implements it is public and can be followed in the repository.',
    openSourceLead: 'The code implementing all of this is open source. ',
    openSourceLink: 'View the open source page',
  },
  openSourcePage: {
    metadata: {
      title: 'Open Source & Privacy',
      description:
        'Why Verifact code is public under the MIT license and what happens to your data: everything is private.',
    },
    eyebrow: 'Code & Data',
    title: 'Code is public. Your data is not.',
    lead:
      'Two promises that go hand in hand: anyone can audit how Verifact works, and no one can see what you verified.',
    jumpNavAria: 'Sections',
    jumpOpenSource: 'Open source',
    jumpPrivacy: 'Privacy',
    part1Eyebrow: 'Part I',
    part1Title: 'Why the code is open',
    part1Intro:
      'A tool that tells you what is true wields considerable power. The only honest way to hold it is to let anyone inspect how it is used.',
    auditTitle: 'What you can verify yourself',
    auditList: [
      'Which sources are queried and in what order — including the underlying queries.',
      'How the score is calculated, with exact layer weights.',
      'What prompts the AI model receives, and where it can — or cannot — influence the verdict.',
      'Every methodology change, visible in the repository history.',
    ],
    licenseTitle: 'License & Contributions',
    licenseText:
      'Verifact is published under the MIT license: use, modify, and run the code on your own infrastructure, including commercially. Contributions are welcome — especially reports of incorrect verdicts.',
    seeCodeBtn: 'View code on GitHub',
    methodologyLink: 'Verification methodology',
    part2Eyebrow: 'Part II',
    part2Title: 'Privacy',
    calloutLabel: 'In short',
    calloutText:
      'Everything is private — your reports, history, and account. Nothing you verify becomes public unless you click the publish button yourself.',
    collectTitle: 'What we collect',
    collectBullets: {
      noAccStrong: 'Without account:',
      noAccText:
        ' text or URL submitted for verification, used solely to generate the requested report.',
      withAccStrong: 'With account:',
      withAccText:
        ' email address and personal verification history so you can retrieve them.',
      techStrong: 'Technical data',
      techText: ' minimal logs required for operation (e.g. rate limiting).',
    },
    notDoTitle: 'What we do not do',
    notDoBullets: [
      'We never sell or rent data.',
      'We use no advertising trackers and build no user profiles.',
      'We do not publish your verifications or show them to other users.',
      'We do not keep screenshots: the image is used to extract text, then deleted.',
    ],
    controlTitle: 'Your control',
    controlBullets: [
      'You can delete any report from your history at any time.',
      'You can permanently delete your entire account — deleting your account permanently removes associated private reports.',
      'You can publish a report if you want someone to cite it; publishing is always an explicit action by you.',
    ],
    privacyQuestionText:
      'Have a question about your data or want to report a privacy issue? Open a public issue in the ',
    repoLinkText: 'repository',
    orWriteFromText: ' or write to us from ',
    accountLinkText: 'your account',
  },
  confidentialitatePage: {
    metadata: {
      title: 'Privacy Policy',
      description:
        'What data Verifact collects, why, who receives it, and how to exercise your GDPR rights.',
    },
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    leadPrefix: 'Last updated: August 8, 2026. The summary version is on the ',
    shortVersionLink: 'Open Source & Privacy page',
    leadSuffix: '. Below is the complete GDPR-compliant policy.',
    sec1Title: '1. Data Controller',
    sec1Text:
      'Your data is processed by Sebi Iancu, individual developer and administrator of the Verifact project. For any data request, contact ',
    sec2Title: '2. Data We Collect',
    sec2AccountTitle: 'Account',
    sec2AccountList: [
      'Email address and password (encrypted by Supabase Auth, never seen in plaintext by us).',
      'Optional username.',
      'Account tier (free / pro / business).',
      'If you choose a paid plan: Creem stores payment data (card, billing) on their servers. Verifact never sees or stores your card number — we only receive payment confirmation and the subscription ID.',
    ],
    sec2ContentTitle: 'Content Submitted for Verification',
    sec2ContentList: [
      'Text, link, or image submitted by you.',
      'For screenshots: the image is sent to Google Cloud Vision for OCR text extraction and is deleted immediately afterward — we retain only the extracted text.',
      'Your verification history (if logged in): generated report, score, and verdict.',
    ],
    sec2TechTitle: 'Technical Data',
    sec2TechList: [
      'IP address, temporarily used for rate limiting and abuse prevention.',
      'Aggregated traffic statistics via Vercel Analytics — a cookieless service that does not identify individual visitors or track across other sites.',
    ],
    sec2SocialNote: 'If you sign in with Google, we receive only your email address and an account identifier from Google — nothing from the rest of your Google activity.',
    sec3Title: '3. Why We Collect This Data',
    sec3List: [
      'Performance of a contract: to create and manage your account and generate requested reports.',
      'Your consent: to display a public report, but only if you explicitly click the publish button.',
      'Legitimate interest: for caching results (avoiding redundant API costs), security, and aggregate traffic statistics.',
    ],
    sec4Title: '4. Data Recipients',
    sec4Intro: 'To perform verifications, specific data is shared with third-party providers strictly for the stated purpose:',
    sec4Vendors: [
      { name: 'Supabase', desc: 'database and authentication.' },
      { name: 'Google Cloud Vision', desc: 'text extraction from screenshots.' },
      { name: 'Google Gemini', desc: 'AI report synthesis.' },
      { name: 'Google Fact Check Tools / Custom Search', desc: 'searching official & fact-check sources.' },
      { name: 'Tavily', desc: 'web news article searching.' },
      { name: 'Creem', desc: 'payment processing for Pro and Business plans. Receives your card data directly; Verifact never sees it.' },
      { name: 'Vercel', desc: 'application hosting and aggregate analytics.' },
    ],
    sec4Outro:
      'All providers maintain infrastructure in the US/EU; transfers rely on EU Standard Contractual Clauses or the EU-US Data Privacy Framework. No vendor receives more data than necessary — e.g. Tavily only receives extracted keywords from a claim, not your account.',
    sec5Title: '5. Data Retention',
    sec5List: [
      'Account data — retained as long as your account remains active.',
      'Private verifications — retained until deleted by you or upon account deletion.',
      'Published verifications — if you delete your account, the published report remains public but is permanently anonymized.',
      'Payment data — Creem retains it according to their privacy policy and legal tax compliance obligations. Upon account deletion or subscription cancellation, we forward a deletion request to Creem.',
    ],
    sec6Title: '6. Account Deletion',
    sec6Text:
      'You can permanently delete your account directly from your account page — private reports are deleted immediately. Explicitly published reports remain in the public database, anonymized (account links removed permanently). If you have an active subscription, cancel it before deleting your account. Alternatively, contact us at the email above.',
    sec7Title: '7. Your GDPR Rights',
    sec7Intro: 'You have the right to:',
    sec7List: [
      'access your personal data and receive a copy;',
      'request correction of inaccurate data;',
      'request erasure of your data (see Section 6);',
      'object to processing based on legitimate interest;',
      'lodge a complaint with the National Supervisory Authority for Personal Data Processing (ANSPDCP) — dataprotection.ro.',
    ],
    sec7Outro: 'To exercise any right, contact us — we respond within one month.',
    sec8Title: '8. Cookies',
    sec8Text1:
      'We use a single strictly necessary session cookie to keep you authenticated (managed by Supabase). Under the ePrivacy Directive, consent is not required as it is essential for the service explicitly requested.',
    sec8Text2:
      'Vercel Analytics is cookieless and does not build user profiles — which is why we do not display a cookie consent banner. If we ever add tools requiring consent, a cookie banner will be added.',
    sec9Title: '9. Security',
    sec9List: [
      'All web traffic is encrypted via HTTPS/TLS.',
      'Passwords are hashed by Supabase Auth and never stored in cleartext.',
      'Row Level Security (RLS) ensures users can only access their own data.',
      'Images submitted for OCR are processed in memory and never saved to disk.',
    ],
    sec10Title: '10. Policy Changes',
    sec10Text:
      'We may update this policy; the date above reflects the latest revision. Significant changes will be communicated via email or an in-app notice.',
  },
  termeniPage: {
    metadata: {
      title: 'Terms of Service',
      description:
        'Verifact Terms of Service: service scope, algorithm limitations, and liability terms.',
    },
    eyebrow: 'Legal',
    title: 'Terms of Service',
    lead: 'Last updated: August 8, 2026. By using Verifact, you agree to the terms below.',
    intro:
      'Verifact is operated by Sebi Iancu, individual developer, as an open-source project ("We", "Operator"). These terms govern your access to and use of the Verifact web application ("Service"). If you disagree with them, please do not use the Service.',
    sec1Title: '1. What the Service Is',
    sec1Text1:
      'Verifact is a tool that receives text, a link, or a screenshot and generates an automated report regarding the veracity of the claim by aggregating news media, fact-checking databases, official sources, and search results synthesized by an AI model.',
    sec1Text2Prefix: 'Accounts are free with a monthly verification limit. Pro and Business plans, displayed on the ',
    pricingLinkText: 'pricing page',
    sec1Text2Suffix: ', increase that limit and are available as monthly or yearly subscriptions, processed through Creem.',
    sec2Title: '2. Minimum Age',
    sec2Text:
      'You must be at least 16 years old to create a free account and at least 18 years old to request a paid plan, in accordance with information society service regulations.',
    sec3Title: '3. Disclaimer — Algorithm Limitations',
    sec3Text1Strong: 'Read this section carefully. ',
    sec3Text1Text:
      'Verifact reports are for informational purposes only. They are generated automatically by an algorithm and AI model from third-party sources, and do NOT constitute an official, legal, or definitive journalistic verdict, nor legal, medical, or financial advice.',
    sec3Text2:
      'The algorithm can make mistakes: it may label a true claim as uncertain or false (false positive) or a false claim as true (false negative). We do not guarantee accuracy, completeness, or timeliness. You are responsible for interpreting and using a report — verify cited sources before drawing conclusions.',
    sec3Text3Prefix: 'The exact methodology and known limitations are public on the ',
    transparencyLinkText: 'Transparency',
    sec3Text3Suffix: ' page.',
    sec4Title: '4. Acceptable Use',
    sec4Intro: 'You may not use the Service to:',
    sec4List: [
      'submit illegal, defamatory, or hate-inciting content;',
      'attempt deliberate manipulation of the algorithm to obtain false verdicts for propaganda or disinformation;',
      'bypass rate limits, security measures, or account restrictions;',
      'attack infrastructure (abusive scraping, reverse engineering, unauthorized access attempts).',
    ],
    sec5Title: '5. Payments and Subscriptions',
    sec5Intro:
      'Paid plans (Pro, Business) are available as monthly or yearly subscriptions, processed through Creem (creem.io), our payment provider. Verifact does not store or process your card data — it is handled entirely by Creem, in compliance with PCI DSS standards.',
    sec5RenewalTitle: 'Automatic Renewal',
    sec5RenewalText:
      'Subscriptions renew automatically at the end of each billing period (month or year) at the price shown at the time of renewal. You can cancel renewal at any time from your account; Pro features remain active until the end of the paid period.',
    sec5RefundTitle: 'Refunds',
    sec5RefundText:
      'If you have not used any verifications from your paid plan during the current billing period, you can request a full refund by writing to us within the first 14 days of activation. After your first verification or after 14 days, we no longer issue refunds — but you can cancel automatic renewal at any time.',
    sec5PriceTitle: 'Price Changes',
    sec5PriceText:
      'We may change paid plan prices. We will notify you by email at least 30 days before the new price takes effect. If you disagree, you can cancel your subscription before the next renewal.',
    sec6Title: '6. Open Source & Your Content',
    sec6Text1Prefix: 'Source code is published under the MIT license (Copyright (c) 2026 Sebi Iancu) in the ',
    repoLinkText: 'official repository',
    sec6Text1Suffix: '. The license covers code, not the "Verifact" name, infrastructure, or database.',
    sec6Text2Prefix: 'You retain rights to text submitted for verification. By submitting it, you grant permission to process it — and transmit it to third-party providers listed in the ',
    privacyLinkText: 'Privacy Policy',
    sec6Text2Suffix: ' — strictly to generate the requested report. If you explicitly choose to publish a report, you grant permission to display it anonymized in the public section.',
    sec6Text3:
      'If you upload a screenshot of content owned by others, you warrant doing so for personal verification under quotation/fair dealing rights. The image is used solely for OCR text extraction and is deleted immediately after.',
    sec7Title: '7. Intellectual Property',
    sec7Text:
      'The name "Verifact", the logo, interface design, and visual identity are the property of the Operator. The MIT license applicable to the source code does not extend to these elements. You may not use the Verifact name or visual identity in a manner that would suggest affiliation, endorsement, or association with the Operator, without our prior written consent.',
    sec8Title: '8. Report Disputes',
    sec8TextPrefix: 'If you find a factual error in a report, you can use the "Report error" button in the report, open a ',
    issueLinkText: 'GitHub issue',
    sec8TextSuffix: ', or contact us at the address in the Contact section. We read every message; your dispute will be recorded and the report flagged for re-verification.',
    sec9Title: '9. Service Availability',
    sec9Text:
      'Verifact is provided "as is", with no guarantees of uninterrupted operation. We aim for high availability, but planned or unplanned downtime may occur. We are not liable for losses caused by temporary unavailability of the Service.',
    sec10Title: '10. Limitation of Liability',
    sec10Text:
      'To the extent permitted by law, we are not liable for indirect, incidental, or consequential damages (loss of profit, data, or reputation) arising from use of the Service, from errors in automatically generated reports, or from decisions you make based on them. Our total liability to you, for any claim related to these terms, is limited to the amount you paid in the last 12 months, or 100 RON, whichever is greater.',
    sec11Title: '11. Your Account',
    sec11TextPrefix: 'You may stop using the Service at any time. Your right to permanently delete your account and associated data is described in the ',
    sec11PrivacyLinkText: 'Privacy Policy',
    sec11TextSuffix: '. We reserve the right to suspend accounts that repeatedly violate Section 4.',
    sec12Title: '12. Modifications',
    sec12Text:
      'We may modify these terms; the date above indicates the latest revision. Continued use of the Service constitutes agreement to updated terms. If we make a significant change, we will notify you by email or through a visible notice in the app.',
    sec13Title: '13. Governing Law and Disputes',
    sec13Text: 'These terms are governed by Romanian law. Any dispute is subject to competent courts in Romania. The parties will first attempt amicable resolution within 30 days of notification.',
    sec14Title: '14. Contact',
    sec14Text: 'For questions regarding these terms, write to ',
  },
};
