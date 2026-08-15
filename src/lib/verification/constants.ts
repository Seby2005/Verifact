/**
 * Credibility scores for known news sources.
 * Scale: 0-1 (1 = highest credibility)
 */
export const SOURCE_CREDIBILITY: Record<string, number> = {
  // International wire services (highest credibility)
  'reuters.com': 1.0,
  'apnews.com': 0.98,
  'afp.com': 0.97,

  // International quality press
  'bbc.com': 0.95,
  'bbc.co.uk': 0.95,
  'ft.com': 0.93,
  'nytimes.com': 0.92,
  'theguardian.com': 0.91,
  'euractiv.com': 0.90,

  // French quality press & fact-checkers
  'lemonde.fr': 0.95,
  'lefigaro.fr': 0.92,
  'liberation.fr': 0.91,
  'france24.com': 0.93,
  'francetvinfo.fr': 0.92,
  'rfi.fr': 0.90,
  'leparisien.fr': 0.88,
  'lexpress.fr': 0.88,
  'lepoint.fr': 0.87,

  // Romanian quality press
  'g4media.ro': 0.92,
  'pressone.ro': 0.91,
  'recorder.ro': 0.90,
  'hotnews.ro': 0.90,
  'mediafax.ro': 0.87,
  'digi24.ro': 0.88,
  'protv.ro': 0.85,
  'stiripesurse.ro': 0.82,
  'adevarul.ro': 0.78,

  // Semi-credible (lower score but included)
  'antena3.ro': 0.60,
  'realitatea.net': 0.58,
  'jurnalul.ro': 0.62,

  // Default for unknown sources
  'default': 0.40,
};

/**
 * Known official domains and their organization names.
 */
export const OFFICIAL_DOMAINS: Record<string, { name: string; type: 'government' | 'international_org' | 'health_org' | 'statistics' }> = {
  // Romanian government
  'gov.ro': { name: 'Guvernul României', type: 'government' },
  'presidency.ro': { name: 'Președinția României', type: 'government' },
  'senat.ro': { name: 'Senatul României', type: 'government' },
  'cdep.ro': { name: 'Camera Deputaților', type: 'government' },
  'ms.ro': { name: 'Ministerul Sănătății', type: 'government' },
  'mai.gov.ro': { name: 'Ministerul Afacerilor Interne', type: 'government' },
  'mfinante.gov.ro': { name: 'Ministerul Finanțelor', type: 'government' },
  'insse.ro': { name: 'Institutul Național de Statistică', type: 'statistics' },
  'anaf.ro': { name: 'ANAF', type: 'government' },
  'bnr.ro': { name: 'Banca Națională a României', type: 'government' },
  'politiaromana.ro': { name: 'Poliția Română', type: 'government' },
  'consiliulconcurentei.ro': { name: 'Consiliul Concurenței', type: 'government' },

  // French government & institutions
  'service-public.fr': { name: 'Service-Public.fr', type: 'government' },
  'legifrance.gouv.fr': { name: 'Légifrance', type: 'government' },
  'gouvernement.fr': { name: 'Gouvernement Français', type: 'government' },
  'elysee.fr': { name: 'Présidence de la République', type: 'government' },
  'insee.fr': { name: 'INSEE', type: 'statistics' },
  'santepubliquefrance.fr': { name: 'Santé Publique France', type: 'health_org' },
  'interieur.gouv.fr': { name: 'Ministère de l’Intérieur', type: 'government' },
  'economie.gouv.fr': { name: 'Ministère de l’Économie', type: 'government' },

  // European institutions
  'europa.eu': { name: 'Uniunea Europeană', type: 'international_org' },
  'ec.europa.eu': { name: 'Comisia Europeană', type: 'international_org' },
  'europarl.europa.eu': { name: 'Parlamentul European', type: 'international_org' },
  'consilium.europa.eu': { name: 'Consiliul Europei', type: 'international_org' },

  // International organizations
  'who.int': { name: 'Organizația Mondială a Sănătății', type: 'health_org' },
  'un.org': { name: 'Organizația Națiunilor Unite', type: 'international_org' },
  'worldbank.org': { name: 'Banca Mondială', type: 'international_org' },
  'oecd.org': { name: 'OCDE', type: 'international_org' },
  'nato.int': { name: 'NATO', type: 'international_org' },
};

/**
 * Romanian public figures for entity extraction in Layer 4.
 */
export const ROMANIAN_PUBLIC_FIGURES: string[] = [
  // Presidents / PM
  'Klaus Iohannis',
  'Marcel Ciolacu',
  'Nicolae Ciucă',
  'Victor Ponta',
  'Călin Popescu-Tăriceanu',
  // Opposition / Other parties
  'Elena Lasconi',
  'George Simion',
  'Călin Georgescu',
  'Dan Barna',
  'Cătălin Drulă',
  'Rareș Bogdan',
  'Ion Marian Murgulescu',
  // Mayors
  'Nicușor Dan',
  'Gabriela Firea',
  'Emil Boc',
  // International
  'Ursula von der Leyen',
  'Roberta Metsola',
];

/**
 * Negative sentiment keywords (RO + EN + FR) indicating the article contradicts a claim.
 */
export const CONTRADICTION_KEYWORDS_RO = [
  'fals', 'falsă', 'fals,', 'dezminţit', 'dezminţire', 'dezminţeşte',
  'incorect', 'incorectă', 'neadevărat', 'fake', 'fabricat', 'inventat',
  'manipulare', 'dezinformare', 'contrazis', 'infirmat', 'negat',
];

export const CONTRADICTION_KEYWORDS_EN = [
  'false', 'fake', 'disproven', 'debunked', 'misleading', 'incorrect',
  'fabricated', 'hoax', 'misinformation', 'disinformation', 'contradiction',
];

export const CONTRADICTION_KEYWORDS_FR = [
  'faux', 'fausse', 'démenti', 'dément', 'infondé', 'intox', 'trompeur',
  'mensonge', 'désinformation', 'manipulation', 'non vérifié', 'douteux',
];

/**
 * Confirmation keywords indicating the article supports a claim.
 */
export const CONFIRMATION_KEYWORDS_RO = [
  'confirmat', 'confirmă', 'adevărat', 'verificat', 'real', 'corect',
  'autentic', 'oficial', 'dovedit', 'probat',
];

export const CONFIRMATION_KEYWORDS_EN = [
  'confirmed', 'true', 'verified', 'real', 'correct', 'proven',
  'authentic', 'official', 'accurate',
];

export const CONFIRMATION_KEYWORDS_FR = [
  'confirmé', 'confirme', 'vrai', 'vérifié', 'authentique', 'officiel',
  'avéré', 'exact', 'prouvé',
];

/**
 * Debunk-framing phrases, checked before the contradiction/confirmation
 * keyword lists above and winning outright when present.
 */
export const DEBUNK_MARKERS = [
  'fals', 'falsă', 'falsa', 'dezinformare', 'dezmințit', 'dezmintit', 'dezmințire',
  'mit', 'mitul', 'nu există dovezi', 'nu exista dovezi', 'fără dovezi', 'fara dovezi',
  'teorie a conspirației', 'teoria conspirației', 'conspirație', 'conspiratie',
  'debunk', 'debunked', 'myth', 'hoax', 'no evidence', 'without evidence',
  'baseless', 'unfounded', 'misinformation', 'disinformation', 'conspiracy theory',
  'fact check', 'fact-check', 'falsely', 'false claim', 'not true',
  'faux', 'fausse', 'intox', 'démenti', 'désinformation', 'aucune preuve',
  'sans preuve', 'théorie du complot', 'complotisme', 'infondé', 'trompeur',
];

/**
 * Layer weights for the scoring algorithm.
 */
export const LAYER_WEIGHTS = {
  layer1: 0.35,  // Fact-check databases
  layer2: 0.30,  // News sources
  layer3: 0.25,  // Official/government sources
  layer4: 0.10,  // Social media
} as const;

/**
 * Cache TTL in days.
 */
export const CACHE_TTL_DAYS = 7;
