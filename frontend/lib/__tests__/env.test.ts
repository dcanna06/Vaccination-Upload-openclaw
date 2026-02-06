import { describe, it, expect } from 'vitest';
import { env } from '../env';

describe('env config', () => {
  it('has apiUrl default', () => {
    expect(env.apiUrl).toBe('http://localhost:8000');
  });

  it('has appEnv default', () => {
    expect(env.appEnv).toBe('development');
  });
});
