'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-stone-900 hover:text-amber-700 transition-colors">
          <BookOpen className="w-5 h-5" strokeWidth={1.75} />
          <span className="font-semibold tracking-tight text-sm">Bookwise</span>
        </Link>
        <Link
          href="/search"
          className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
        >
          Find a book
        </Link>
      </div>
    </header>
  );
}
