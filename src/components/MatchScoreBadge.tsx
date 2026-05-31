import { cn } from '@/lib/utils';

interface MatchScoreBadgeProps {
  score: number;
  className?: string;
}

function scoreColor(score: number) {
  if (score >= 90) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (score >= 75) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  return 'bg-stone-100 text-stone-600 ring-1 ring-stone-200';
}

export default function MatchScoreBadge({ score, className }: MatchScoreBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
        scoreColor(score),
        className,
      )}
    >
      <span className="text-[10px] font-normal opacity-70">match</span>
      {score}%
    </div>
  );
}
