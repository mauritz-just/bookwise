import type {
  RawAIRecommendation,
  Recommendation,
  SelectedDimension,
  RecommendationCandidate,
  ValidatedRecommendationCandidate,
} from '@/types';
import { validateBook } from './openLibraryService';

/**
 * Pipeline step 3: verify each longlist candidate against Open Library.
 * Returns only the candidates that resolve to a real book, with the verified
 * bookData attached. Deduplicates by the verified title+author so two
 * candidates that resolve to the same book don't both survive.
 */
export async function validateRecommendationCandidates(
  candidates: RecommendationCandidate[],
): Promise<ValidatedRecommendationCandidate[]> {
  const results = await Promise.allSettled(
    candidates.map(async (c): Promise<ValidatedRecommendationCandidate | null> => {
      const bookData = await validateBook(c.title, c.author);
      if (!bookData) return null;
      return { ...c, validationStatus: 'validated', bookData };
    }),
  );

  const validated = results
    .filter(
      (r): r is PromiseFulfilledResult<ValidatedRecommendationCandidate | null> =>
        r.status === 'fulfilled' && r.value !== null,
    )
    .map((r) => r.value as ValidatedRecommendationCandidate);

  // Log what was generated but could not be verified, so the candidate
  // prompt can be tuned toward more canonical, verifiable titles.
  if (process.env.NODE_ENV !== 'production') {
    const failed = candidates.filter((c, i) => {
      const res = results[i];
      return res.status !== 'fulfilled' || res.value === null;
    });
    if (failed.length > 0) {
      console.log(
        `[pipeline] ${failed.length}/${candidates.length} candidates failed Open Library verification:`,
        failed.map((c) => `${c.title} — ${c.author}`),
      );
    }
  }

  const deduped = new Map<string, ValidatedRecommendationCandidate>();
  for (const v of validated) {
    const key = normalizeKey(v.bookData.title, v.bookData.author);
    if (!deduped.has(key)) deduped.set(key, v);
  }

  return Array.from(deduped.values());
}

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

const SPECULATIVE_KEYWORDS = [
  'fantasy', 'portal', 'mytholog', 'myth ', 'mythic', 'time travel', 'time-travel',
  'sci-fi', 'science fiction', 'speculative', 'magical realism', 'supernatural',
  'sorcery', 'wizard', 'dragon', 'magic ', 'dystopian',
];

const PLOT_KEYWORDS = [
  'plot', 'twist', 'mystery', 'adventure', 'premise', 'page-turner', 'thriller',
  'suspense', 'whodunit', 'fast-paced', 'action',
];

const REGISTER_MISMATCH_KEYWORDS = [
  'fantastical', 'fantasy', 'heroic', 'comic', 'comedic', 'satirical', 'satire',
  'high-concept', 'plot-driven', 'epic', 'whimsical', 'adventurous', 'mythic',
];

// Deterministic, approximate score caps applied after AI generation (Task 10).
// Heuristics scan the AI's own text fields; the prompt does the heavy lifting.
function applyScoreCaps(
  candidates: RawAIRecommendation[],
  selectedDimensions: SelectedDimension[],
): RawAIRecommendation[] {
  const hasHigh = selectedDimensions.some((d) => d.importance === 'high');
  const settingHigh = selectedDimensions.some((d) => d.dimension === 'setting' && d.importance === 'high');
  const toneFeelHigh = selectedDimensions.some(
    (d) => (d.dimension === 'tone' || d.dimension === 'emotionalFeel') && d.importance === 'high',
  );
  const plotLow = selectedDimensions.some((d) => d.dimension === 'plot' && d.importance === 'low');
  const genreSelected = selectedDimensions.some((d) => d.dimension === 'genre');

  return candidates.map((c) => {
    let cap = 100;
    const mismatch = c.possibleMismatch?.toLowerCase() ?? '';
    const why = c.whyItFits?.toLowerCase() ?? '';
    const hook = c.oneSentenceHook?.toLowerCase() ?? '';
    const tags = c.tags.map((t) => t.toLowerCase()).join(' ');
    const blob = `${mismatch} ${tags}`;

    // Rule 1: no HIGH dimension selected at all → cap 88
    if (!hasHigh) cap = Math.min(cap, 88);

    // Rule 5: Tone/EmotionalFeel HIGH + mismatch signals a different register → cap 79
    if (toneFeelHigh && REGISTER_MISMATCH_KEYWORDS.some((k) => mismatch.includes(k))) {
      cap = Math.min(cap, 79);
    }

    // Rule 6: Setting HIGH + speculative signals + Genre not selected → cap 79
    if (settingHigh && !genreSelected && SPECULATIVE_KEYWORDS.some((k) => blob.includes(k))) {
      cap = Math.min(cap, 79);
    }

    // Rule 4: Plot LOW + explanation leans on plot/mystery/twists → cap 79
    if (plotLow && PLOT_KEYWORDS.some((k) => why.includes(k) || hook.includes(k))) {
      cap = Math.min(cap, 79);
    }

    return cap < c.matchScore ? { ...c, matchScore: cap } : c;
  });
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

  // 2. Apply deterministic score caps based on selected dimensions + AI text signals
  filtered = applyScoreCaps(filtered, selectedDimensions);

  // 3. Remove score < 70
  const beforeQuality = filtered.length;
  filtered = filtered.filter((c) => c.matchScore >= 70);

  // 4. If there are high-importance dimensions, require at least one in matchingDimensions
  if (highDimensions.length > 0) {
    filtered = filtered.filter((c) =>
      highDimensions.some((d) => c.matchingDimensions.includes(d)),
    );
  }

  // 5. Deduplicate before validation
  filtered = deduplicateCandidates(filtered);

  const qualityRemovedCount = beforeQuality - filtered.length;

  // 6. Open Library validation (parallel)
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
