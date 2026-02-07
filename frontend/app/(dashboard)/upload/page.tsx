'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUpload } from '@/components/FileUpload';
import { useUploadStore } from '@/stores/uploadStore';
import { env } from '@/lib/env';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function UploadPage() {
  const router = useRouter();
  const { setFile, setIsUploading, isUploading, setError, error, reset, setParsedRows } = useUploadStore();
  const [uploadResult, setUploadResult] = useState<{
    fileName: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
  } | null>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setFile(file);
      setIsUploading(true);
      setError(null);
      setUploadResult(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${env.apiUrl}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(body.detail || `Upload failed: ${res.status}`);
        }

        const data = await res.json();
        setParsedRows(data.records ?? []);
        setUploadResult({
          fileName: data.fileName,
          totalRows: data.totalRows ?? 0,
          validRows: data.validRows ?? 0,
          invalidRows: data.invalidRows ?? 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [setFile, setIsUploading, setError, setParsedRows],
  );

  const handleError = useCallback(
    (msg: string) => {
      setError(msg);
    },
    [setError],
  );

  const handleReset = useCallback(() => {
    reset();
    setUploadResult(null);
  }, [reset]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Upload Vaccination Records</h2>
        <div className="flex gap-2">
          <a
            href={`${env.apiUrl}/api/template`}
            download
            className="inline-flex items-center rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600"
          >
            Download Template
          </a>
        </div>
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        onError={handleError}
        isUploading={isUploading}
      />

      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={handleReset}>
            Try Again
          </Button>
        </Card>
      )}

      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Complete</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-100">{uploadResult.totalRows}</p>
              <p className="text-sm text-slate-400">Total Rows</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{uploadResult.validRows}</p>
              <p className="text-sm text-slate-400">Valid</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${uploadResult.invalidRows > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {uploadResult.invalidRows}
              </p>
              <p className="text-sm text-slate-400">Invalid</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleReset}>
              Upload Another
            </Button>
            {uploadResult.invalidRows === 0 && (
              <Button size="sm" onClick={() => router.push('/validate')}>
                Review & Validate
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
