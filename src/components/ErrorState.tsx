import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function ErrorState({
  title = 'Something went wrong',
  description,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-red-400" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-stone-700">{title}</p>
      {description && <p className="text-xs text-stone-400 max-w-xs">{description}</p>}
    </div>
  );
}
