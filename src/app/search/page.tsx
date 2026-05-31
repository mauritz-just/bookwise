'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import type { Book } from '@/types';
import BookSearch from '@/components/BookSearch';
import SelectedBookCard from '@/components/SelectedBookCard';

const STORAGE_KEY = 'bookwise_selected_book';
const PREFS_KEY = 'bookwise_preferences';

export default function SearchPage() {
  const router = useRouter();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setSelectedBook(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const handleSelect = (book: Book) => {
    setSelectedBook(book);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
    localStorage.removeItem(PREFS_KEY);
  };

  const handleClear = () => {
    setSelectedBook(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleContinue = () => {
    if (selectedBook) router.push('/preferences');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Find a book you loved</h1>
        <p className="text-sm text-stone-500 mt-2">
          Search by title or author. This will be your taste reference.
        </p>
      </div>

      <div className="space-y-6">
        <BookSearch onSelect={handleSelect} selectedBook={selectedBook} />

        {selectedBook && (
          <div className="space-y-4 animate-slide-up">
            <SelectedBookCard book={selectedBook} onClear={handleClear} />
            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
            >
              Continue — select what you liked
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
