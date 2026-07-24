/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Tabs } from '@/components/ui/Tabs';
import { ProgressBar } from '@/components/ui/ProgressBar';

describe('Tabs and ProgressBar Primitive Components', () => {
  it('renders Tabs with keyboard navigation', () => {
    const handleChange = jest.fn();
    const items = [
      { id: 't1', label: 'Tab 1', content: <p>Panel 1</p> },
      { id: 't2', label: 'Tab 2', content: <p>Panel 2</p> },
    ];

    render(<Tabs items={items} activeTabId="t1" onChange={handleChange} />);

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    expect(tab1).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(tab1, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith('t2');
  });

  it('renders circular ProgressBar with correct score and ARIA value', () => {
    render(<ProgressBar variant="circular" value={88} label="Scor" />);
    const progressbar = screen.getByRole('progressbar');

    expect(progressbar).toHaveAttribute('aria-valuenow', '88');
    expect(screen.getByText('88%')).toBeInTheDocument();
  });
});
