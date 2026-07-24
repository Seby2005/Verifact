/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

describe('Card and Badge Primitive Components', () => {
  it('renders Card with interactive variant', () => {
    const { container } = render(
      <Card variant="interactive">
        <p>Conținut Card</p>
      </Card>
    );

    expect(screen.getByText('Conținut Card')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('interactive');
  });

  it('renders Badge with true verdict variant and default label', () => {
    render(<Badge variant="true" />);
    expect(screen.getByText(/probabil adevărat/i)).toBeInTheDocument();
  });

  it('renders Badge with custom label and false verdict variant', () => {
    render(<Badge variant="false">DEZMINȚIT</Badge>);
    expect(screen.getByText('DEZMINȚIT')).toBeInTheDocument();
  });
});
