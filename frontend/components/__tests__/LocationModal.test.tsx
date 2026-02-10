import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LocationModal } from '../admin/LocationModal';

describe('LocationModal', () => {
  const defaultProps = {
    open: true,
    location: null,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
  };

  it('renders create mode when no location provided', () => {
    render(<LocationModal {...defaultProps} />);
    expect(screen.getByText('Add Location')).toBeTruthy();
    expect(screen.getByText('Create')).toBeTruthy();
  });

  it('renders edit mode when location provided', () => {
    const location = {
      id: 1,
      organisation_id: 1,
      name: 'Test Clinic',
      address_line_1: '123 Main St',
      address_line_2: '',
      suburb: 'Sydney',
      state: 'NSW',
      postcode: '2000',
      minor_id: '001',
      proda_link_status: 'pending',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    render(<LocationModal {...defaultProps} location={location} />);
    expect(screen.getByText('Edit Location')).toBeTruthy();
    expect(screen.getByText('Update')).toBeTruthy();
    expect(screen.getByDisplayValue('Test Clinic')).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<LocationModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Add Location')).toBeNull();
  });

  it('calls onClose when cancel clicked', () => {
    render(<LocationModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows error when name is empty', async () => {
    render(<LocationModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeTruthy();
    });
  });

  it('calls onSave with form data', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LocationModal {...defaultProps} onSave={onSave} />);

    const nameInput = screen.getByPlaceholderText('e.g. Main Clinic');
    fireEvent.change(nameInput, { target: { value: 'New Clinic' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Clinic' }),
      );
    });
  });

  it('renders all Australian states in dropdown', () => {
    render(<LocationModal {...defaultProps} />);
    const states = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
    states.forEach((s) => {
      expect(screen.getByText(s)).toBeTruthy();
    });
  });
});
