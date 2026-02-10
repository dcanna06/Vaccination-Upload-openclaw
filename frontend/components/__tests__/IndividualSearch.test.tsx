import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/individuals',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

// We test the page component
import IndividualSearchPage from '@/app/(dashboard)/individuals/page';

describe('IndividualSearchPage', () => {
  it('renders the search heading', () => {
    render(<IndividualSearchPage />);
    expect(screen.getByText('Search Individual')).toBeInTheDocument();
  });

  it('shows Medicare tab by default', () => {
    render(<IndividualSearchPage />);
    expect(screen.getByPlaceholderText('10 digits')).toBeInTheDocument();
  });

  it('switches to IHI tab', () => {
    render(<IndividualSearchPage />);
    fireEvent.click(screen.getByText('IHI'));
    expect(screen.getByPlaceholderText('16 digits')).toBeInTheDocument();
  });

  it('switches to Demographics tab', () => {
    render(<IndividualSearchPage />);
    fireEvent.click(screen.getByText('Demographics'));
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
  });

  it('shows minimum ID requirements for Medicare', () => {
    render(<IndividualSearchPage />);
    expect(screen.getByText('Medicare Card Number + IRN')).toBeInTheDocument();
  });

  it('shows minimum ID requirements for IHI', () => {
    render(<IndividualSearchPage />);
    fireEvent.click(screen.getByText('IHI'));
    expect(screen.getByText(/Individual Healthcare Identifier/)).toBeInTheDocument();
  });

  it('shows minimum ID requirements for Demographics', () => {
    render(<IndividualSearchPage />);
    fireEvent.click(screen.getByText('Demographics'));
    expect(screen.getByText('First Name + Last Name')).toBeInTheDocument();
  });

  it('renders gender select with M, F, X options', () => {
    render(<IndividualSearchPage />);
    expect(screen.getByRole('option', { name: 'Male' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Female' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Not Stated' })).toBeInTheDocument();
  });

  it('has a search button', () => {
    render(<IndividualSearchPage />);
    expect(screen.getByText('Search AIR')).toBeInTheDocument();
  });
});
