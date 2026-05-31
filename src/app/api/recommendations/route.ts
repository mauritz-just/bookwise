import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIRecommendations } from '@/services/aiRecommendationService';
import { validateRecommendations } from '@/services/validationService';

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
  numberOfRecommendations: z.number().int().min(1).max(12).default(12),
  recommendationMode: z.enum(['balanced', 'safe', 'unexpected', 'hiddenGems']).default('balanced'),
  excludeTitles: z.array(z.string()).optional(),
});

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

  // Always ask AI for 12 candidates so the quality filter has room to work
  const requestWithMore = {
    ...parsed.data,
    numberOfRecommendations: 12,
  };

  try {
    const { response: aiResponse, source } = await getAIRecommendations(requestWithMore);

    const excludeTitles = parsed.data.excludeTitles ?? [];
    const afterExclusion = aiResponse.recommendations.filter(
      (r) => !excludeTitles.some((t) => t.toLowerCase() === r.title.toLowerCase()),
    );

    const { recommendations, qualityRemovedCount } = await validateRecommendations(
      afterExclusion,
      parsed.data.selectedDimensions,
      parsed.data.sourceBook.title,
      5,
    );

    const totalCandidates = afterExclusion.length;
    const validatedCount = recommendations.length;
    const removedCount = totalCandidates - validatedCount;

    return NextResponse.json({
      recommendations,
      source,
      meta: {
        totalCandidates,
        validatedCount,
        removedCount,
        qualityRemovedCount,
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
