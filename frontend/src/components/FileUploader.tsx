import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface FileUploaderProps {
  onUpload: (file: File) => Promise<any>;
  uploading: boolean;
}

export function FileUploader({ onUpload, uploading }: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer group',
        isDragActive
          ? 'border-amber-400 bg-amber-400/5 scale-[1.01]'
          : 'border-ink-200 hover:border-ink-400 hover:bg-ink-100/50',
        uploading && 'pointer-events-none opacity-60'
      )}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-3 text-center">
        {uploading ? (
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        ) : isDragActive ? (
          <FileText className="w-8 h-8 text-amber-500 animate-pulse-soft" />
        ) : (
          <Upload className="w-8 h-8 text-ink-400 group-hover:text-ink-600 transition-colors" />
        )}

        <div>
          <p className="text-sm font-medium text-ink-700">
            {uploading
              ? 'Processing document...'
              : isDragActive
              ? 'Drop it here'
              : 'Drop a document or click to browse'}
          </p>
          <p className="text-xs text-ink-400 mt-1">PDF, DOCX, or TXT — up to 10 MB</p>
        </div>
      </div>
    </div>
  );
}
