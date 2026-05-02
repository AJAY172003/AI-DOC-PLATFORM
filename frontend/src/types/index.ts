export interface DocumentItem {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: 'processing' | 'ready' | 'failed';
  total_chunks: number;
  created_at: string;
}

export interface SourceChunk {
  chunk_id: string;
  document_id: string;
  filename: string;
  content: string;
  page_number: number | null;
  similarity_score: number;
}

export interface GuardrailResult {
  relevance_score: number;
  is_grounded: boolean;
  safety_flagged: boolean;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceChunk[];
  tokens_used?: number;
  latency_ms?: number;
  guardrail?: GuardrailResult;
  timestamp: Date;
}

export interface ChatResponse {
  answer: string;
  sources: SourceChunk[];
  tokens_used: number;
  latency_ms: number;
  guardrail?: GuardrailResult;
}

export interface ToolCall {
  tool: string;
  input: string;
}

export interface AgentResponse {
  answer: string;
  tool_calls: ToolCall[];
  is_report: boolean;
  latency_ms: number;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  tool_calls?: ToolCall[];
  is_report?: boolean;
  latency_ms?: number;
  timestamp: Date;
}

export interface MetricsSummary {
  total_queries: number;
  total_tokens: number;
  total_cost: number;
  avg_latency_ms: number;
  documents_count: number;
  chunks_count: number;
  avg_relevance_score?: number;
  grounded_percentage?: number;
}

export interface MetricEntry {
  id: string;
  operation: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
  estimated_cost: number;
  created_at: string;
}
