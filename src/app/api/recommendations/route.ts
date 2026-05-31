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
  numberOfRecommendations: z.number().int().min(1).max(8).default(8),
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

  try {
    const aiResponse = await getAIRecommendations(parsed.data);
    const excludeTitles = parsed.data.excludeTitles ?? [];
    const filtered = aiResponse.recommendations.filter(
      (r) => !excludeTitles.some((t) => t.toLowerCase() === r.title.toLowerCase()),
    );
    const recommendations = await validateRecommendations(filtered, 5);
    const totalCandidates = aiResponse.recommendations.length;
    const validatedCount = recommendations.length;

    return NextResponse.json({
      recommendations,
      meta: {
        totalCandidates,
        validatedCount,
        removedCount: totalCandidates - validatedCount,
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
