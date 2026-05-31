'use client';

import { useState, useCallback, useRef } from 'react';
import { Search, X } from 'lucide-react';
import type { Book } from '@/types';
import BookSearchResultCard from './BookSearchResultCard';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

interface BookSearchProps {
  onSelect: (book: Book) => void;
  selectedBook?: Book | null;
}

export default function BookSearch({ onSelect, selectedBook }: BookSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.books ?? []);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setStatus('idle');
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder="Search by title, author, or ISBN…"
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {status === 'loading' && <LoadingState message="Searching Open Library…" className="py-8" />}

      {status === 'error' && (
        <ErrorState
          title="Search failed"
          description="Could not reach Open Library. Please try again."
        />
      )}

      {status === 'done' && results.length === 0 && (
        <EmptyState
          title="No results found"
          description="Try a different title or author name."
        />
      )}

      {status === 'done' && results.length > 0 && (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {results.map((book) => (
            <BookSearchResultCard
              key={book.id}
              book={book}
              selected={selectedBook?.id === book.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
