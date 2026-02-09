import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RecordCard } from '../RecordCard';
import type { SubmissionResultRecord } from '@/types/submission';

const makeRecord = (overrides: Partial<SubmissionResultRecord> = {}): SubmissionResultRecord => ({
  rowNumber: 1,
  individual: {
    firstName: 'John',
    lastName: 'Smith',
    dob: '01011990',
    gender: 'M',
    medicare: '2950301611',
    irn: '1',
  },
  encounter: {
    dateOfService: '01022026',
    vaccineCode: 'COVAST',
    vaccineDose: '1',
    vaccineBatch: 'FL1234',
    vaccineType: 'NIP',
    routeOfAdministration: 'IM',
    providerNumber: '2426621B',
  },
  status: 'SUCCESS',
  airStatusCode: 'AIR-I-1007',
  airMessage: 'All encounter(s) processed successfully.',
  errors: [],
  episodes: [],
  actionRequired: 'NONE',
  resubmitCount: 0,
  ...overrides,
});

describe('RecordCard', () => {
  it('renders collapsed header with name and status', () => {
    render(<RecordCard record={makeRecord()} />);
    expect(screen.getByText('John Smith')).toBeTruthy();
    expect(screen.getByText('Success')).toBeTruthy();
  });

  it('shows row number badge', () => {
    render(<RecordCard record={makeRecord({ rowNumber: 5 })} />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('success records are collapsed by default', () => {
    render(<RecordCard record={makeRecord()} />);
    expect(screen.queryByText('Patient')).toBeNull();
  });

  it('error records are expanded by default', () => {
    render(<RecordCard record={makeRecord({ status: 'ERROR', airStatusCode: 'AIR-E-1005' })} />);
    expect(screen.getByText('Patient')).toBeTruthy();
    expect(screen.getByText('Encounter')).toBeTruthy();
  });

  it('warning records are expanded by default', () => {
    render(<RecordCard record={makeRecord({ status: 'WARNING', airStatusCode: 'AIR-W-1004' })} />);
    expect(screen.getByText('Patient')).toBeTruthy();
  });

  it('clicking header toggles expansion', () => {
    const { container } = render(<RecordCard record={makeRecord()} />);
    const toggleBtn = container.querySelector('button[aria-expanded]')!;
    // Initially collapsed
    expect(screen.queryByText('Patient')).toBeNull();
    // Click to expand
    fireEvent.click(toggleBtn);
    expect(screen.getByText('Patient')).toBeTruthy();
    // Click to collapse
    fireEvent.click(toggleBtn);
    expect(screen.queryByText('Patient')).toBeNull();
  });

  it('shows AIR message verbatim in expanded view', () => {
    const msg = 'Exact AIR message with special chars';
    render(<RecordCard record={makeRecord({ status: 'ERROR', airStatusCode: 'AIR-E-1005', airMessage: msg })} />);
    expect(screen.getByText(msg)).toBeTruthy();
  });

  it('shows errors when present', () => {
    const record = makeRecord({
      status: 'ERROR',
      airStatusCode: 'AIR-E-1005',
      errors: [
        { code: 'AIR-E-1018', field: 'encounters.dateOfService', message: 'Date in future.' },
      ],
    });
    render(<RecordCard record={record} />);
    expect(screen.getByText('Date in future.')).toBeTruthy();
  });

  it('shows Confirm & Accept button when actionRequired is CONFIRM_OR_CORRECT', () => {
    const onConfirm = vi.fn();
    const record = makeRecord({
      status: 'WARNING',
      airStatusCode: 'AIR-W-1004',
      actionRequired: 'CONFIRM_OR_CORRECT',
    });
    render(<RecordCard record={record} onConfirm={onConfirm} />);
    const btn = screen.getByText('Confirm & Accept');
    fireEvent.click(btn);
    expect(onConfirm).toHaveBeenCalledWith(record);
  });

  it('does not show Confirm button when actionRequired is NONE', () => {
    const { container } = render(<RecordCard record={makeRecord()} onConfirm={vi.fn()} />);
    // Expand first
    const toggleBtn = container.querySelector('button[aria-expanded]')!;
    fireEvent.click(toggleBtn);
    expect(screen.queryByText('Confirm & Accept')).toBeNull();
  });

  it('shows Edit & Resubmit button for non-SUCCESS records', () => {
    const onEdit = vi.fn();
    const record = makeRecord({ status: 'ERROR', airStatusCode: 'AIR-E-1005' });
    render(<RecordCard record={record} onEditResubmit={onEdit} />);
    const btn = screen.getByText('Edit & Resubmit');
    fireEvent.click(btn);
    expect(onEdit).toHaveBeenCalledWith(record);
  });

  it('does not show Edit & Resubmit for SUCCESS records', () => {
    const { container } = render(<RecordCard record={makeRecord()} onEditResubmit={vi.fn()} />);
    const toggleBtn = container.querySelector('button[aria-expanded]')!;
    fireEvent.click(toggleBtn);
    expect(screen.queryByText('Edit & Resubmit')).toBeNull();
  });

  it('shows resubmit count when > 0', () => {
    const record = makeRecord({ status: 'ERROR', airStatusCode: 'AIR-E-1005', resubmitCount: 2 });
    render(<RecordCard record={record} />);
    expect(screen.getByText('Resubmitted 2x')).toBeTruthy();
  });

  it('shows guidance tip for known error codes', () => {
    const record = makeRecord({
      status: 'WARNING',
      airStatusCode: 'AIR-W-1004',
      actionRequired: 'CONFIRM_OR_CORRECT',
    });
    render(<RecordCard record={record} />);
    expect(screen.getByText(/not be registered on AIR/)).toBeTruthy();
  });

  it('shows episodes when present', () => {
    const record = makeRecord({
      status: 'SUCCESS',
      episodes: [
        { id: '1', vaccine: 'INFLUVAC', status: 'VALID', code: 'AIR-I-1002', message: 'Vaccine was valid.' },
      ],
    });
    const { container } = render(<RecordCard record={record} />);
    // Expand
    const toggleBtn = container.querySelector('button[aria-expanded]')!;
    fireEvent.click(toggleBtn);
    expect(screen.getByText('INFLUVAC')).toBeTruthy();
  });

  it('renders data-testid with row number', () => {
    render(<RecordCard record={makeRecord({ rowNumber: 3 })} />);
    expect(screen.getByTestId('record-card-3')).toBeTruthy();
  });
});
