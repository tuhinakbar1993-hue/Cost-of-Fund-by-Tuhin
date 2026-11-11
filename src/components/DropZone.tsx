import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Trash2, AlertCircle, Sparkles, Check, Clock } from 'lucide-react';
import { UploadedFileStatus } from '../types';

interface DropZoneProps {
  files: UploadedFileStatus[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onLoadSample: () => void;
  timingMessage?: string | null;
  duplicateCount?: number;
  isProcessing?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  files,
  onFilesSelected,
  onRemoveFile,
  onLoadSample,
  timingMessage,
  duplicateCount = 0,
  isProcessing = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.toLowerCase().endsWith('.pdf')
      );
      if (selected.length > 0) {
        onFilesSelected(selected);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      onFilesSelected(selected);
      e.target.value = ''; // Reset input so re-selecting same works
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeLabel = (type: UploadedFileStatus['type'], accountNo?: string) => {
    switch (type) {
      case 'INVESTMENT_LEDGER':
        return accountNo ? `Investment Ledger (A/C: ${accountNo})` : 'Investment Ledger';
      case 'CUSTOMER_OUTSTANDING':
        return 'Customer Outstanding Report';
      case 'PARTY_PERFORMANCE':
        return 'Party Performance Report';
      default:
        return 'Unknown Document';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Target Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center transition-all cursor-pointer relative overflow-hidden ${
          isDragOver
            ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-600 bg-neutral-50/50 dark:bg-neutral-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              Drag & drop all CBS PDF reports here, or <span className="text-emerald-700 dark:text-emerald-400 underline">browse files</span>
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Supports Investment Ledgers, Customer Outstanding Report, and Party Performance Report. Auto-detected by content.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 shadow-2xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Load Ocean Agro Farm Sample Case (4 A/Cs)
            </button>
          </div>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 flex items-center justify-center backdrop-blur-xs">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span>Parsing PDF files in parallel worker...</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar: Timing Readout & Duplicate Notices */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-400 px-1">
        <div className="flex items-center gap-3">
          {timingMessage && (
            <div className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{timingMessage}</span>
            </div>
          )}

          {duplicateCount > 0 && (
            <div className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/50">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{duplicateCount} duplicate file{duplicateCount > 1 ? 's' : ''} ignored</span>
            </div>
          )}
        </div>

        <div className="text-neutral-500">
          {files.length > 0 && <span>{files.length} active file{files.length > 1 ? 's' : ''} loaded</span>}
        </div>
      </div>

      {/* File Chips Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {files.map((file) => (
            <div
              key={file.id}
              className={`p-2.5 rounded-lg border text-left flex items-start justify-between gap-2.5 transition-colors ${
                file.error
                  ? 'border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    file.error
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      : file.type === 'INVESTMENT_LEDGER'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : file.type === 'CUSTOMER_OUTSTANDING'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  }`}
                >
                  {file.error ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                    {getTypeLabel(file.type, file.accountNo)}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                    <span>{formatFileSize(file.size)}</span>
                    {!file.error && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Validated
                        </span>
                      </>
                    )}
                  </div>
                  {file.error && (
                    <p className="text-[11px] font-medium text-red-600 dark:text-red-400 mt-1">
                      {file.error}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRemoveFile(file.id)}
                className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                title="Remove file"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
