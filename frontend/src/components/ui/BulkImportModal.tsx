import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, CheckCircle, AlertCircle, Download, Loader2 } from 'lucide-react';

export interface BulkImportColumn {
  key: string;
  label: string;
  required: boolean;
}

export interface BulkImportResult {
  created_count: number;
  error_count: number;
  errors: Array<{ index?: number; email?: string; error: string }>;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  columns: BulkImportColumn[];
  onImport: (rows: Record<string, string>[]) => Promise<BulkImportResult>;
  onSuccess?: () => void;
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());
    return result;
  });
}

export function BulkImportModal({
  isOpen,
  onClose,
  title,
  description,
  columns,
  onImport,
  onSuccess,
}: BulkImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [fileName, setFileName] = useState('');

  const reset = () => {
    setParsedRows([]);
    setValidationErrors([]);
    setResult(null);
    setFileName('');
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const downloadTemplate = () => {
    const headers = columns.map(c => c.label).join(',');
    const exampleRow = columns.map(c => (c.required ? `example_${c.key}` : '')).join(',');
    const csvContent = `${headers}\n${exampleRow}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);
    setValidationErrors([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);

      if (parsed.length < 2) {
        setValidationErrors(['CSV must have a header row and at least one data row.']);
        return;
      }

      const headerRow = parsed[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));
      const dataRows = parsed.slice(1);

      // Map headers to column keys
      const columnMap: Record<number, string> = {};
      const missingRequired: string[] = [];

      for (const col of columns) {
        const idx = headerRow.findIndex(
          h => h === col.key || h === col.label.toLowerCase().replace(/\s+/g, '_')
        );
        if (idx >= 0) {
          columnMap[idx] = col.key;
        } else if (col.required) {
          missingRequired.push(col.label);
        }
      }

      if (missingRequired.length > 0) {
        setValidationErrors([`Missing required columns: ${missingRequired.join(', ')}`]);
        return;
      }

      const rows: Record<string, string>[] = [];
      const errors: string[] = [];

      dataRows.forEach((row, rowIdx) => {
        const obj: Record<string, string> = {};
        Object.entries(columnMap).forEach(([idxStr, key]) => {
          obj[key] = row[Number(idxStr)] || '';
        });

        // Validate required fields
        for (const col of columns) {
          if (col.required && !obj[col.key]?.trim()) {
            errors.push(`Row ${rowIdx + 2}: Missing required field "${col.label}"`);
          }
        }

        rows.push(obj);
      });

      if (errors.length > 0 && errors.length > 5) {
        setValidationErrors([...errors.slice(0, 5), `... and ${errors.length - 5} more errors`]);
      } else {
        setValidationErrors(errors);
      }

      setParsedRows(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    try {
      const importResult = await onImport(parsedRows);
      setResult(importResult);
      if (importResult.error_count === 0 && onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      setResult({
        created_count: 0,
        error_count: parsedRows.length,
        errors: [{ error: error.message || 'Import failed' }],
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 max-sm:p-0"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-white/10 w-full max-w-2xl max-h-[85vh] max-sm:max-h-full max-sm:h-full max-sm:max-w-none overflow-auto"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="font-brand font-bold text-xl text-white uppercase tracking-tight">
                  {title}
                </h2>
                <p className="font-mono text-xs text-white/50 mt-1">{description}</p>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Template download */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-white/10 p-4">
                <div>
                  <p className="font-display text-sm text-white">Download CSV Template</p>
                  <p className="font-mono text-xs text-white/50 mt-1">
                    Required columns: {columns.filter(c => c.required).map(c => c.label).join(', ')}
                  </p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="w-full sm:w-auto px-4 py-2 border border-white/20 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Template
                </button>
              </div>

              {/* File upload */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-white/20 p-8 text-center hover:border-white/40 transition-colors"
                >
                  <Upload className="w-8 h-8 mx-auto mb-3 text-white/40" />
                  <p className="font-display text-sm text-white/60">
                    {fileName || 'Click to select a CSV file'}
                  </p>
                  <p className="font-mono text-xs text-white/30 mt-1">CSV format only</p>
                </button>
              </div>

              {/* Validation errors */}
              {validationErrors.length > 0 && (
                <div className="border border-red-400/30 bg-red-400/10 p-4 space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="font-mono font-bold text-xs text-red-400 uppercase">Validation Errors</span>
                  </div>
                  {validationErrors.map((err, i) => (
                    <p key={i} className="font-mono text-xs text-red-300">{err}</p>
                  ))}
                </div>
              )}

              {/* Preview */}
              {parsedRows.length > 0 && validationErrors.length === 0 && !result && (
                <div>
                  <p className="font-mono font-bold text-xs text-white/50 uppercase tracking-widest mb-3">
                    Preview ({parsedRows.length} rows)
                  </p>
                  <div className="overflow-x-auto border border-white/10 max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          <th className="p-2 text-left font-mono text-white/50 uppercase">#</th>
                          {columns.map(col => (
                            <th key={col.key} className="p-2 text-left font-mono text-white/50 uppercase">
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="border-b border-white/5">
                            <td className="p-2 font-mono text-white/30">{idx + 1}</td>
                            {columns.map(col => (
                              <td key={col.key} className="p-2 font-mono text-white/80">
                                {row[col.key] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {parsedRows.length > 5 && (
                          <tr>
                            <td colSpan={columns.length + 1} className="p-2 text-center font-mono text-xs text-white/30">
                              ... and {parsedRows.length - 5} more rows
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className={`border p-4 ${result.error_count === 0 ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-amber-400/30 bg-amber-400/10'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {result.error_count === 0 ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    )}
                    <span className="font-brand font-bold text-lg text-white">
                      Import {result.error_count === 0 ? 'Complete' : 'Partially Complete'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="font-mono text-xs text-white/50 uppercase">Created</p>
                      <p className="font-brand font-bold text-2xl text-emerald-400">{result.created_count}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-white/50 uppercase">Errors</p>
                      <p className="font-brand font-bold text-2xl text-red-400">{result.error_count}</p>
                    </div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <p key={i} className="font-mono text-xs text-red-300">
                          {err.email ? `${err.email}: ` : ''}{err.error}
                        </p>
                      ))}
                      {result.errors.length > 10 && (
                        <p className="font-mono text-xs text-white/30">
                          ... and {result.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-white/20 text-white/50 font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                {result ? 'Close' : 'Cancel'}
              </button>
              {!result && (
                <button
                  onClick={handleImport}
                  disabled={parsedRows.length === 0 || validationErrors.length > 0 || isImporting}
                  className="px-5 py-2 bg-lime-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-lime-400 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import {parsedRows.length > 0 ? `(${parsedRows.length})` : ''}
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
