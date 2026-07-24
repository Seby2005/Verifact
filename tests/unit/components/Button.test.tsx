/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/Button';

describe('Button Primitive Component', () => {
  it('renders button label correctly', () => {
    render(<Button>Verifică</Button>);
    expect(screen.getByRole('button', { name: /verifică/i })).toBeInTheDocument();
  });

  it('applies primary variant and md size classes', () => {
    const { container } = render(<Button variant="primary" size="md">Click</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('primary');
    expect(button).toHaveClass('md');
  });

  it('handles loading state and disables interaction', () => {
    const handleClick = jest.fn();
    render(<Button isLoading onClick={handleClick}>Trimite</Button>);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('triggers onClick handler when enabled', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Acțiune</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
