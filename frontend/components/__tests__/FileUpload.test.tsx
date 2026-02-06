import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileUpload } from '../FileUpload';

describe('FileUpload', () => {
  const mockOnFileSelect = vi.fn();
  const mockOnError = vi.fn();

  function renderUpload(props = {}) {
    return render(
      <FileUpload onFileSelect={mockOnFileSelect} onError={mockOnError} {...props} />,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders drop zone', () => {
    renderUpload();
    expect(screen.getByText(/drag and drop your excel file/i)).toBeTruthy();
  });

  it('renders file input', () => {
    renderUpload();
    expect(screen.getByTestId('file-input')).toBeTruthy();
  });

  it('accepts valid xlsx file via input', () => {
    renderUpload();
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['data'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [file] } });
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('rejects non-Excel file', () => {
    renderUpload();
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['data'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(mockOnError).toHaveBeenCalledWith(
      expect.stringContaining('Invalid file type'),
    );
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('rejects file over max size', () => {
    renderUpload({ maxSize: 100 });
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const largeContent = new Uint8Array(200);
    const file = new File([largeContent], 'big.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [file] } });
    expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('File too large'));
  });

  it('rejects empty file', () => {
    renderUpload();
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File([], 'empty.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [file] } });
    expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('empty'));
  });

  it('shows selected file name after selection', () => {
    renderUpload();
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['data'], 'vaccines.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getAllByText('vaccines.xlsx').length).toBeGreaterThanOrEqual(1);
  });

  it('shows uploading state', () => {
    renderUpload({ isUploading: true });
    expect(screen.getByText(/uploading and parsing/i)).toBeTruthy();
  });

  it('handles drag over styling', () => {
    renderUpload();
    const dropZone = screen.getByTestId('drop-zone');
    fireEvent.dragOver(dropZone);
    expect(dropZone.className).toContain('border-emerald-500');
  });

  it('handles drag leave', () => {
    renderUpload();
    const dropZone = screen.getByTestId('drop-zone');
    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);
    expect(dropZone.className).not.toContain('border-emerald-500');
  });

  it('accepts xls file', () => {
    renderUpload();
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['data'], 'test.xls', {
      type: 'application/vnd.ms-excel',
    });
    fireEvent.change(input, { target: { files: [file] } });
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });
});
