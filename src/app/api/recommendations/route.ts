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
    const candidates = aiResponse.recommendations.slice(0, 5);

    // Return AI results immediately — enrich with Open Library covers client-side
    const recommendations = candidates.map((rec) => ({
      ...rec,
      validationStatus: 'unvalidated' as const,
      bookData: undefined,
    }));

    return NextResponse.json({ recommendations, meta: { totalCandidates: candidates.length, validatedCount: candidates.length, removedCount: 0 } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Recommendation error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
