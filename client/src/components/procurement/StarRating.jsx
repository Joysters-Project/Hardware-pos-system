import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StarRating({ value = 0, onChange, readonly = false, size = 20 }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            className={cn(
              'transition-transform',
              !readonly && 'hover:scale-110 cursor-pointer',
              readonly && 'cursor-default'
            )}
          >
            <Star
              size={size}
              className={cn(
                'transition-colors',
                filled ? 'text-amber-400 fill-amber-400' : 'text-slate-300 fill-slate-100'
              )}
            />
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-1 text-sm text-slate-500">{value}/5</span>
      )}
    </div>
  );
}

export default StarRating;
