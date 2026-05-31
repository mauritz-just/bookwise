import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function EmptyState({
  title = 'Nothing here yet',
  description,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
        <BookOpen className="w-5 h-5 text-stone-400" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-stone-700">{title}</p>
      {description && <p className="text-xs text-stone-400 max-w-xs">{description}</p>}
    </div>
  );
}
