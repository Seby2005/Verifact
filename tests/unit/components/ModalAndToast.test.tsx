/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal } from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';

const TestToastComponent = () => {
  const { toast } = useToast();
  return (
    <button onClick={() => toast({ type: 'success', message: 'Notificare succes' })}>
      Afișează Toast
    </button>
  );
};

describe('Modal and Toast Primitive Components', () => {
  it('renders Modal when isOpen is true and triggers onClose on Escape', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Titlu Modal">
        <p>Conținut Modal</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Titlu Modal')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('triggers Toast notification on action', () => {
    render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Afișează Toast'));
    expect(screen.getByRole('status')).toHaveTextContent('Notificare succes');
  });
});
