import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export default function LoadingState({ message = 'Loading…', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-20', className)}>
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-stone-200" />
        <div className="absolute inset-0 rounded-full border-2 border-t-amber-600 animate-spin" />
      </div>
      <p className="text-sm text-stone-500">{message}</p>
    </div>
  );
}
