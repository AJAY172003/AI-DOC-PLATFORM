import axios from 'axios';
import type { AgentResponse, ChatResponse, DocumentItem, MetricEntry, MetricsSummary } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Documents ──

export async function uploadDocument(file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axios.post<DocumentItem>(
    `${import.meta.env.VITE_API_URL}/documents/upload`,
    formData,
  );
  return data;
}

export async function listDocuments(): Promise<DocumentItem[]> {
  const { data } = await api.get<DocumentItem[]>('/documents/');
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}

// ── Agent ──

export async function sendAgentMessage(
  question: string,
  documentIds?: string[]
): Promise<AgentResponse> {
  const { data } = await api.post<AgentResponse>('/agent/', {
    question,
    document_ids: documentIds?.length ? documentIds : null,
  });
  return data;
}

// ── Chat ──

export async function sendMessage(
  question: string,
  documentIds?: string[]
): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>('/chat/', {
    question,
    document_ids: documentIds?.length ? documentIds : null,
  });
  return data;
}

// ── Metrics ──

export async function getMetricsSummary(): Promise<MetricsSummary> {
  const { data } = await api.get<MetricsSummary>('/metrics/summary');
  return data;
}

export async function getRecentMetrics(limit = 50): Promise<MetricEntry[]> {
  const { data } = await api.get<MetricEntry[]>(`/metrics/recent?limit=${limit}`);
  return data;
}

// ── Evaluation ──

export async function triggerEval(): Promise<{ message: string; status: string }> {
  const { data } = await api.post('/eval/run');
  return data;
}

export async function getEvalStatus(): Promise<{
  status: string;
  message: string;
  results: any | null;
}> {
  const { data } = await api.get('/eval/status');
  return data;
}

export async function clearEvalResults(): Promise<void> {
  await api.delete('/eval/results');
}
