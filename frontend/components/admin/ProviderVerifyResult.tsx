'use client';

interface ProviderVerifyResultProps {
  result: {
    status: string;
    errorCode?: string;
    message?: string;
    accessList?: Record<string, unknown>;
  } | null;
}

export function ProviderVerifyResult({ result }: ProviderVerifyResultProps) {
  if (!result) return null;

  if (result.status === 'error') {
    return (
      <div className="mt-3 rounded border border-red-500/30 bg-red-500/10 px-4 py-3">
        <p className="text-sm font-medium text-red-400">Verification Failed</p>
        {result.errorCode && (
          <p className="mt-1 text-xs text-red-300">Error: {result.errorCode}</p>
        )}
        {result.message && (
          <p className="mt-1 text-xs text-slate-400">{result.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <p className="text-sm font-medium text-emerald-400">Verification Successful</p>
      {result.accessList && (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-900 p-2 text-xs text-slate-300">
          {JSON.stringify(result.accessList, null, 2)}
        </pre>
      )}
    </div>
  );
}
