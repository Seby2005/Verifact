import React from 'react';
import { Hero, AnimatedStats, HowItWorks, ImpactStats, Testimonials, FinalCTA } from '@/components/home';

describe('Home Page Components', () => {
  it('exports all home section components correctly', () => {
    expect(Hero).toBeDefined();
    expect(AnimatedStats).toBeDefined();
    expect(HowItWorks).toBeDefined();
    expect(ImpactStats).toBeDefined();
    expect(Testimonials).toBeDefined();
    expect(FinalCTA).toBeDefined();
  });
});
