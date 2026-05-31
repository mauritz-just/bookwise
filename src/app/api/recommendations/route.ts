import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveAIMode } from '@/services/aiRecommendationService';
import { analyzeSourceBook } from '@/services/sourceAnalysisService';
import { generateRecommendationCandidates } from '@/services/candidateGenerationService';
import { validateRecommendationCandidates } from '@/services/validationService';
import { rerankValidatedCandidates } from '@/services/rerankingService';
import type { RecommendationRequest } from '@/types';

const RequestSchema = z.object({
  sourceBook: z.object({
    id: z.string(),
    title: z.string(),
    author: z.string(),
    firstPublishYear: z.number().optional(),
    coverUrl: z.string().optional(),
    openLibraryKey: z.string(),
    isbn: z.string().optional(),
    description: z.string().optional(),
    subjects: z.array(z.string()).optional(),
    language: z.string().optional(),
  }),
  selectedDimensions: z.array(
    z.object({
      dimension: z.enum([
        'plot', 'tone', 'characters', 'writingStyle', 'themes',
        'setting', 'pacing', 'emotionalFeel', 'complexity', 'genre',
      ]),
      importance: z.enum(['low', 'medium', 'high']),
    }),
  ).min(1),
  optionalRefinement: z.string().optional(),
  targetLanguage: z.string().default('English'),
  numberOfRecommendations: z.number().int().min(1).max(12).default(5),
  recommendationMode: z.enum(['balanced', 'safe', 'unexpected', 'hiddenGems']).default('balanced'),
  excludeTitles: z.array(z.string()).optional(),
});

const isDev = process.env.NODE_ENV !== 'production';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const request: RecommendationRequest = parsed.data;
  const finalCount = request.numberOfRecommendations;
  const source = getActiveAIMode();

  try {
    // Step 1 — classify the source book.
    const analysis = await analyzeSourceBook(request);
    if (isDev) console.log('[pipeline] source analysis:', analysis);

    // Step 2 — generate a broad longlist (no scores).
    let candidates = await generateRecommendationCandidates(request, analysis, 25);
    if (isDev) console.log(`[pipeline] generated ${candidates.length} candidates`);

    // Step 3 — verify candidates against Open Library.
    let validated = await validateRecommendationCandidates(candidates);
    if (isDev) console.log(`[pipeline] ${validated.length} candidates verified in Open Library`);

    // If too few survived verification, do one extra generation round.
    if (validated.length < finalCount) {
      const exclude = [
        ...(request.excludeTitles ?? []),
        ...candidates.map((c) => c.title),
      ];
      const extra = await generateRecommendationCandidates(
        { ...request, excludeTitles: exclude },
        analysis,
        25,
      );
      const extraValidated = await validateRecommendationCandidates(extra);
      if (isDev) console.log(`[pipeline] extra round: +${extra.length} candidates, +${extraValidated.length} verified`);

      candidates = [...candidates, ...extra];
      const seen = new Set(validated.map((v) => `${v.bookData.title.toLowerCase()}|${v.bookData.author.toLowerCase()}`));
      for (const v of extraValidated) {
        const key = `${v.bookData.title.toLowerCase()}|${v.bookData.author.toLowerCase()}`;
        if (!seen.has(key)) { seen.add(key); validated.push(v); }
      }
    }

    const generatedCount = candidates.length;
    const unverifiedCount = generatedCount - validated.length;

    // Step 4 — rerank and produce final scored recommendations.
    const reranked = await rerankValidatedCandidates(request, analysis, validated, finalCount);
    if (isDev) console.log(`[pipeline] reranked to ${reranked.length} final recommendations`);

    const recommendations = reranked.slice(0, finalCount);
    const rerankRemovedCount = Math.max(validated.length - recommendations.length, 0);

    return NextResponse.json({
      recommendations,
      source,
      meta: {
        generatedCount,
        verifiedCount: validated.length,
        unverifiedCount,
        rerankRemovedCount,
        shownCount: recommendations.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Recommendation error:', message);
    if (message === 'RATE_LIMIT') {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
