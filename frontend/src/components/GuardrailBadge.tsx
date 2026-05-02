import clsx from 'clsx';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import type { GuardrailResult } from '../types';

interface GuardrailBadgeProps {
  guardrail: GuardrailResult;
}

export function GuardrailBadge({ guardrail }: GuardrailBadgeProps) {
  const score = guardrail.relevance_score;
  const pct = Math.round(score * 100);

  const level =
    score >= 0.8 ? 'high' :
    score >= 0.5 ? 'medium' : 'low';

  const config = {
    high: {
      icon: ShieldCheck,
      label: 'Grounded',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      bar: 'bg-emerald-400',
    },
    medium: {
      icon: ShieldAlert,
      label: 'Partial',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      bar: 'bg-amber-400',
    },
    low: {
      icon: ShieldX,
      label: 'Ungrounded',
      color: 'text-red-500',
      bg: 'bg-red-50',
      bar: 'bg-red-400',
    },
  }[level];

  if (guardrail.safety_flagged) {
    return (
      <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-red-50 rounded-lg border border-red-100">
        <ShieldX className="w-3 h-3 text-red-500 flex-shrink-0" />
        <span className="text-[10px] text-red-600 font-medium">Safety flagged — review this response</span>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-lg',
        config.bg
      )}
      title={guardrail.explanation}
    >
      <Icon className={clsx('w-3 h-3 flex-shrink-0', config.color)} />
      <div className="flex items-center gap-1.5 flex-1">
        <span className={clsx('text-[10px] font-semibold', config.color)}>
          {config.label}
        </span>
        {/* Score bar */}
        <div className="flex-1 h-1 bg-white/60 rounded-full overflow-hidden max-w-[60px]">
          <div
            className={clsx('h-full rounded-full transition-all', config.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={clsx('text-[10px] font-mono', config.color)}>{pct}%</span>
      </div>
    </div>
  );
}
