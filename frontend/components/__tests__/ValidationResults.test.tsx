import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ValidationResults } from '../ValidationResults';

const mockErrors = [
  { rowNumber: 2, field: 'gender', errorCode: 'AIR-E-1017', message: 'Invalid gender', value: 'X' },
  { rowNumber: 3, field: 'dateOfBirth', errorCode: 'AIR-E-1018', message: 'Future date', value: '2030-01-01' },
  { rowNumber: 5, field: 'gender', errorCode: 'AIR-E-1017', message: 'Invalid gender', value: 'Z' },
];

describe('ValidationResults', () => {
  it('renders summary counts', () => {
    render(
      <ValidationResults
        totalRecords={10}
        validRecords={7}
        invalidRecords={3}
        errors={mockErrors}
      />,
    );
    expect(screen.getByText('Total Records')).toBeTruthy();
    expect(screen.getByText('Valid')).toBeTruthy();
    expect(screen.getByText('Invalid')).toBeTruthy();
  });

  it('renders error table', () => {
    render(
      <ValidationResults
        totalRecords={10}
        validRecords={7}
        invalidRecords={3}
        errors={mockErrors}
      />,
    );
    expect(screen.getByTestId('error-table')).toBeTruthy();
    expect(screen.getAllByText('Invalid gender').length).toBe(2);
  });

  it('sorts by row number', () => {
    render(
      <ValidationResults
        totalRecords={10}
        validRecords={7}
        invalidRecords={3}
        errors={mockErrors}
      />,
    );
    const rows = screen.getByTestId('error-table').querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  it('filters by field', () => {
    render(
      <ValidationResults
        totalRecords={10}
        validRecords={7}
        invalidRecords={3}
        errors={mockErrors}
      />,
    );
    const filter = screen.getByTestId('field-filter') as HTMLSelectElement;
    fireEvent.change(filter, { target: { value: 'gender' } });
    const rows = screen.getByTestId('error-table').querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
  });

  it('shows proceed button when valid', () => {
    const onProceed = vi.fn();
    render(
      <ValidationResults
        totalRecords={10}
        validRecords={10}
        invalidRecords={0}
        errors={[]}
        onProceed={onProceed}
      />,
    );
    const btn = screen.getByText('Proceed to Submit');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onProceed).toHaveBeenCalled();
  });

  it('hides proceed button when invalid records exist', () => {
    render(
      <ValidationResults
        totalRecords={10}
        validRecords={7}
        invalidRecords={3}
        errors={mockErrors}
      />,
    );
    expect(screen.queryByText('Proceed to Submit')).toBeNull();
  });

  it('shows all valid message when no errors', () => {
    render(
      <ValidationResults
        totalRecords={5}
        validRecords={5}
        invalidRecords={0}
        errors={[]}
      />,
    );
    expect(screen.getByText(/all records passed validation/i)).toBeTruthy();
  });

  it('shows export button when errors exist', () => {
    const onExport = vi.fn();
    render(
      <ValidationResults
        totalRecords={10}
        validRecords={7}
        invalidRecords={3}
        errors={mockErrors}
        onExportErrors={onExport}
      />,
    );
    const btn = screen.getByText('Export Errors');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onExport).toHaveBeenCalled();
  });
});
