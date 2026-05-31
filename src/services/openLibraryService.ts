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

// --- Robust validation helpers ---

// Remove subtitles (after : / – — -) and parentheticals like "(We Are Bob)".
function stripSubtitle(title: string): string {
  return title
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s*[/:–—-]\s.+$/, '')
    .trim();
}

// Lowercase, drop apostrophes, & → and, everything else → spaces.
function canonical(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compact(s: string): string {
  return canonical(s).replace(/\s+/g, '');
}

function lastNameToken(author: string): string {
  const parts = canonical(author).split(' ').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

function titleMatches(docTitle: string, queryTitle: string): boolean {
  const d = compact(docTitle);
  const q = compact(queryTitle);
  if (!d || !q) return false;
  if (d === q || d.includes(q) || q.includes(d)) return true;
  // Retry with subtitles/parentheticals stripped from both sides.
  const ds = compact(stripSubtitle(docTitle));
  const qs = compact(stripSubtitle(queryTitle));
  if (!ds || !qs) return false;
  return ds === qs || ds.includes(qs) || qs.includes(ds);
}

function authorClose(docAuthors: string[], queryAuthor: string): boolean {
  const qc = compact(queryAuthor);
  const ql = lastNameToken(queryAuthor);
  return docAuthors.some((a) => {
    const ac = compact(a);
    if (ac && qc && (ac.includes(qc) || qc.includes(ac))) return true;
    const al = lastNameToken(a);
    return !!al && !!ql && al === ql;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchDocs(query: string, limit = 10): Promise<any[]> {
  const url =
    `${BASE}/search.json?q=${encodeURIComponent(query)}&limit=${limit}` +
    `&fields=key,title,author_name,first_publish_year,cover_i,isbn`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.docs ?? [];
  } catch {
    return [];
  }
}

/**
 * Verify a book exists in Open Library, trying several search strategies and
 * tolerant matching (apostrophes, subtitles, parentheticals, author last
 * name). Accepts a strong title match when the author is close even if the
 * full author string doesn't match exactly. Returns the best edition found.
 */
export async function validateBook(title: string, author: string): Promise<Book | null> {
  const stripped = stripSubtitle(title);
  const ln = lastNameToken(author);

  const strategies = [
    `${title} ${author}`,        // title + author
    `${stripped} ${author}`,     // de-subtitled title + author
    `${stripped} ${ln}`,         // de-subtitled title + author last name
    title,                       // title only
    stripped,                    // de-subtitled title only
  ];

  const seenQuery = new Set<string>();
  for (const query of strategies) {
    const key = query.trim().toLowerCase();
    if (!key || seenQuery.has(key)) continue;
    seenQuery.add(key);

    const docs = await fetchDocs(query);
    const matches: Book[] = docs
      .filter((doc) => titleMatches(doc.title ?? '', title) && authorClose(doc.author_name ?? [], author))
      .map(docToBook);

    if (matches.length > 0) {
      let best = matches[0];
      for (const m of matches) if (isBetterEdition(m, best)) best = m;
      return best;
    }
  }

  return null;
}
