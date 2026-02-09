import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditResubmitPanel } from '../EditResubmitPanel';
import type { SubmissionResultRecord } from '@/types/submission';

const makeRecord = (overrides: Partial<SubmissionResultRecord> = {}): SubmissionResultRecord => ({
  rowNumber: 2,
  individual: {
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '15031985',
    gender: 'F',
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
  status: 'ERROR',
  airStatusCode: 'AIR-E-1005',
  airMessage: 'Validation failed.',
  errors: [
    { code: 'AIR-E-1018', field: 'encounters.dateOfService', message: 'Date is in the future.' },
  ],
  episodes: [],
  actionRequired: 'NONE',
  resubmitCount: 0,
  ...overrides,
});

describe('EditResubmitPanel', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders panel with patient and encounter fields', () => {
    render(
      <EditResubmitPanel
        record={makeRecord()}
        submissionId="sub-123"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    expect(screen.getByTestId('edit-panel')).toBeTruthy();
    expect(screen.getByText('Edit & Resubmit')).toBeTruthy();
    expect(screen.getByLabelText('First Name')).toBeTruthy();
    expect(screen.getByLabelText('Last Name')).toBeTruthy();
    expect(screen.getByLabelText('Date of Birth')).toBeTruthy();
    expect(screen.getByLabelText('Vaccine Code')).toBeTruthy();
  });

  it('pre-populates fields from record data', () => {
    render(
      <EditResubmitPanel
        record={makeRecord()}
        submissionId="sub-123"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Jane');
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe('Doe');
    expect((screen.getByLabelText('Vaccine Code') as HTMLInputElement).value).toBe('COVAST');
  });

  it('shows original errors', () => {
    render(
      <EditResubmitPanel
        record={makeRecord()}
        submissionId="sub-123"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    // Error code appears in both the banner and field tooltip
    expect(screen.getAllByText('AIR-E-1018').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Date is in the future/).length).toBeGreaterThanOrEqual(1);
  });

  it('highlights field with AIR error', () => {
    render(
      <EditResubmitPanel
        record={makeRecord()}
        submissionId="sub-123"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    const dosField = screen.getByLabelText('Date of Service');
    expect(dosField.className).toContain('border-red');
  });

  it('calls onClose when Cancel clicked', () => {
    render(
      <EditResubmitPanel
        record={makeRecord()}
        submissionId="sub-123"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape pressed', () => {
    render(
      <EditResubmitPanel
        record={makeRecord()}
        submissionId="sub-123"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', () => {
    const { container } = render(
      <EditResubmitPanel
        record={makeRecord()}
        submissionId="sub-123"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    // The backdrop is the first fixed overlay
    const backdrop = container.querySelector('.fixed.inset-0.z-40');
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('validates required fields', () => {
    render(
      <EditResubmitPanel
        record={makeRecord({
          individual: { firstName: '', lastName: '', dob: '', gender: '', medicare: '', irn: '' },
        })}
        submissionId="sub-123"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    expect(screen.getByText('First name is required')).toBeTruthy();
    expect(screen.getByText('Last name is required')).toBeTruthy();
    expect(screen.getByText('Date of birth is required')).toBeTruthy();
  });

  it('disables submit when validation errors exist', () => {
    render(
      <EditResubmitPanel
        record={makeRecord({
          individual: { firstName: '', lastName: '', dob: '', gender: '', medicare: '', irn: '' },
        })}
        submissionId="sub-123"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    const submitBtn = screen.getByText('Resubmit to AIR');
    expect(submitBtn).toHaveProperty('disabled', true);
  });

  it('allows editing fields', () => {
    render(
      <EditResubmitPanel
        record={makeRecord()}
        submissionId="sub-123"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    const firstNameInput = screen.getByLabelText('First Name') as HTMLInputElement;
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });
    expect(firstNameInput.value).toBe('Updated');
  });

  it('shows row number and patient name in header', () => {
    render(
      <EditResubmitPanel
        record={makeRecord()}
        submissionId="sub-123"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );
    expect(screen.getByText(/Row 2/)).toBeTruthy();
    expect(screen.getByText(/Jane Doe/)).toBeTruthy();
  });
});
