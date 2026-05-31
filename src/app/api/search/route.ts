import { NextRequest, NextResponse } from 'next/server';
import { searchBooks } from '@/services/openLibraryService';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  try {
    const books = await searchBooks(query.trim());
    return NextResponse.json({ books });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
