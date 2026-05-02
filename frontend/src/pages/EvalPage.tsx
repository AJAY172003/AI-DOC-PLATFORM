import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import { Play, RefreshCw, Trash2, FlaskConical, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import clsx from 'clsx';
import { clearEvalResults, getEvalStatus, triggerEval } from '../services/api';

type EvalStatus = 'idle' | 'running' | 'complete' | 'error';

const METRIC_LABELS: Record<string, string> = {
  faithfulness: 'Faithfulness',
  answer_relevancy: 'Answer Relevancy',
  context_recall: 'Context Recall',
  context_precision: 'Context Precision',
};

const METRIC_DESCRIPTIONS: Record<string, string> = {
  faithfulness: 'Is the answer consistent with retrieved context?',
  answer_relevancy: 'Does the answer actually address the question?',
  context_recall: 'Did retrieval find all needed information?',
  context_precision: 'Were the retrieved chunks actually relevant?',
};

function scoreColor(score: number) {
  if (score >= 0.85) return '#10b981';
  if (score >= 0.70) return '#f5a623';
  if (score >= 0.55) return '#f59e0b';
  return '#ef4444';
}

function gradeConfig(grade: string) {
  return {
    A: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Excellent' },
    B: { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Good' },
    C: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Needs Work' },
    D: { color: 'text-red-500', bg: 'bg-red-50', label: 'Poor' },
  }[grade] ?? { color: 'text-ink-500', bg: 'bg-ink-50', label: 'Unknown' };
}

export function EvalPage() {
  const [status, setStatus] = useState<EvalStatus>('idle');
  const [message, setMessage] = useState('Run an evaluation to see results');
  const [results, setResults] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getEvalStatus();
      setStatus(data.status as EvalStatus);
      setMessage(data.message);
      if (data.results) {
        setResults(data.results);
        setRunning(false);
        stopPolling();
      }
      if (data.status === 'error') {
        setRunning(false);
        stopPolling();
      }
    } catch {
      // API might be starting up
    }
  }, [stopPolling]);

  useEffect(() => {
    fetchStatus();
    return () => stopPolling();
  }, [fetchStatus, stopPolling]);

  const handleRun = async () => {
    try {
      setRunning(true);
      setResults(null);
      await triggerEval();
      setStatus('running');
      setMessage('Evaluation running...');

      // Poll every 5s
      pollRef.current = setInterval(fetchStatus, 5000);
    } catch (err: any) {
      setRunning(false);
      setMessage(err.response?.data?.detail || 'Failed to start evaluation');
      setStatus('error');
    }
  };

  const handleClear = async () => {
    await clearEvalResults();
    setResults(null);
    setStatus('idle');
    setMessage('Run an evaluation to see results');
  };

  // Prepare radar chart data
  const radarData = results?.aggregate_scores
    ? Object.entries(results.aggregate_scores).map(([key, val]) => ({
        metric: METRIC_LABELS[key] ?? key,
        score: Math.round((val as number) * 100),
        fullMark: 100,
      }))
    : [];

  // Prepare bar chart data
  const barData = results?.aggregate_scores
    ? Object.entries(results.aggregate_scores).map(([key, val]) => ({
        name: METRIC_LABELS[key] ?? key,
        score: Math.round((val as number) * 100),
        raw: val as number,
      }))
    : [];

  const grade = results?.grade;
  const gConfig = grade ? gradeConfig(grade) : null;

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-indigo-500" />
            <h1 className="font-display text-3xl text-ink-800">RAG Evaluation</h1>
          </div>
          <p className="text-sm text-ink-400">
            RAGAS-powered quality measurement — 4 metrics, automated, over your real documents.
          </p>
        </div>
        <div className="flex gap-2">
          {results && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-ink-400 hover:text-red-400 border border-ink-200 rounded-xl hover:border-red-200 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
          <button
            onClick={handleRun}
            disabled={running}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all',
              running
                ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
            )}
          >
            {running
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Play className="w-4 h-4" />}
            {running ? 'Running...' : 'Run Evaluation'}
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div className={clsx(
        'flex items-center gap-3 p-4 rounded-xl mb-8 border',
        status === 'complete' ? 'bg-emerald-50 border-emerald-100' :
        status === 'running' ? 'bg-blue-50 border-blue-100' :
        status === 'error' ? 'bg-red-50 border-red-100' :
        'bg-ink-50 border-ink-100'
      )}>
        {status === 'complete' && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
        {status === 'running' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
        {status === 'error' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
        {status === 'idle' && <Clock className="w-4 h-4 text-ink-400 flex-shrink-0" />}
        <p className="text-sm text-ink-600">{message}</p>
        {results && (
          <span className="ml-auto text-xs text-ink-400 font-mono">
            {results.questions_evaluated} questions · {results.elapsed_seconds}s
          </span>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6 animate-fade-in">

          {/* Overall grade + scores */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Grade card */}
            {gConfig && (
              <div className={clsx('col-span-1 rounded-2xl p-6 flex flex-col items-center justify-center border', gConfig.bg, 'border-transparent')}>
                <p className="text-xs text-ink-400 mb-1">Overall Grade</p>
                <p className={clsx('text-6xl font-display font-bold', gConfig.color)}>{grade}</p>
                <p className={clsx('text-sm font-medium mt-1', gConfig.color)}>{gConfig.label}</p>
                <p className="text-xs text-ink-400 mt-2 font-mono">
                  {Math.round(results.overall_avg * 100)}% avg
                </p>
              </div>
            )}

            {/* Metric score cards */}
            <div className="col-span-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(results.aggregate_scores).map(([key, val]) => {
                const score = val as number;
                const pct = Math.round(score * 100);
                const color = scoreColor(score);
                return (
                  <div key={key} className="bg-white rounded-xl p-4 border border-ink-100 hover:border-ink-200 transition-all">
                    <p className="text-xs text-ink-400 mb-2 leading-tight">{METRIC_LABELS[key]}</p>
                    <p className="text-2xl font-display text-ink-800 mb-2">{pct}%</p>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <p className="text-[10px] text-ink-300 mt-1.5 leading-tight">
                      {METRIC_DESCRIPTIONS[key]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radar chart */}
            <div className="bg-white rounded-2xl border border-ink-100 p-5">
              <h3 className="text-sm font-medium text-ink-600 mb-4">Score Radar</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#eae8e1" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fontSize: 10, fill: '#9a8f78' }}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar chart */}
            <div className="bg-white rounded-2xl border border-ink-100 p-5">
              <h3 className="text-sm font-medium text-ink-600 mb-4">Score Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9a8f78' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: '#9a8f78' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => [`${v}%`, 'Score']}
                    contentStyle={{ background: '#2a2622', border: 'none', borderRadius: 8, color: '#eae8e1', fontSize: 12 }}
                  />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={scoreColor(entry.raw)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-question breakdown */}
          {results.per_question && results.per_question.length > 0 && (
            <div className="bg-white rounded-2xl border border-ink-100 p-5">
              <h3 className="text-sm font-medium text-ink-600 mb-4">Per-Question Results</h3>
              <div className="space-y-4">
                {results.per_question.map((q: any, i: number) => (
                  <div key={i} className="border border-ink-50 rounded-xl p-4 hover:border-ink-100 transition-all">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <p className="text-sm font-medium text-ink-700">{q.question}</p>
                      <span className="text-[10px] font-mono text-ink-400 flex-shrink-0">
                        {q.num_chunks_retrieved} chunks · {(q.avg_similarity * 100).toFixed(0)}% avg sim
                      </span>
                    </div>
                    <p className="text-xs text-ink-400 mb-3 line-clamp-2">{q.answer}</p>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(q.scores || {}).map(([m, s]) => (
                        <span
                          key={m}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${scoreColor(s as number)}18`,
                            color: scoreColor(s as number),
                          }}
                        >
                          {METRIC_LABELS[m]}: {Math.round((s as number) * 100)}%
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to improve */}
          <div className="bg-ink-50 rounded-2xl p-5 border border-ink-100">
            <h3 className="text-sm font-medium text-ink-700 mb-3">How to Improve Scores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-ink-500">
              <div>
                <p className="font-medium text-ink-600 mb-1">Low Faithfulness?</p>
                <p>Reduce chunk size (try 300 tokens) so context is more focused. Use stricter system prompt.</p>
              </div>
              <div>
                <p className="font-medium text-ink-600 mb-1">Low Answer Relevancy?</p>
                <p>Improve system prompt specificity. Add "Answer directly and concisely" instruction.</p>
              </div>
              <div>
                <p className="font-medium text-ink-600 mb-1">Low Context Recall?</p>
                <p>Increase top_k retrieval (try 8-10). Use hybrid search (keyword + vector).</p>
              </div>
              <div>
                <p className="font-medium text-ink-600 mb-1">Low Context Precision?</p>
                <p>Increase chunk overlap. Use a reranker model to filter retrieved chunks.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!results && status !== 'running' && (
        <div className="text-center py-20 text-ink-400">
          <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium mb-1">No evaluation results yet</p>
          <p className="text-xs">Upload documents, then click "Run Evaluation" to measure RAG quality.</p>
        </div>
      )}
    </div>
  );
}
