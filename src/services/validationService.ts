import type { RawAIRecommendation, Recommendation, SelectedDimension } from '@/types';
import { validateBook } from './openLibraryService';

function normalizeKey(title: string, author: string): string {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\s+/g, '');
  return `${norm(title)}|${norm(author)}`;
}

function deduplicateCandidates(candidates: RawAIRecommendation[]): RawAIRecommendation[] {
  const seen = new Map<string, RawAIRecommendation>();
  for (const c of candidates) {
    const key = normalizeKey(c.title, c.author);
    const existing = seen.get(key);
    if (!existing || c.matchScore > existing.matchScore) {
      seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}

export async function validateRecommendations(
  candidates: RawAIRecommendation[],
  selectedDimensions: SelectedDimension[],
  sourceBookTitle: string,
  maxResults = 5,
): Promise<{ recommendations: Recommendation[]; qualityRemovedCount: number }> {
  const highDimensions = selectedDimensions
    .filter((d) => d.importance === 'high')
    .map((d) => d.dimension);

  const sourceKey = normalizeKey(sourceBookTitle, '');

  // 1. Remove source book
  let filtered = candidates.filter(
    (c) => normalizeKey(c.title, '').replace('|', '') !== sourceKey.replace('|', ''),
  );

  // 2. Remove score < 70
  const beforeQuality = filtered.length;
  filtered = filtered.filter((c) => c.matchScore >= 70);

  // 3. If there are high-importance dimensions, require at least one in matchingDimensions
  if (highDimensions.length > 0) {
    filtered = filtered.filter((c) =>
      highDimensions.some((d) => c.matchingDimensions.includes(d)),
    );
  }

  // 4. Deduplicate before validation
  filtered = deduplicateCandidates(filtered);

  const qualityRemovedCount = beforeQuality - filtered.length;

  // 5. Open Library validation (parallel)
  const results = await Promise.allSettled(
    filtered.map(async (rec): Promise<Recommendation> => {
      const bookData = await validateBook(rec.title, rec.author);
      return {
        ...rec,
        validationStatus: bookData ? 'validated' : 'unvalidated',
        bookData: bookData ?? undefined,
      };
    }),
  );

  const all: Recommendation[] = results
    .filter((r): r is PromiseFulfilledResult<Recommendation> => r.status === 'fulfilled')
    .map((r) => r.value);

  // 6. Keep only validated, deduplicate again, sort, slice
  const validated = all.filter((r) => r.validationStatus === 'validated');

  const deduped = new Map<string, Recommendation>();
  for (const r of validated) {
    const key = normalizeKey(r.title, r.author);
    const existing = deduped.get(key);
    if (!existing || r.matchScore > existing.matchScore) {
      deduped.set(key, r);
    }
  }

  const recommendations = Array.from(deduped.values())
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxResults);

  return { recommendations, qualityRemovedCount };
}
