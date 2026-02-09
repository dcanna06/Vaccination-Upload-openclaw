import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResultsToolbar } from '../ResultsToolbar';

const counts = { total: 10, success: 6, warning: 2, error: 2 };

describe('ResultsToolbar', () => {
  it('renders all filter tabs with counts', () => {
    render(
      <ResultsToolbar
        counts={counts}
        activeFilter="ALL"
        onFilterChange={vi.fn()}
        hasConfirmable={false}
      />,
    );
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('Success')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('Warnings')).toBeTruthy();
    expect(screen.getByText('Errors')).toBeTruthy();
    // Both warnings and errors have count 2
    expect(screen.getAllByText('2')).toHaveLength(2);
  });

  it('calls onFilterChange when tab clicked', () => {
    const onChange = vi.fn();
    render(
      <ResultsToolbar
        counts={counts}
        activeFilter="ALL"
        onFilterChange={onChange}
        hasConfirmable={false}
      />,
    );
    fireEvent.click(screen.getByText('Errors'));
    expect(onChange).toHaveBeenCalledWith('ERROR');
  });

  it('shows Confirm All Warnings button when hasConfirmable', () => {
    const onConfirm = vi.fn();
    render(
      <ResultsToolbar
        counts={counts}
        activeFilter="ALL"
        onFilterChange={vi.fn()}
        onConfirmAll={onConfirm}
        hasConfirmable={true}
      />,
    );
    const btn = screen.getByText('Confirm All Warnings');
    fireEvent.click(btn);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('hides Confirm All button when no confirmable records', () => {
    render(
      <ResultsToolbar
        counts={counts}
        activeFilter="ALL"
        onFilterChange={vi.fn()}
        hasConfirmable={false}
      />,
    );
    expect(screen.queryByText('Confirm All Warnings')).toBeNull();
  });

  it('shows Export button when onExport provided', () => {
    const onExport = vi.fn();
    render(
      <ResultsToolbar
        counts={counts}
        activeFilter="ALL"
        onFilterChange={vi.fn()}
        onExport={onExport}
        hasConfirmable={false}
      />,
    );
    fireEvent.click(screen.getByText('Export'));
    expect(onExport).toHaveBeenCalled();
  });
});
