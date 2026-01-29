import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, File, Image, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  maxFiles?: number;
  className?: string;
  label?: string;
  hint?: string;
  compact?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  accept = '*',
  multiple = false,
  maxSize = 10,
  maxFiles = 5,
  className,
  label,
  hint,
  compact = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (fileList: FileList | File[]): File[] => {
      const validFiles: File[] = [];
      const maxSizeBytes = maxSize * 1024 * 1024;

      Array.from(fileList).forEach((file) => {
        if (file.size > maxSizeBytes) {
          setError(`${file.name} exceeds ${maxSize}MB limit`);
          return;
        }
        if (!multiple && validFiles.length >= 1) return;
        if (multiple && validFiles.length >= maxFiles) return;
        validFiles.push(file);
      });

      return validFiles;
    },
    [maxSize, maxFiles, multiple]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setError(null);

      const validFiles = validateFiles(e.dataTransfer.files);
      if (validFiles.length > 0) {
        const newFiles = multiple ? [...files, ...validFiles].slice(0, maxFiles) : validFiles;
        setFiles(newFiles);
        onFilesSelected(newFiles);
      }
    },
    [files, multiple, maxFiles, validateFiles, onFilesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      if (!e.target.files) return;

      const validFiles = validateFiles(e.target.files);
      if (validFiles.length > 0) {
        const newFiles = multiple ? [...files, ...validFiles].slice(0, maxFiles) : validFiles;
        setFiles(newFiles);
        onFilesSelected(newFiles);
      }
    },
    [files, multiple, maxFiles, validateFiles, onFilesSelected]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);
      onFilesSelected(newFiles);
    },
    [files, onFilesSelected]
  );

  const isImage = (file: File) => file.type.startsWith('image/');

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-1.5">
          {label}
        </label>
      )}

      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        animate={{ scale: isDragging ? 1.01 : 1 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'relative border border-dashed rounded-lg text-center cursor-pointer',
          'transition-all duration-150',
          compact ? 'p-4' : 'p-6',
          isDragging
            ? 'border-ecotribe-primary/50 bg-ecotribe-primary/[0.05]'
            : 'border-slate-300 dark:border-white/[0.12] hover:border-slate-400 dark:hover:border-white/20 bg-slate-50/50 dark:bg-white/[0.02]'
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <Upload
          className={cn(
            'mx-auto mb-2 transition-colors',
            compact ? 'w-6 h-6' : 'w-8 h-8',
            isDragging ? 'text-ecotribe-primary' : 'text-slate-400 dark:text-white/30'
          )}
        />
        <p className={cn('font-medium text-slate-700 dark:text-white/80', compact ? 'text-sm' : 'text-sm')}>
          {isDragging ? 'Drop files here' : 'Drop files or click to upload'}
        </p>
        {hint && <p className="mt-1 text-xs text-slate-500 dark:text-white/40">{hint}</p>}
      </motion.div>

      {error && (
        <div className="mt-1.5 flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-1.5"
          >
            {files.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2.5 p-2.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-lg"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-slate-100 dark:bg-white/[0.05] rounded-md flex items-center justify-center">
                  {isImage(file) ? (
                    <Image className="w-4 h-4 text-ecotribe-primary/70" />
                  ) : (
                    <File className="w-4 h-4 text-slate-500 dark:text-white/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-white/80 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-white/40">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-slate-400 dark:text-white/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
