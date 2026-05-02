import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { MetricsCards } from '../components/MetricsCards';
import { getMetricsSummary, getRecentMetrics } from '../services/api';
import type { MetricEntry, MetricsSummary } from '../types';

export function DashboardPage() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [recent, setRecent] = useState<MetricEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, r] = await Promise.all([getMetricsSummary(), getRecentMetrics(30)]);
        setSummary(s);
        setRecent(r);
      } catch {
        // API might not be running
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Prepare chart data — group by operation
  const operationData = recent.reduce<Record<string, { tokens: number; count: number }>>(
    (acc, m) => {
      if (!acc[m.operation]) acc[m.operation] = { tokens: 0, count: 0 };
      acc[m.operation].tokens += m.total_tokens;
      acc[m.operation].count += 1;
      return acc;
    },
    {}
  );

  const barData = Object.entries(operationData).map(([op, v]) => ({
    operation: op,
    tokens: v.tokens,
    calls: v.count,
  }));

  // Latency over time
  const latencyData = [...recent]
    .reverse()
    .map((m, i) => ({
      idx: i + 1,
      latency: Math.round(m.latency_ms),
      operation: m.operation,
    }));

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 animate-fade-in">
      <h1 className="font-display text-3xl text-ink-800 mb-2">Dashboard</h1>
      <p className="text-sm text-ink-400 mb-8">
        Monitor your AI usage — tokens, costs, latency, and operational metrics.
      </p>

      <div className="mb-8">
        <MetricsCards metrics={summary} loading={loading} />
      </div>

      {recent.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tokens by operation */}
          <div className="bg-white rounded-xl border border-ink-100 p-5">
            <h3 className="text-sm font-medium text-ink-600 mb-4">Tokens by Operation</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <XAxis
                  dataKey="operation"
                  tick={{ fontSize: 11, fill: '#9a8f78' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9a8f78' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#2a2622',
                    border: 'none',
                    borderRadius: 8,
                    color: '#eae8e1',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="tokens" fill="#f5a623" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Latency trend */}
          <div className="bg-white rounded-xl border border-ink-100 p-5">
            <h3 className="text-sm font-medium text-ink-600 mb-4">Latency Trend (ms)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={latencyData}>
                <XAxis
                  dataKey="idx"
                  tick={{ fontSize: 11, fill: '#9a8f78' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9a8f78' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#2a2622',
                    border: 'none',
                    borderRadius: 8,
                    color: '#eae8e1',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Recent calls table */}
          <div className="bg-white rounded-xl border border-ink-100 p-5 lg:col-span-2">
            <h3 className="text-sm font-medium text-ink-600 mb-4">Recent LLM Calls</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-ink-100">
                    <th className="text-left py-2 pr-4 text-ink-400 font-medium">Operation</th>
                    <th className="text-left py-2 pr-4 text-ink-400 font-medium">Model</th>
                    <th className="text-right py-2 pr-4 text-ink-400 font-medium">Input</th>
                    <th className="text-right py-2 pr-4 text-ink-400 font-medium">Output</th>
                    <th className="text-right py-2 pr-4 text-ink-400 font-medium">Latency</th>
                    <th className="text-right py-2 text-ink-400 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.slice(0, 15).map((m) => (
                    <tr key={m.id} className="border-b border-ink-50 hover:bg-ink-50/50">
                      <td className="py-2 pr-4 font-mono text-amber-600">{m.operation}</td>
                      <td className="py-2 pr-4 text-ink-500">{m.model}</td>
                      <td className="py-2 pr-4 text-right text-ink-600">{m.input_tokens}</td>
                      <td className="py-2 pr-4 text-right text-ink-600">{m.output_tokens}</td>
                      <td className="py-2 pr-4 text-right text-ink-600">{m.latency_ms.toFixed(0)}ms</td>
                      <td className="py-2 text-right font-mono text-ink-500">${m.estimated_cost.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && recent.length === 0 && (
        <div className="text-center py-16 text-ink-400">
          <p className="text-sm">No metrics yet. Start chatting with your documents to see data here.</p>
        </div>
      )}
    </div>
  );
}
