import Image from 'next/image';
import { X } from 'lucide-react';
import type { Book } from '@/types';

interface SelectedBookCardProps {
  book: Book;
  onClear?: () => void;
}

export default function SelectedBookCard({ book, onClear }: SelectedBookCardProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-stone-200 shadow-sm">
      <div className="relative flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden bg-stone-100 shadow-sm">
        {book.coverUrl ? (
          <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="56px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-2xl">📖</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1">Selected book</p>
        <p className="text-base font-semibold text-stone-900 leading-tight">{book.title}</p>
        <p className="text-sm text-stone-500 mt-0.5">{book.author}</p>
        {book.firstPublishYear && (
          <p className="text-xs text-stone-400 mt-1">{book.firstPublishYear}</p>
        )}
      </div>

      {onClear && (
        <button
          onClick={onClear}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
