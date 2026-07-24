/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

describe('Input and Textarea Primitive Components', () => {
  it('renders Input with mandatory label and handles text change', () => {
    const handleChange = jest.fn();
    render(<Input label="Adresă Email" value="test@example.com" onChange={handleChange} />);

    const input = screen.getByLabelText(/adresă email/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('test@example.com');

    fireEvent.change(input, { target: { value: 'new@example.com' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('displays error message and sets aria-invalid on Input', () => {
    render(<Input label="URL" error="Format URL nevalid" />);
    const input = screen.getByLabelText(/url/i);

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Format URL nevalid');
  });

  it('renders Textarea with character counter', () => {
    render(
      <Textarea
        label="Text Afirmație"
        value="Text de test"
        onChange={() => {}}
        characterCount={{ current: 12, max: 2000 }}
      />
    );

    expect(screen.getByLabelText(/text afirmație/i)).toBeInTheDocument();
    expect(screen.getByText('12/2000')).toBeInTheDocument();
  });
});
