import { z } from 'zod';
import type {
  RecommendationRequest,
  SourceBookAnalysis,
  ValidatedRecommendationCandidate,
  Recommendation,
  RawAIRecommendation,
} from '@/types';
import { callAI } from './aiRecommendationService';
import { buildRerankingPrompt } from '@/prompts/rerankingPrompt';

const DIMENSION_ENUM = z
  .enum([
    'plot', 'tone', 'characters', 'writingStyle', 'themes',
    'setting', 'pacing', 'emotionalFeel', 'complexity', 'genre',
  ])
  .catch('setting' as const);

const RankedSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  matchScore: z.number().int().min(0).max(100),
  oneSentenceHook: z.string().default(''),
  premise: z.string().optional(),
  whyItFits: z.string().default(''),
  matchingDimensions: z.array(DIMENSION_ENUM).default([]),
  possibleMismatch: z.string().default(''),
  tags: z.array(z.string()).default([]),
  difficulty: z.enum(['easy', 'medium', 'hard']).catch('medium' as const),
  pacing: z.enum(['slow', 'moderate', 'fast']).catch('moderate' as const),
});

const ResponseSchema = z.object({
  recommendations: z.array(RankedSchema),
});

function normalizeKey(title: string, author: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${norm(title)}|${norm(author)}`;
}

/** Build a Recommendation from a validated candidate using a modest default score. */
function candidateToRecommendation(
  c: ValidatedRecommendationCandidate,
  score: number,
): Recommendation {
  const raw: RawAIRecommendation = {
    title: c.bookData.title,
    author: c.bookData.author,
    matchScore: score,
    oneSentenceHook: c.candidateReason,
    premise: c.bookData.description?.slice(0, 400),
    whyItFits: c.candidateReason,
    matchingDimensions: c.likelyMatchDimensions,
    possibleMismatch: c.riskFlags[0] ?? '',
    tags: [],
    difficulty: 'medium',
    pacing: 'moderate',
  };
  return { ...raw, validationStatus: 'validated', bookData: c.bookData };
}

/**
 * Step 4 of the pipeline: rank the validated candidates and produce final
 * user-facing Recommendations. The model may ONLY pick from the validated
 * list; any returned title that doesn't match a validated candidate is
 * dropped, and the matched candidate's verified bookData is attached (the
 * model cannot invent metadata). On failure, fall back to the validated
 * candidates with a modest default score so the user still gets results.
 */
export async function rerankValidatedCandidates(
  request: RecommendationRequest,
  analysis: SourceBookAnalysis,
  validatedCandidates: ValidatedRecommendationCandidate[],
  finalCount = 5,
): Promise<Recommendation[]> {
  if (validatedCandidates.length === 0) return [];

  // Lookup from normalized title+author back to the validated candidate.
  const byKey = new Map<string, ValidatedRecommendationCandidate>();
  for (const c of validatedCandidates) {
    byKey.set(normalizeKey(c.title, c.author), c);
    // Also index by the (possibly cleaned) Open Library metadata.
    byKey.set(normalizeKey(c.bookData.title, c.bookData.author), c);
  }

  const fallback = (): Recommendation[] =>
    validatedCandidates
      .slice(0, finalCount)
      .map((c) => candidateToRecommendation(c, 75));

  const prompt = buildRerankingPrompt(request, analysis, validatedCandidates, finalCount);

  let text: string;
  try {
    ({ text } = await callAI(prompt, {
      temperature: 0.3,
      maxTokens: 4000,
      seedKey: `rerank:${request.sourceBook.title}:${validatedCandidates.length}`,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'RATE_LIMIT') throw err;
    console.warn('[pipeline] reranking error — using fallback ordering:', message);
    return fallback();
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.warn('[pipeline] reranking returned invalid JSON — using fallback ordering');
    return fallback();
  }

  const parsed = ResponseSchema.safeParse(json);
  if (!parsed.success || parsed.data.recommendations.length === 0) {
    console.warn('[pipeline] reranking returned no usable results — using fallback ordering');
    return fallback();
  }

  const used = new Set<string>();
  const recommendations: Recommendation[] = [];

  for (const r of parsed.data.recommendations) {
    if (r.matchScore < 70) continue;
    const candidate = byKey.get(normalizeKey(r.title, r.author));
    // Enforce "cannot invent": skip anything not in the validated list.
    if (!candidate) continue;
    const key = normalizeKey(candidate.bookData.title, candidate.bookData.author);
    if (used.has(key)) continue;
    used.add(key);

    recommendations.push({
      title: candidate.bookData.title,
      author: candidate.bookData.author,
      matchScore: r.matchScore,
      oneSentenceHook: r.oneSentenceHook,
      premise: r.premise,
      whyItFits: r.whyItFits,
      matchingDimensions: r.matchingDimensions,
      possibleMismatch: r.possibleMismatch,
      tags: r.tags,
      difficulty: r.difficulty,
      pacing: r.pacing,
      validationStatus: 'validated',
      bookData: candidate.bookData,
    });
  }

  if (recommendations.length === 0) return fallback();

  return recommendations
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, finalCount);
}
