/** Single source of truth for site navigation, shared by Header and Footer. */

export interface NavLink {
  href: string;
  label: string;
}

/** Primary nav — kept to three items so the header stays a masthead, not a menu. */
export const NAV_LINKS: ReadonlyArray<NavLink> = [
  { href: '/despre-dezinformare', label: 'Dezinformare' },
  { href: '/transparenta', label: 'Transparență' },
  { href: '/preturi', label: 'Prețuri' },
];

/** Everything reachable from the footer, grouped by column. */
export const FOOTER_SECTIONS: ReadonlyArray<{ title: string; links: ReadonlyArray<NavLink> }> = [
  {
    title: 'Produs',
    links: [
      { href: '/', label: 'Verifică o afirmație' },
      { href: '/rapoarte', label: 'Rapoarte publice' },
      { href: '/preturi', label: 'Prețuri' },
      { href: '/cont', label: 'Cont' },
    ],
  },
  {
    title: 'Proiect',
    links: [
      { href: '/despre-dezinformare', label: 'Despre dezinformare' },
      { href: '/resurse', label: 'Resurse și ghiduri' },
      { href: '/misiune', label: 'Misiune' },
      { href: '/transparenta', label: 'Transparență' },
      { href: '/open-source', label: 'Open source și confidențialitate' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/termeni', label: 'Termeni și condiții' },
      { href: '/confidentialitate', label: 'Politica de confidențialitate' },
    ],
  },
];

export const REPO_URL = 'https://github.com/Seby2005/Verifact';
