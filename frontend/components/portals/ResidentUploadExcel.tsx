'use client';

import React, { useState, useRef } from 'react';
import { Upload, Building2, Download } from 'lucide-react';
import { FacilitySelector } from './FacilitySelector';
import type { Facility } from '@/types/portals';

interface ResidentUploadExcelProps {
  facilities?: Facility[];
  onUpload: (file: File, facilityId: number) => void;
  onCancel: () => void;
  accentColor: string;
}

export function ResidentUploadExcel({
  facilities,
  onUpload,
  onCancel,
  accentColor,
}: ResidentUploadExcelProps) {
  const [facilityId, setFacilityId] = useState<string>(
    facilities && facilities.length > 0 ? 'all' : '',
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const needsFacility = !!facilities;
  const noFacilitySelected = needsFacility && (facilityId === 'all' || facilityId === '');
  const isActive = !noFacilitySelected;

  function handleFile(file: File) {
    if (!isActive) return;
    const resolvedFacilityId = needsFacility ? Number(facilityId) : 0;
    onUpload(file, resolvedFacilityId);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (!isActive) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (isActive) setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ border: `2px solid ${accentColor}` }}
    >
      {/* Facility Selector */}
      {facilities && (
        <div className="mb-5">
          <FacilitySelector
            value={facilityId}
            onChange={setFacilityId}
            facilities={facilities}
            label="Facility:"
          />
        </div>
      )}

      {/* Drop Zone */}
      {!isActive ? (
        /* Disabled state */
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-12">
          <Building2 className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-400">Select a facility first</p>
        </div>
      ) : (
        /* Active drop zone */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
            isDragging ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
          }`}
          style={{ borderColor: accentColor }}
        >
          <Upload
            className="mb-3 h-10 w-10"
            style={{ color: accentColor }}
          />
          <p className="text-sm font-medium text-gray-700">
            Drop your Excel file here, or{' '}
            <span className="underline" style={{ color: accentColor }}>
              click to browse
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            .xlsx and .csv files supported
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      )}

      {/* Template Download + Cancel */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download Template
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
