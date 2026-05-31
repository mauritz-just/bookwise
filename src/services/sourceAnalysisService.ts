import { z } from 'zod';
import type { RecommendationRequest, SourceBookAnalysis } from '@/types';
import { callAI } from './aiRecommendationService';
import { buildSourceAnalysisPrompt } from '@/prompts/sourceAnalysisPrompt';

const AnalysisSchema = z.object({
  sourceGenreMode: z.string().min(1),
  sourceSettingType: z.string().min(1),
  sourceEmotionalRegister: z.string().min(1),
  sourceSocialDynamics: z.string().min(1),
});

function fallbackAnalysis(): SourceBookAnalysis {
  return {
    sourceGenreMode: 'unspecified',
    sourceSettingType: 'unspecified',
    sourceEmotionalRegister: 'unspecified',
    sourceSocialDynamics: 'unspecified',
  };
}

/**
 * Step 1 of the pipeline: classify the source book along the four axes.
 * On any failure (network, parse, validation) we return a neutral fallback so
 * the pipeline can continue — the candidate/rerank steps still have the
 * selected dimensions to work with. RATE_LIMIT is rethrown so the route can
 * surface a 429.
 */
export async function analyzeSourceBook(
  request: RecommendationRequest,
): Promise<SourceBookAnalysis> {
  const prompt = buildSourceAnalysisPrompt(request);

  try {
    const { text } = await callAI(prompt, {
      temperature: 0.2,
      maxTokens: 800,
      seedKey: `analysis:${request.sourceBook.title}:${request.sourceBook.author}`,
    });

    const parsed = AnalysisSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      console.warn('[pipeline] source analysis failed validation — using fallback');
      return fallbackAnalysis();
    }
    return parsed.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'RATE_LIMIT') throw err;
    console.warn('[pipeline] source analysis error — using fallback:', message);
    return fallbackAnalysis();
  }
}
