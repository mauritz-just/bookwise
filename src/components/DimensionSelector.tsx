'use client';

import { ALL_DIMENSIONS, DIMENSION_LABELS, DIMENSION_DESCRIPTIONS } from '@/types';
import type { SimilarityDimension, SelectedDimension, ImportanceLevel } from '@/types';
import { cn } from '@/lib/utils';
import ImportanceSelector from './ImportanceSelector';

interface DimensionSelectorProps {
  selected: SelectedDimension[];
  onChange: (selected: SelectedDimension[]) => void;
}

export default function DimensionSelector({ selected, onChange }: DimensionSelectorProps) {
  const selectedMap = new Map(selected.map((s) => [s.dimension, s.importance]));

  const toggle = (dim: SimilarityDimension) => {
    if (selectedMap.has(dim)) {
      onChange(selected.filter((s) => s.dimension !== dim));
    } else {
      onChange([...selected, { dimension: dim, importance: 'medium' }]);
    }
  };

  const setImportance = (dim: SimilarityDimension, importance: ImportanceLevel) => {
    onChange(selected.map((s) => (s.dimension === dim ? { ...s, importance } : s)));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {ALL_DIMENSIONS.map((dim) => {
        const isSelected = selectedMap.has(dim);
        const importance = selectedMap.get(dim) ?? 'medium';

        return (
          <div
            key={dim}
            className={cn(
              'rounded-xl border p-3 transition-all duration-150',
              isSelected
                ? 'border-amber-300 bg-amber-50 shadow-sm'
                : 'border-stone-200 bg-white hover:border-stone-300',
            )}
          >
            <button
              onClick={() => toggle(dim)}
              className="w-full text-left"
            >
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    'mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors',
                    isSelected
                      ? 'bg-amber-500 border-amber-500'
                      : 'border-stone-300 bg-white',
                  )}
                >
                  {isSelected && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-800">{DIMENSION_LABELS[dim]}</p>
                  <p className="text-xs text-stone-400 mt-0.5 leading-snug">{DIMENSION_DESCRIPTIONS[dim]}</p>
                </div>
              </div>
            </button>

            {isSelected && (
              <div className="mt-3 pl-6">
                <ImportanceSelector
                  value={importance}
                  onChange={(val) => setImportance(dim, val)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
