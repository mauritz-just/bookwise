'use client';

import type { ImportanceLevel } from '@/types';
import { cn } from '@/lib/utils';

const LEVELS: { value: ImportanceLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

interface ImportanceSelectorProps {
  value: ImportanceLevel;
  onChange: (val: ImportanceLevel) => void;
}

export default function ImportanceSelector({ value, onChange }: ImportanceSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-stone-400 mr-1">Importance:</span>
      {LEVELS.map((level) => (
        <button
          key={level.value}
          onClick={() => onChange(level.value)}
          className={cn(
            'px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors',
            value === level.value
              ? level.value === 'high'
                ? 'bg-amber-500 text-white'
                : level.value === 'medium'
                  ? 'bg-amber-300 text-amber-900'
                  : 'bg-stone-200 text-stone-700'
              : 'bg-stone-100 text-stone-400 hover:bg-stone-200',
          )}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}
