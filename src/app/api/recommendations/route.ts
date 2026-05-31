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
    const recommendations = await validateRecommendations(aiResponse.recommendations, 5);
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
    console.error('Recommendation error:', err);
    return NextResponse.json({ error: 'Recommendation generation failed' }, { status: 500 });
  }
}
