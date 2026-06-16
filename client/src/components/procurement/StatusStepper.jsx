import { motion } from 'framer-motion';
import { Check, Clock, Truck, Package, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { key: 'Pending', label: 'Pending', icon: Clock },
  { key: 'Approved', label: 'Approved', icon: Check },
  { key: 'Shipped', label: 'Shipped', icon: Truck },
  { key: 'Received', label: 'Received', icon: Package },
];

const statusIndex = {
  Pending: 0,
  Open: 0,
  Approved: 1,
  Shipped: 2,
  Received: 3,
  Cancelled: -1,
};

export function StatusStepper({ currentStatus, className }) {
  const currentIndex = statusIndex[currentStatus] ?? 0;
  const isCancelled = currentStatus === 'Cancelled';

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center py-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-4 px-8 py-6 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border-2 border-red-200 shadow-lg"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <XCircle className="h-10 w-10 text-red-500" />
          </motion.div>
          <div>
            <p className="font-bold text-red-700 text-lg">Order Cancelled</p>
            <p className="text-red-600">This purchase order has been cancelled and cannot be modified</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("py-6", className)}>
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-slate-200 mx-12" />
        
        {/* Progress Line Active */}
        <motion.div
          className="absolute top-6 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-12"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isCompleted && "bg-gradient-to-r from-blue-500 to-indigo-500 border-transparent text-white",
                  isCurrent && "bg-white border-blue-500 text-blue-500 shadow-lg shadow-blue-500/25",
                  !isCompleted && !isCurrent && "bg-white border-slate-200 text-slate-400"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </motion.div>
              
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className={cn(
                  "mt-3 text-sm font-medium",
                  isCurrent && "text-blue-600",
                  isCompleted && "text-slate-700",
                  !isCompleted && !isCurrent && "text-slate-400"
                )}
              >
                {step.label}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StatusStepper;
