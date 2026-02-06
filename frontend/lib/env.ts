/**
 * Environment configuration for the frontend application.
 * Uses NEXT_PUBLIC_ prefix for client-side variables.
 */
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
  appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
} as const;
