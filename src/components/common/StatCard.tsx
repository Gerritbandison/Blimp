import { type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string; positive?: boolean };
  subtitle?: string;
  onClick?: () => void;
}

export function StatCard({
  title, value, icon: Icon, iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50', trend, subtitle, onClick
}: StatCardProps) {
  return (
    <div
      className={clsx(
        'card p-5 flex items-start gap-4 transition-all duration-150',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300'
      )}
      onClick={onClick}
    >
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
        <Icon size={18} className={iconColor} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-gray-500 font-medium leading-tight">{title}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-1 tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        {trend && (
          <p className={clsx(
            'text-xs font-medium mt-1.5 flex items-center gap-1',
            trend.positive ? 'text-emerald-600' : 'text-red-500'
          )}>
            <span className={clsx(
              'inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]',
              trend.positive ? 'bg-emerald-50' : 'bg-red-50'
            )}>
              {trend.positive ? '\u2191' : '\u2193'}
            </span>
            {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
