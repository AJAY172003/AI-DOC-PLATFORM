import { Activity, Coins, Clock, FileStack, Layers, Zap, ShieldCheck, Target } from 'lucide-react';
import type { MetricsSummary } from '../types';

interface MetricsCardsProps {
  metrics: MetricsSummary | null;
  loading: boolean;
}

export function MetricsCards({ metrics, loading }: MetricsCardsProps) {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-ink-100 animate-pulse">
            <div className="h-3 bg-ink-100 rounded w-20 mb-3" />
            <div className="h-6 bg-ink-100 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Queries',
      value: metrics.total_queries.toLocaleString(),
      icon: Activity,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      label: 'Tokens Used',
      value: metrics.total_tokens > 1000
        ? `${(metrics.total_tokens / 1000).toFixed(1)}K`
        : metrics.total_tokens.toLocaleString(),
      icon: Zap,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Estimated Cost',
      value: `$${metrics.total_cost.toFixed(4)}`,
      icon: Coins,
      color: 'text-ink-500',
      bg: 'bg-ink-50',
    },
    {
      label: 'Avg Latency',
      value: `${metrics.avg_latency_ms.toFixed(0)}ms`,
      icon: Clock,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Documents',
      value: metrics.documents_count.toLocaleString(),
      icon: FileStack,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
    {
      label: 'Chunks',
      value: metrics.chunks_count.toLocaleString(),
      icon: Layers,
      color: 'text-rose-500',
      bg: 'bg-rose-50',
    },
    {
      label: 'Avg Relevance',
      value: metrics.avg_relevance_score != null
        ? `${Math.round(metrics.avg_relevance_score * 100)}%`
        : 'N/A',
      icon: Target,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Grounded %',
      value: metrics.grounded_percentage != null
        ? `${metrics.grounded_percentage}%`
        : 'N/A',
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl p-4 border border-ink-100 hover:border-ink-200 transition-all animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-lg ${card.bg} flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
              <span className="text-xs text-ink-400">{card.label}</span>
            </div>
            <p className="text-xl font-display text-ink-800">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
