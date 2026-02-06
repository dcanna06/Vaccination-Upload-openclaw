import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmationDialog } from '../ConfirmationDialog';

const mockRecords = [
  {
    recordId: 'r1',
    rowNumber: 2,
    reason: 'Individual not found',
    airMessage: 'AIR-W-1004: Individual not found on AIR',
    claimId: 'WC297@+5',
    claimSequenceNumber: '1',
  },
  {
    recordId: 'r2',
    rowNumber: 5,
    reason: 'Pended episodes',
    airMessage: 'AIR-W-1008: Some encounters not recorded',
    claimId: 'WC298@+6',
  },
];

describe('ConfirmationDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all records', () => {
    render(
      <ConfirmationDialog
        records={mockRecords}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );
    expect(screen.getByText('Row 2')).toBeTruthy();
    expect(screen.getByText('Row 5')).toBeTruthy();
  });

  it('displays AIR messages', () => {
    render(
      <ConfirmationDialog
        records={mockRecords}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );
    expect(screen.getByText(/AIR-W-1004/)).toBeTruthy();
    expect(screen.getByText(/AIR-W-1008/)).toBeTruthy();
  });

  it('displays claim IDs', () => {
    render(
      <ConfirmationDialog
        records={mockRecords}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );
    expect(screen.getByText(/WC297@\+5/)).toBeTruthy();
  });

  it('all records selected by default', () => {
    render(
      <ConfirmationDialog
        records={mockRecords}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );
    expect(screen.getByText(/2 of 2 selected/)).toBeTruthy();
  });

  it('toggles select all', () => {
    render(
      <ConfirmationDialog
        records={mockRecords}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );
    const selectAll = screen.getByTestId('select-all');
    fireEvent.click(selectAll); // deselect all
    expect(screen.getByText(/0 of 2 selected/)).toBeTruthy();
  });

  it('confirms selected records', () => {
    render(
      <ConfirmationDialog
        records={mockRecords}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );
    fireEvent.click(screen.getByText(/Confirm 2 Records/));
    expect(mockOnConfirm).toHaveBeenCalledWith(['r1', 'r2']);
  });

  it('cancel button works', () => {
    render(
      <ConfirmationDialog
        records={mockRecords}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('confirm button disabled when none selected', () => {
    render(
      <ConfirmationDialog
        records={mockRecords}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />,
    );
    // Deselect all
    fireEvent.click(screen.getByTestId('select-all'));
    const confirmBtn = screen.getByText(/Confirm 0/);
    expect(confirmBtn).toHaveProperty('disabled', true);
  });

  it('shows submitting state', () => {
    render(
      <ConfirmationDialog
        records={mockRecords}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isSubmitting
      />,
    );
    expect(screen.getByText('Confirming...')).toBeTruthy();
  });
});
