/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';

describe('Misc Primitive Components (Select, Skeleton, EmptyState, Avatar)', () => {
  it('renders Select dropdown and changes option', () => {
    const handleChange = jest.fn();
    const options = [
      { value: 'ro', label: 'Română' },
      { value: 'en', label: 'Engleză' },
    ];

    render(<Select options={options} value="ro" onChange={handleChange} />);

    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();

    fireEvent.click(combobox);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Engleză'));
    expect(handleChange).toHaveBeenCalledWith('en');
  });

  it('renders Skeleton shimmer loading element', () => {
    const { container } = render(<Skeleton variant="card" />);
    expect(container.firstChild).toHaveClass('skeleton');
    expect(container.firstChild).toHaveClass('card');
  });

  it('renders EmptyState with title and description', () => {
    render(<EmptyState title="Fără date" description="Nu s-au găsit rezultate." />);
    expect(screen.getByText('Fără date')).toBeInTheDocument();
    expect(screen.getByText('Nu s-au găsit rezultate.')).toBeInTheDocument();
  });

  it('renders Avatar with user initials derived from email', () => {
    render(<Avatar name="marian.popa@example.com" size="md" />);
    expect(screen.getByText('MA')).toBeInTheDocument();
  });
});
