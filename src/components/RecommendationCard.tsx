'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, Zap, ChevronDown, BookOpen, ThumbsDown, Loader2 } from 'lucide-react';
import type { Recommendation } from '@/types';
import { DIMENSION_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import MatchScoreBadge from './MatchScoreBadge';
import TagList from './TagList';

interface RecommendationCardProps {
  rec: Recommendation;
  rank: number;
  onReplace?: () => void;
  replacing?: boolean;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Light read',
  medium: 'Moderate',
  hard: 'Challenging',
};

const PACING_LABEL: Record<string, string> = {
  slow: 'Slow-burn',
  moderate: 'Steady',
  fast: 'Fast-paced',
};

export default function RecommendationCard({ rec, rank, onReplace, replacing }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cover = rec.bookData?.coverUrl;

  return (
    <div className={cn(
      'bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden animate-slide-up',
      replacing && 'opacity-50 pointer-events-none',
    )}>

      {/* Clickable header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
      >
        <div className="flex gap-4 p-5">
          {/* Cover */}
          <div className="relative flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-stone-100 shadow-sm">
            {cover ? (
              <Image src={cover} alt={rec.title} fill className="object-cover" sizes="64px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-300 text-2xl">📖</div>
            )}
            <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-stone-800 text-white flex items-center justify-center text-[10px] font-bold">
              {rank}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-stone-900 leading-snug">{rec.title}</h3>
                <p className="text-sm text-stone-500 mt-0.5">{rec.author}</p>
              </div>
              <MatchScoreBadge score={rec.matchScore} className="flex-shrink-0" />
            </div>

            <p className="text-sm text-stone-700 italic mt-2 leading-relaxed">"{rec.oneSentenceHook}"</p>

            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                {DIFFICULTY_LABEL[rec.difficulty]}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                {PACING_LABEL[rec.pacing]}
              </span>
            </div>
          </div>

          {/* Expand chevron */}
          <ChevronDown
            className={cn(
              'flex-shrink-0 w-4 h-4 text-stone-400 mt-1 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        </div>
      </button>

      {/* Thumbs down */}
      {onReplace && (
        <div className="px-5 pb-4 flex justify-end">
          <button
            onClick={onReplace}
            disabled={replacing}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-40"
            title="Not this one — find another"
          >
            {replacing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding another…</>
              : <><ThumbsDown className="w-3.5 h-3.5" /> Not this one</>
            }
          </button>
        </div>
      )}


      {/* Expandable body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-stone-100 pt-4">

          {/* Premise */}
          {rec.premise && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <BookOpen className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.75} />
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">What it's about</span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">{rec.premise}</p>
            </div>
          )}

          {/* Why it fits */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
              <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Why it fits</span>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">{rec.whyItFits}</p>
          </div>

          {/* Matching dimensions */}
          {rec.matchingDimensions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Strongest match</p>
              <div className="flex flex-wrap gap-1.5">
                {rec.matchingDimensions.map((d) => (
                  <span key={d} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                    {DIMENSION_LABELS[d]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {rec.tags.length > 0 && <TagList tags={rec.tags} />}

          {/* Possible mismatch */}
          {rec.possibleMismatch && (
            <div className="flex gap-2 p-3 rounded-xl bg-stone-50 border border-stone-100">
              <AlertTriangle className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
              <p className="text-xs text-stone-500 leading-relaxed">{rec.possibleMismatch}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
