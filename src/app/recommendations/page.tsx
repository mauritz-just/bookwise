'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Info } from 'lucide-react';
import type { Book, SelectedDimension, Recommendation, RecommendationRequest } from '@/types';
import RecommendationCard from '@/components/RecommendationCard';
import SelectedBookCard from '@/components/SelectedBookCard';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

const BOOK_KEY = 'bookwise_selected_book';
const PREFS_KEY = 'bookwise_preferences';

interface Preferences {
  selectedDimensions: SelectedDimension[];
  optionalRefinement: string;
}

interface Meta {
  totalCandidates: number;
  validatedCount: number;
  removedCount: number;
}

export default function RecommendationsPage() {
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const storedBook = localStorage.getItem(BOOK_KEY);
    const storedPrefs = localStorage.getItem(PREFS_KEY);

    if (!storedBook || !storedPrefs) {
      router.replace('/search');
      return;
    }

    let parsedBook: Book;
    let parsedPrefs: Preferences;

    try {
      parsedBook = JSON.parse(storedBook);
      parsedPrefs = JSON.parse(storedPrefs);
    } catch {
      router.replace('/search');
      return;
    }

    setBook(parsedBook);

    const request: RecommendationRequest = {
      sourceBook: parsedBook,
      selectedDimensions: parsedPrefs.selectedDimensions,
      optionalRefinement: parsedPrefs.optionalRefinement || undefined,
      targetLanguage: 'English',
      numberOfRecommendations: 8,
      recommendationMode: 'balanced',
    };

    fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      })
      .then((data) => {
        setRecommendations(data.recommendations);
        setMeta(data.meta);
        setStatus('done');
      })
      .catch(() => setStatus('error'));
  }, [router]);

  const handleStartOver = () => {
    localStorage.removeItem(BOOK_KEY);
    localStorage.removeItem(PREFS_KEY);
    router.push('/search');
  };

  if (status === 'loading') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20">
        <LoadingState message="Generating and validating your recommendations…" />
        <p className="text-center text-xs text-stone-400 mt-4">
          We generate 8 candidates and verify each one exists in Open Library.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20">
        <ErrorState
          title="Something went wrong"
          description="We couldn't generate recommendations. Please try again."
        />
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => { hasFetched.current = false; setStatus('loading'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 mb-8 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to preferences
      </button>

      {/* Source book */}
      {book && <div className="mb-8"><SelectedBookCard book={book} /></div>}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Your recommendations</h1>
        <p className="text-sm text-stone-500 mt-1">Based on the reading experience you selected.</p>

        {meta && meta.removedCount > 0 && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200">
            <Info className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-stone-500">
              {meta.removedCount} candidate{meta.removedCount > 1 ? 's were' : ' was'} removed because{' '}
              {meta.removedCount > 1 ? 'they' : 'it'} could not be verified in Open Library.
              Showing {meta.validatedCount} verified result{meta.validatedCount !== 1 ? 's' : ''}.
            </p>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {recommendations.map((rec, i) => (
          <RecommendationCard key={`${rec.title}-${i}`} rec={rec} rank={i + 1} />
        ))}
      </div>

      {/* Start over */}
      <div className="mt-12 pt-8 border-t border-stone-100 text-center">
        <p className="text-sm text-stone-400 mb-3">Not quite right?</p>
        <button
          onClick={handleStartOver}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Start over with a different book
        </button>
      </div>
    </div>
  );
}
