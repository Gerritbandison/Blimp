import { clsx } from 'clsx';


type Status = string;

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  'Deployed':     { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  'Active':       { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  'In Stock':     { bg: 'bg-blue-100',  text: 'text-blue-700',  dot: 'bg-blue-500' },
  'In Repair':    { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'Pending':      { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'Onboarding':   { bg: 'bg-blue-100',  text: 'text-blue-700',  dot: 'bg-blue-500' },
  'Offboarding':  { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  'Retired':      { bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400' },
  'Offboarded':   { bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400' },
  'Inactive':     { bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400' },
  'Lost':         { bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500' },
  'Expired':      { bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500' },
  'Unused':       { bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400' },
  'Connected':    { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  'Disconnected': { bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400' },
  'Error':        { bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500' },
  'Syncing':      { bg: 'bg-blue-100',  text: 'text-blue-700',  dot: 'bg-blue-500' },
};

interface StatusBadgeProps {
  status: Status;
  showDot?: boolean;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, showDot = true, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bg, config.text,
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {showDot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      )}
      {status}
    </span>
  );
}
