'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import styles from './Navbar.module.css';

export interface NavbarProps {
  isAuthenticated?: boolean;
  userInitials?: string;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = (): void => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
    setIsDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
        setIsDropdownOpen(false);
      }
    };

    if (isMobileOpen || isDropdownOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, isDropdownOpen]);

  const navLinks = [
    { href: '/', label: 'Acasă' },
    { href: '/reports', label: 'Rapoarte' },
    { href: '/transparency', label: 'Transparență' },
    { href: '/pricing', label: 'Prețuri' },
  ];

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'FC';

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        {/* Brand Logo */}
        <Link href="/" className={styles.brand} aria-label="FactCheck AI Pagina principală">
          <svg
            className={styles.logoIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>FactCheck AI</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.desktopNav} aria-label="Navigare principală">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions (Desktop) */}
        <div className={styles.actions}>
          <Link href="/#verify-section">
            <Button variant="primary" size="sm">
              Verifică acum
            </Button>
          </Link>

          {isLoading ? (
            <div className={styles.skeleton} />
          ) : !isAuthenticated ? (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Intră în cont
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="sm">
                  Înregistrare
                </Button>
              </Link>
            </>
          ) : (
            <div className={styles.userMenu}>
              <button
                type="button"
                className={styles.avatarBtn}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-label="Meniu utilizator"
                aria-expanded={isDropdownOpen}
              >
                {userInitials}
              </button>
              {isDropdownOpen && (
                <div className={styles.dropdown} role="menu">
                  <div className={styles.dropdownHeader}>
                    <div className={styles.userName}>
                      👤 {user?.username || user?.email?.split('@')[0]}
                    </div>
                    <div className={styles.userEmail}>{user?.email}</div>
                    <div className={styles.userUsageBadge}>
                      [{user?.tier?.toUpperCase()}] {user?.verificationsCount}/{user?.verificationsLimit} folosit
                    </div>
                  </div>

                  <Link href="/dashboard" className={styles.dropdownItem} role="menuitem">
                    Dashboard
                  </Link>
                  <Link href="/settings" className={styles.dropdownItem} role="menuitem">
                    Setări cont
                  </Link>
                  <Link href="/pricing" className={`${styles.dropdownItem} ${styles.upgradeLink}`} role="menuitem">
                    Upgrade la Pro →
                  </Link>

                  <div className={styles.dropdownDivider} />

                  <button
                    type="button"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut();
                    }}
                  >
                    Deconectare
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className={`${styles.hamburger} ${isMobileOpen ? styles.open : ''}`}
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label={isMobileOpen ? 'Închide meniul' : 'Deschide meniul de navigare'}
          aria-expanded={isMobileOpen}
          aria-controls="mobile-navigation"
        >
          <span className={styles.bar} />
          <span className={styles.bar} />
          <span className={styles.bar} />
        </button>
      </div>

      {/* Mobile Dropdown & Overlay */}
      {isMobileOpen && (
        <>
          <div
            className={styles.overlay}
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="mobile-navigation"
            className={styles.mobileMenu}
            aria-label="Navigare mobilă"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.mobileNavLink} ${isActive ? styles.mobileActiveLink : ''}`}
                  onClick={() => setIsMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className={styles.mobileActions}>
              <Link href="/#verify-section" onClick={() => setIsMobileOpen(false)}>
                <Button variant="primary" fullWidth size="md">
                  Verifică acum
                </Button>
              </Link>
              {!isAuthenticated ? (
                <>
                  <Link href="/login" onClick={() => setIsMobileOpen(false)}>
                    <Button variant="outline" fullWidth size="md">
                      Intră în cont
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsMobileOpen(false)}>
                    <Button variant="secondary" fullWidth size="md">
                      Înregistrare
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/dashboard" onClick={() => setIsMobileOpen(false)}>
                    <Button variant="outline" fullWidth size="md">
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    fullWidth
                    size="md"
                    onClick={() => {
                      setIsMobileOpen(false);
                      signOut();
                    }}
                  >
                    Deconectare
                  </Button>
                </>
              )}
            </div>
          </nav>
        </>
      )}
    </header>
  );
};
