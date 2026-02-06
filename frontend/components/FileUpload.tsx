'use client';

import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls'];

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onError: (error: string) => void;
  isUploading?: boolean;
  maxSize?: number;
}

export function FileUpload({
  onFileSelect,
  onError,
  isUploading = false,
  maxSize = MAX_SIZE_BYTES,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        return `Invalid file type: "${ext}". Only .xlsx and .xls files are accepted.`;
      }
      if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024));
        return `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum size is ${maxMB}MB.`;
      }
      if (file.size === 0) {
        return 'File is empty. Please select a valid Excel file.';
      }
      return null;
    },
    [maxSize],
  );

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        onError(error);
        return;
      }
      setSelectedFile(file);
      onFileSelect(file);
    },
    [validateFile, onFileSelect, onError],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  return (
    <Card className="p-0">
      <div
        data-testid="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-600 hover:border-slate-500'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <svg
          className="mb-4 h-12 w-12 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        {selectedFile ? (
          <div className="text-center">
            <p className="text-sm font-medium text-slate-200">{selectedFile.name}</p>
            <p className="text-xs text-slate-400">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-slate-200">
              Drag and drop your Excel file here
            </p>
            <p className="mt-1 text-xs text-slate-400">or click to browse</p>
            <p className="mt-2 text-xs text-slate-500">
              Supports .xlsx and .xls files up to 10MB
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          className="hidden"
          data-testid="file-input"
        />
      </div>

      {selectedFile && !isUploading && (
        <div className="flex items-center justify-between border-t border-slate-700 px-6 py-3">
          <span className="text-sm text-slate-300">{selectedFile.name}</span>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleRemove(); }}>
            Remove
          </Button>
        </div>
      )}

      {isUploading && (
        <div className="border-t border-slate-700 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span className="text-sm text-slate-300">Uploading and parsing...</span>
          </div>
        </div>
      )}
    </Card>
  );
}
