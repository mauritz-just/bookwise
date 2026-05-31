import { cn } from '@/lib/utils';

interface TagListProps {
  tags: string[];
  className?: string;
}

export default function TagList({ tags, className }: TagListProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
