import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EpisodePill } from '../EpisodePill';

describe('EpisodePill', () => {
  it('renders valid episode with green styling', () => {
    render(
      <EpisodePill
        episode={{ id: '1', vaccine: 'COVAST', status: 'VALID', code: 'AIR-I-1002', message: 'Valid.' }}
      />,
    );
    expect(screen.getByText('COVAST')).toBeTruthy();
    expect(screen.getByText('AIR-I-1002')).toBeTruthy();
  });

  it('renders invalid episode with red styling', () => {
    render(
      <EpisodePill
        episode={{ id: '1', vaccine: 'BADCODE', status: 'INVALID', code: 'AIR-E-1023', message: 'Invalid.' }}
      />,
    );
    expect(screen.getByText('BADCODE')).toBeTruthy();
    expect(screen.getByText('AIR-E-1023')).toBeTruthy();
  });

  it('falls back to episode ID when vaccine is empty', () => {
    render(
      <EpisodePill
        episode={{ id: '3', vaccine: '', status: 'VALID', code: 'AIR-I-1002', message: '' }}
      />,
    );
    expect(screen.getByText('Episode 3')).toBeTruthy();
  });
});
