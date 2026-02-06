import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResultsSummary } from '../ResultsSummary';

const mockResults = [
  {
    recordId: 'r1',
    originalRow: 2,
    status: 'success' as const,
    claimId: 'WC297@+5',
  },
  {
    recordId: 'r2',
    originalRow: 3,
    status: 'confirmed' as const,
    claimId: 'WC298@+6',
  },
  {
    recordId: 'r3',
    originalRow: 5,
    status: 'failed' as const,
    errorCode: 'AIR-E-1023',
    errorMessage: 'Invalid vaccine code',
  },
];

describe('ResultsSummary', () => {
  const baseProps = {
    submissionId: 'sub-123',
    completedAt: '2026-02-07 11:00',
    totalRecords: 3,
    successful: 1,
    failed: 1,
    confirmed: 1,
    results: mockResults,
  };

  it('renders summary counts', () => {
    render(<ResultsSummary {...baseProps} />);
    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getByText('Successful')).toBeTruthy();
    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.getByText('Confirmed')).toBeTruthy();
  });

  it('renders submission ID', () => {
    render(<ResultsSummary {...baseProps} />);
    expect(screen.getByText('sub-123')).toBeTruthy();
  });

  it('renders claim IDs table', () => {
    render(<ResultsSummary {...baseProps} />);
    expect(screen.getByTestId('claim-table')).toBeTruthy();
    expect(screen.getByText('WC297@+5')).toBeTruthy();
    expect(screen.getByText('WC298@+6')).toBeTruthy();
  });

  it('renders failed records table', () => {
    render(<ResultsSummary {...baseProps} />);
    expect(screen.getByTestId('failed-table')).toBeTruthy();
    expect(screen.getByText('AIR-E-1023')).toBeTruthy();
    expect(screen.getByText('Invalid vaccine code')).toBeTruthy();
  });

  it('export button works', () => {
    const onExport = vi.fn();
    render(<ResultsSummary {...baseProps} onExport={onExport} />);
    fireEvent.click(screen.getByText('Export Report'));
    expect(onExport).toHaveBeenCalled();
  });

  it('new upload button works', () => {
    const onNew = vi.fn();
    render(<ResultsSummary {...baseProps} onNewUpload={onNew} />);
    fireEvent.click(screen.getByText('New Upload'));
    expect(onNew).toHaveBeenCalled();
  });

  it('shows completed time', () => {
    render(<ResultsSummary {...baseProps} />);
    expect(screen.getByText(/2026-02-07/)).toBeTruthy();
  });
});
