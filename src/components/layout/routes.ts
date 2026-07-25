/** Single source of truth for site navigation, shared by Header and Footer. */

export interface NavLink {
  href: string;
  label: string;
}

/** Primary nav — kept to three items so the header stays a masthead, not a menu. */
export const NAV_LINKS: ReadonlyArray<NavLink> = [
  { href: '/rapoarte', label: 'Rapoarte' },
  { href: '/transparenta', label: 'Transparență' },
  { href: '/preturi', label: 'Prețuri' },
];

/** Everything reachable from the footer, grouped by column. */
export const FOOTER_SECTIONS: ReadonlyArray<{ title: string; links: ReadonlyArray<NavLink> }> = [
  {
    title: 'Produs',
    links: [
      { href: '/', label: 'Verifică o afirmație' },
      { href: '/rapoarte', label: 'Rapoarte' },
      { href: '/preturi', label: 'Prețuri' },
      { href: '/cont', label: 'Cont' },
    ],
  },
  {
    title: 'Proiect',
    links: [
      { href: '/misiune', label: 'Misiune' },
      { href: '/transparenta', label: 'Transparență' },
      { href: '/open-source', label: 'Open source și confidențialitate' },
    ],
  },
];

export const REPO_URL = 'https://github.com/Seby2005/fact-checker-ai';
