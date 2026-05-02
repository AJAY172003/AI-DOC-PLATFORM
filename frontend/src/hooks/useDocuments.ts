import { useCallback, useEffect, useState } from 'react';
import type { DocumentItem } from '../types';
import { deleteDocument, listDocuments, uploadDocument } from '../services/api';

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await listDocuments();
      setDocuments(docs);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const upload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      const doc = await uploadDocument(file);
      setDocuments((prev) => [doc, ...prev]);
      return doc;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Upload failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Delete failed');
    }
  };

  return { documents, loading, uploading, error, upload, remove, refresh: fetchDocuments };
}
