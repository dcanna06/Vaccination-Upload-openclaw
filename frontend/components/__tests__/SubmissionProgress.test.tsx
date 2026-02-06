import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubmissionProgress } from '../SubmissionProgress';

describe('SubmissionProgress', () => {
  const baseProgress = {
    totalBatches: 10,
    completedBatches: 5,
    successful: 40,
    failed: 2,
    pendingConfirmation: 3,
    status: 'running' as const,
  };

  it('renders progress bar', () => {
    render(<SubmissionProgress progress={baseProgress} />);
    const bar = screen.getByTestId('progress-bar');
    expect(bar.style.width).toBe('50%');
  });

  it('renders batch counts', () => {
    render(<SubmissionProgress progress={baseProgress} />);
    expect(screen.getByText('5 / 10 batches')).toBeTruthy();
  });

  it('renders success/fail/pending counts', () => {
    render(<SubmissionProgress progress={baseProgress} />);
    expect(screen.getByText('40')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows running status', () => {
    render(<SubmissionProgress progress={baseProgress} />);
    expect(screen.getByText('Submitting...')).toBeTruthy();
  });

  it('shows pause button when running', () => {
    const onPause = vi.fn();
    render(<SubmissionProgress progress={baseProgress} onPause={onPause} />);
    const btn = screen.getByText('Pause');
    fireEvent.click(btn);
    expect(onPause).toHaveBeenCalled();
  });

  it('shows resume button when paused', () => {
    const onResume = vi.fn();
    render(
      <SubmissionProgress
        progress={{ ...baseProgress, status: 'paused' }}
        onResume={onResume}
      />,
    );
    const btn = screen.getByText('Resume');
    fireEvent.click(btn);
    expect(onResume).toHaveBeenCalled();
  });

  it('shows completed status', () => {
    render(
      <SubmissionProgress
        progress={{ ...baseProgress, status: 'completed', completedBatches: 10 }}
      />,
    );
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('renders 0% when no batches', () => {
    render(
      <SubmissionProgress
        progress={{ ...baseProgress, totalBatches: 0, completedBatches: 0 }}
      />,
    );
    const bar = screen.getByTestId('progress-bar');
    expect(bar.style.width).toBe('0%');
  });
});
