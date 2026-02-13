'use client';

import { useState, useRef } from 'react';
import { FacilitySelector } from '@/components/portals/FacilitySelector';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  Building2,
} from 'lucide-react';
import { FACILITIES } from '@/lib/mock/portal-data';

const ACCENT = '#7c3aed';

export default function NMUploadPage() {
  const [facilityFilter, setFacilityFilter] = useState('all');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const facilitySelected = facilityFilter !== 'all' && facilityFilter !== '';
  const isActive = facilitySelected;

  const mockPreview = () => {
    setPreviewData([
      ['Margaret', 'Thompson', '12/04/1938', 'F', '2123 45678 1', 'A-101', 'Dr. Williams', 'Egg'],
      ['Robert', 'Wilson', '22/08/1942', 'M', '3456 78901 2', 'A-102', 'Dr. Patel', ''],
      ['Dorothy', 'Chen', '03/11/1935', 'F', '4567 89012 3', 'B-201', 'Dr. Williams', 'Penicillin, Latex'],
    ]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isActive) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.csv'))) {
      setFile(dropped);
      mockPreview();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      mockPreview();
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Vaccination Data</h1>
        <p className="text-gray-500">Submit vaccination records to the Australian Immunisation Register</p>
      </div>

      {/* Facility Selector */}
      <div className="flex items-center gap-4">
        <FacilitySelector
          value={facilityFilter}
          onChange={val => {
            setFacilityFilter(val);
            setFile(null);
            setPreviewData(null);
          }}
          facilities={FACILITIES}
          label="Select Facility:"
        />
        {!facilitySelected && (
          <span className="text-sm text-orange-600">
            Please select a facility before uploading
          </span>
        )}
      </div>

      {/* Template Download */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: '#f5f3ff' }}
            >
              <FileSpreadsheet className="h-5 w-5" style={{ color: ACCENT }} />
            </div>
            <div>
              <p className="font-medium text-gray-900">Download the Excel template</p>
              <p className="text-sm text-gray-500">
                Use this template to format your vaccination data correctly
              </p>
            </div>
          </div>
          <button
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            <Download className="h-4 w-4" /> Download Template (.xlsx)
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      {!file ? (
        !isActive ? (
          /* Disabled state */
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-16">
            <Building2 className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-400">
              Select a facility first to begin uploading
            </p>
          </div>
        ) : (
          /* Active drop zone */
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 transition-colors ${
              isDragging
                ? 'bg-violet-50'
                : 'bg-white hover:bg-violet-50/50'
            }`}
            style={{ borderColor: ACCENT }}
          >
            <Upload className="mb-3 h-10 w-10" style={{ color: ACCENT }} />
            <p className="text-base font-medium text-gray-700">
              Drop your Excel file here, or{' '}
              <span className="underline" style={{ color: ACCENT }}>
                click to browse
              </span>
            </p>
            <p className="mt-1 text-sm text-gray-500">.xlsx and .csv files supported</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )
      ) : (
        <div className="space-y-4">
          {/* File Info */}
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setPreviewData(null);
              }}
              className="text-sm text-gray-500 hover:text-red-600"
            >
              Remove
            </button>
          </div>

          {/* Preview Table */}
          {previewData && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b bg-gray-50 px-4 py-3">
                <p className="text-sm font-medium text-gray-700">
                  Preview (first {previewData.length} rows)
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <th className="px-4 py-2">First Name</th>
                    <th className="px-4 py-2">Last Name</th>
                    <th className="px-4 py-2">DOB</th>
                    <th className="px-4 py-2">Gender</th>
                    <th className="px-4 py-2">Medicare</th>
                    <th className="px-4 py-2">Room</th>
                    <th className="px-4 py-2">GP</th>
                    <th className="px-4 py-2">Allergies</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-2 text-gray-700">
                          {cell || '---'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              className="rounded-lg px-6 py-2 text-sm font-medium text-white"
              style={{ background: ACCENT }}
            >
              Validate
            </button>
            <button
              onClick={() => {
                setFile(null);
                setPreviewData(null);
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
