import type { Book } from '@/types';

const BASE = 'https://openlibrary.org';
const COVERS = 'https://covers.openlibrary.org';

export function getCoverUrl(coverId: number, size: 'S' | 'M' | 'L' = 'M'): string {
  return `${COVERS}/b/id/${coverId}-${size}.jpg`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToBook(doc: any): Book {
  return {
    id: doc.key,
    title: doc.title ?? 'Unknown Title',
    author: doc.author_name?.[0] ?? 'Unknown Author',
    firstPublishYear: doc.first_publish_year,
    coverUrl: doc.cover_i ? getCoverUrl(doc.cover_i) : undefined,
    openLibraryKey: doc.key,
    isbn: doc.isbn?.[0],
    subjects: doc.subject?.slice(0, 8),
    language: doc.language?.[0],
  };
}

// Strip articles, punctuation, spaces → bare token for fuzzy matching
function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')   // strip leading articles
    .replace(/\s*[/:–—]\s*.+$/, '')   // strip subtitles after / : – —
    .replace(/[^a-z0-9]/g, '');       // keep only alphanumeric
}

function normalizeAuthor(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

function isBetterEdition(candidate: Book, current: Book): boolean {
  const hasCover = (b: Book) => !!b.coverUrl;
  if (hasCover(candidate) && !hasCover(current)) return true;
  if (!hasCover(candidate) && hasCover(current)) return false;
  return (candidate.firstPublishYear ?? 9999) < (current.firstPublishYear ?? 9999);
}

function deduplicateBooks(books: Book[]): Book[] {
  const seen = new Map<string, Book>();
  for (const book of books) {
    const key = `${normalizeTitle(book.title)}__${normalizeAuthor(book.author)}`;
    const existing = seen.get(key);
    if (!existing || isBetterEdition(book, existing)) {
      seen.set(key, book);
    }
  }
  return Array.from(seen.values());
}

export async function searchBooks(query: string, limit = 20): Promise<Book[]> {
  const url =
    `${BASE}/search.json?q=${encodeURIComponent(query)}&limit=${limit}` +
    `&fields=key,title,author_name,first_publish_year,cover_i,isbn,subject,language`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error('Open Library search failed');

  const data = await res.json();
  const books: Book[] = (data.docs ?? []).map(docToBook);
  return deduplicateBooks(books).slice(0, 10);
}

export async function validateBook(title: string, author: string): Promise<Book | null> {
  const query = `${title} ${author}`;
  const url =
    `${BASE}/search.json?q=${encodeURIComponent(query)}&limit=8` +
    `&fields=key,title,author_name,first_publish_year,cover_i,isbn`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return null;

  const data = await res.json();
  const docs: any[] = data.docs ?? []; // eslint-disable-line @typescript-eslint/no-explicit-any

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  const match = docs.find((doc) => {
    const docTitle = normalize(doc.title ?? '');
    const queryTitle = normalize(title);
    const titleOk =
      docTitle.includes(queryTitle) || queryTitle.includes(docTitle);

    const authorOk = (doc.author_name ?? []).some((a: string) => {
      const da = normalize(a);
      const qa = normalize(author);
      return da.includes(qa) || qa.includes(da);
    });

    return titleOk && authorOk;
  });

  return match ? docToBook(match) : null;
}
