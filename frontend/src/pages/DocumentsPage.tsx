import { FileUploader } from '../components/FileUploader';
import { DocList } from '../components/DocList';
import { useDocuments } from '../hooks/useDocuments';

export function DocumentsPage() {
  const { documents, loading, uploading, upload, remove } = useDocuments();

  return (
    <div className="max-w-2xl mx-auto py-8 px-6 animate-fade-in">
      <h1 className="font-display text-3xl text-ink-800 mb-2">Documents</h1>
      <p className="text-sm text-ink-400 mb-8">
        Upload and manage your documents. Each file is automatically parsed, chunked, and embedded for semantic search.
      </p>

      <div className="mb-8">
        <FileUploader onUpload={upload} uploading={uploading} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-ink-100 animate-pulse">
              <div className="h-4 bg-ink-100 rounded w-48 mb-2" />
              <div className="h-3 bg-ink-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : (
        <DocList
          documents={documents}
          selectedIds={[]}
          onToggleSelect={() => {}}
          onDelete={remove}
        />
      )}
    </div>
  );
}
