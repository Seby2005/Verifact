/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { I18nProvider } from '@/i18n';

describe('LanguageSwitcher Component', () => {
  it('renders dropdown with only Romanian and English options', () => {
    render(
      <I18nProvider>
        <LanguageSwitcher variant="dropdown" />
      </I18nProvider>
    );

    const select = screen.getByRole('combobox', { name: /selectează limba/i });
    expect(select).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options.length).toBe(2);
    expect(options[0]).toHaveValue('ro');
    expect(options[1]).toHaveValue('en');
  });

  it('renders button group mode with Romanian and English buttons', () => {
    render(
      <I18nProvider>
        <LanguageSwitcher variant="buttons" />
      </I18nProvider>
    );

    const roBtn = screen.getByRole('radio', { name: /română/i });
    const enBtn = screen.getByRole('radio', { name: /english/i });

    expect(roBtn).toBeInTheDocument();
    expect(enBtn).toBeInTheDocument();

    fireEvent.click(enBtn);
    expect(enBtn).toHaveAttribute('aria-checked', 'true');
  });
});
