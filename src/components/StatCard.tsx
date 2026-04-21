import React from 'react';
import type { Icon } from '@phosphor-icons/react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  subtitle?: string;
  icon?: Icon;
}

export default function StatCard({ title, value, change, isPositive, subtitle, icon: IconComp }: StatCardProps): React.ReactElement {
  return (
    <div className="bg-card rounded-2xl border border-border px-4 pt-4 pb-3 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-t3">{title}</span>
        {IconComp && (
          <div className="w-8 h-8 rounded-3xl bg-accent-glow flex items-center justify-center shrink-0">
            <IconComp size={16} weight="duotone" className="text-accent" />
          </div>
        )}
      </div>

      <div>
        <div className="text-2xl font-bold text-t1 leading-tight">{value}</div>
        {subtitle && <p className="text-xs text-t3 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border-s pt-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            isPositive
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-red-500/10 text-red-500'
          }`}
        >
          {isPositive ? '+' : ''}{change}
        </span>
        <span className="text-xs text-t3">vs yesterday</span>
      </div>
    </div>
  );
}
