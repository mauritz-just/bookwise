'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import type { Book, SelectedDimension } from '@/types';
import SelectedBookCard from '@/components/SelectedBookCard';
import DimensionSelector from '@/components/DimensionSelector';
import OptionalRefinementInput from '@/components/OptionalRefinementInput';

const BOOK_KEY = 'bookwise_selected_book';
const PREFS_KEY = 'bookwise_preferences';

interface Preferences {
  selectedDimensions: SelectedDimension[];
  optionalRefinement: string;
}

export default function PreferencesPage() {
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [dimensions, setDimensions] = useState<SelectedDimension[]>([]);
  const [refinement, setRefinement] = useState('');

  useEffect(() => {
    const storedBook = localStorage.getItem(BOOK_KEY);
    if (!storedBook) { router.replace('/search'); return; }
    try { setBook(JSON.parse(storedBook)); } catch { router.replace('/search'); }

    const storedPrefs = localStorage.getItem(PREFS_KEY);
    if (storedPrefs) {
      try {
        const prefs: Preferences = JSON.parse(storedPrefs);
        setDimensions(prefs.selectedDimensions ?? []);
        setRefinement(prefs.optionalRefinement ?? '');
      } catch { /* ignore */ }
    }
  }, [router]);

  const handleContinue = () => {
    if (!book || dimensions.length === 0) return;
    const prefs: Preferences = { selectedDimensions: dimensions, optionalRefinement: refinement };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    router.push('/recommendations');
  };

  if (!book) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 mb-8 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Selected book */}
      <div className="mb-8">
        <SelectedBookCard book={book} />
      </div>

      {/* Headline */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
          What did you love about this book?
        </h1>
        <p className="text-sm text-stone-500 mt-2">
          Choose the aspects that mattered most. We'll use them to find books with a similar reading experience.
        </p>
      </div>

      {/* Dimensions */}
      <div className="mb-8">
        <DimensionSelector selected={dimensions} onChange={setDimensions} />
      </div>

      {/* Refinement */}
      <div className="mb-8">
        <OptionalRefinementInput value={refinement} onChange={setRefinement} />
      </div>

      {/* CTA */}
      <div className="sticky bottom-4">
        <button
          onClick={handleContinue}
          disabled={dimensions.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          Get recommendations
          <ArrowRight className="w-4 h-4" />
        </button>
        {dimensions.length === 0 && (
          <p className="text-center text-xs text-stone-400 mt-2">Select at least one aspect to continue.</p>
        )}
      </div>
    </div>
  );
}
