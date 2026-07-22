import React from 'react';
import { Button, Input, Card, Badge } from '@/components/ui';
import { Navbar, Footer } from '@/components/layout';

describe('Design System UI & Layout Components', () => {
  it('exports all primitive UI components correctly', () => {
    expect(Button).toBeDefined();
    expect(Input).toBeDefined();
    expect(Card).toBeDefined();
    expect(Badge).toBeDefined();
  });

  it('exports layout components correctly', () => {
    expect(Navbar).toBeDefined();
    expect(Footer).toBeDefined();
  });
});
