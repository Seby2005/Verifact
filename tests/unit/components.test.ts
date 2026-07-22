import React from 'react';
import { Button, Input, Card, Badge } from '@/components/ui';

describe('Design System UI Components', () => {
  it('exports all primitive UI components correctly', () => {
    expect(Button).toBeDefined();
    expect(Input).toBeDefined();
    expect(Card).toBeDefined();
    expect(Badge).toBeDefined();
  });
});
