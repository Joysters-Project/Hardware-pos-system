import { cn } from '@/lib/utils';
import { Clock, CheckCircle, Truck, Package, XCircle, AlertTriangle } from 'lucide-react';

const statusConfig = {
  Pending: {
    label: 'Pending',
    variant: 'secondary',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
  },
  Open: {
    label: 'Open',
    variant: 'secondary',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
  },
  Approved: {
    label: 'Approved',
    variant: 'default',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: CheckCircle,
  },
  Shipped: {
    label: 'Shipped',
    variant: 'default',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Truck,
  },
  Received: {
    label: 'Received',
    variant: 'success',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: Package,
  },
  Cancelled: {
    label: 'Cancelled',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
  },
  Overdue: {
    label: 'Overdue',
    variant: 'destructive',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertTriangle,
  },
};

export function StatusBadge({ status, className }) {
  const config = statusConfig[status] || statusConfig.Pending;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export default StatusBadge;
