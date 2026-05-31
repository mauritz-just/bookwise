import Image from 'next/image';
import { Check } from 'lucide-react';
import type { Book } from '@/types';
import { cn } from '@/lib/utils';

interface BookSearchResultCardProps {
  book: Book;
  selected?: boolean;
  onSelect: (book: Book) => void;
}

export default function BookSearchResultCard({ book, selected, onSelect }: BookSearchResultCardProps) {
  return (
    <button
      onClick={() => onSelect(book)}
      className={cn(
        'w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all duration-150',
        selected
          ? 'border-amber-400 bg-amber-50 shadow-sm'
          : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm',
      )}
    >
      <div className="relative flex-shrink-0 w-10 h-14 rounded overflow-hidden bg-stone-100">
        {book.coverUrl ? (
          <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="40px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-xl">📖</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-900 truncate">{book.title}</p>
        <p className="text-xs text-stone-500 mt-0.5">{book.author}</p>
        {book.firstPublishYear && (
          <p className="text-[11px] text-stone-400 mt-1">{book.firstPublishYear}</p>
        )}
      </div>

      {selected && (
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
        </div>
      )}
    </button>
  );
}
