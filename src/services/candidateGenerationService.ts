import { z } from 'zod';
import type {
  RecommendationRequest,
  SourceBookAnalysis,
  RecommendationCandidate,
} from '@/types';
import { callAI } from './aiRecommendationService';
import { buildCandidateGenerationPrompt } from '@/prompts/candidateGenerationPrompt';

const DIMENSION_ENUM = z
  .enum([
    'plot', 'tone', 'characters', 'writingStyle', 'themes',
    'setting', 'pacing', 'emotionalFeel', 'complexity', 'genre',
  ])
  .catch('setting' as const);

const CandidateSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  candidateReason: z.string().default(''),
  likelyMatchDimensions: z.array(DIMENSION_ENUM).default([]),
  riskFlags: z.array(z.string()).default([]),
});

const ResponseSchema = z.object({
  candidates: z.array(CandidateSchema),
});

/**
 * Step 2 of the pipeline: generate a broad longlist of candidate books (no
 * scores, no final copy). Throws a clear error if the model returns nothing
 * usable, since the pipeline cannot continue without candidates.
 */
export async function generateRecommendationCandidates(
  request: RecommendationRequest,
  analysis: SourceBookAnalysis,
  candidateCount = 25,
): Promise<RecommendationCandidate[]> {
  const prompt = buildCandidateGenerationPrompt(request, analysis, candidateCount);

  const exclude = (request.excludeTitles ?? []).map((t) => t.toLowerCase());

  const { text } = await callAI(prompt, {
    temperature: 0.5,
    maxTokens: 4000,
    seedKey: `candidates:${request.sourceBook.title}:${exclude.length}`,
  });

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Candidate generation returned invalid JSON');
  }

  const parsed = ResponseSchema.safeParse(json);
  if (!parsed.success || parsed.data.candidates.length === 0) {
    throw new Error('Candidate generation returned no usable candidates');
  }

  const sourceTitle = request.sourceBook.title.toLowerCase();

  // Drop the source book and excluded titles; dedupe by title+author.
  const seen = new Set<string>();
  const candidates: RecommendationCandidate[] = [];
  for (const c of parsed.data.candidates) {
    const titleLower = c.title.toLowerCase();
    if (titleLower === sourceTitle) continue;
    if (exclude.includes(titleLower)) continue;
    const key = `${titleLower}|${c.author.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(c);
  }

  return candidates;
}
