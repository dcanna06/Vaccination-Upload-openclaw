import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ErrorDetail } from '../ErrorDetail';

describe('ErrorDetail', () => {
  it('renders error code and message verbatim', () => {
    render(
      <ErrorDetail error={{ code: 'AIR-E-1018', field: 'encounters.dateOfService', message: 'Date is in the future.' }} />,
    );
    expect(screen.getByText('AIR-E-1018')).toBeTruthy();
    expect(screen.getByText('encounters.dateOfService')).toBeTruthy();
    expect(screen.getByText('Date is in the future.')).toBeTruthy();
  });

  it('shows guidance tip for known error code', () => {
    render(
      <ErrorDetail error={{ code: 'AIR-E-1018', field: '', message: 'Date in future.' }} />,
    );
    expect(screen.getByText(/date is in the future/i)).toBeTruthy();
  });

  it('does not show tip for unknown error code', () => {
    render(
      <ErrorDetail error={{ code: 'AIR-E-9999', field: '', message: 'Unknown error.' }} />,
    );
    expect(screen.queryByText(/Tip/)).toBeNull();
  });

  it('hides field when empty', () => {
    const { container } = render(
      <ErrorDetail error={{ code: 'AIR-E-1005', field: '', message: 'Error.' }} />,
    );
    // Should not have an empty field element
    const fieldElements = container.querySelectorAll('.font-mono');
    const fieldTexts = Array.from(fieldElements).map(el => el.textContent);
    expect(fieldTexts).not.toContain('');
  });
});
