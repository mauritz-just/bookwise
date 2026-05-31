import type { RawAIRecommendation, Recommendation } from '@/types';
import { validateBook } from './openLibraryService';

export async function validateRecommendations(
  candidates: RawAIRecommendation[],
  maxResults = 5,
): Promise<Recommendation[]> {
  const results = await Promise.allSettled(
    candidates.map(async (rec): Promise<Recommendation> => {
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

  const validated = all
    .filter((r) => r.validationStatus === 'validated')
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxResults);

  return validated;
}
