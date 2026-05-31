import type { RecommendationRequest, SourceBookAnalysis, SimilarityDimension } from '@/types';
import { DIMENSION_LABELS } from '@/types';

const DIMENSION_PROSE: Record<SimilarityDimension, string> = {
  plot: 'plot structure, narrative arc, and how the storyline unfolds',
  tone: 'overall tone and atmosphere',
  characters: 'character depth, development, and relationships',
  writingStyle: 'prose style, voice, and narrative technique',
  themes: 'central themes and ideas explored',
  setting: 'the social and physical world: place, time period, social environment, institutions, class, geography, atmosphere',
  pacing: 'story pacing and narrative rhythm',
  emotionalFeel: 'emotional impact and resonance',
  complexity: 'narrative and thematic complexity',
  genre: 'genre conventions and reader expectations',
};

export function buildCandidateGenerationPrompt(
  request: RecommendationRequest,
  analysis: SourceBookAnalysis,
  candidateCount: number,
): string {
  const { sourceBook, selectedDimensions, optionalRefinement } = request;

  const highDimensions = selectedDimensions.filter((d) => d.importance === 'high');
  const mediumDimensions = selectedDimensions.filter((d) => d.importance === 'medium');
  const lowDimensions = selectedDimensions.filter((d) => d.importance === 'low');

  const dimensionBlock = [
    highDimensions.length > 0 && `HIGH importance (prioritize these): ${highDimensions.map((d) => `${DIMENSION_LABELS[d.dimension]} (${DIMENSION_PROSE[d.dimension]})`).join('; ')}`,
    mediumDimensions.length > 0 && `MEDIUM importance: ${mediumDimensions.map((d) => DIMENSION_LABELS[d.dimension]).join(', ')}`,
    lowDimensions.length > 0 && `LOW importance (weak signal): ${lowDimensions.map((d) => DIMENSION_LABELS[d.dimension]).join(', ')}`,
  ].filter(Boolean).join('\n');

  const exclusionNote = request.excludeTitles && request.excludeTitles.length > 0
    ? `\n## Already shown — do NOT include these\n${request.excludeTitles.map((t) => `- ${t}`).join('\n')}\n`
    : '';

  return `You are generating a LONGLIST of candidate books — NOT final recommendations. Do not score them. Do not write final user-facing explanations. Your only job is to produce a broad but relevant longlist of real published books.

## Source book
Title: "${sourceBook.title}"
Author: ${sourceBook.author}

## Source book analysis (the authoritative interpretation of the source book)
- Genre mode: ${analysis.sourceGenreMode}
- Setting type: ${analysis.sourceSettingType}
- Emotional register: ${analysis.sourceEmotionalRegister}
- Social dynamics: ${analysis.sourceSocialDynamics}

## Selected dimensions
${dimensionBlock}

${optionalRefinement ? `## Reader's own words\n"${optionalRefinement}"\n` : ''}${exclusionNote}
## Rules
1. Candidates must be real, verifiable published books.
2. Do NOT include the source book itself.
3. No duplicates.
4. Prioritize candidates that match the HIGH-importance dimensions.
5. Use the source book analysis above as the main interpretation of the source book. Match its genre mode, setting type, emotional register, and social dynamics — not just broad themes.
6. Include both obvious strong candidates AND some less obvious but defensible ones.
7. Do NOT score candidates.
8. Do NOT over-select books from the same author (at most 1–2 by any single author).
9. Avoid broad-theme-only candidates unless you mark them with riskFlags.
10. Include riskFlags honestly — note anything that might later cause this book to be downranked.

Useful riskFlag examples: "more plot-driven", "more traumatic", "genre-mode mismatch", "less emotionally restrained", "more fantasy-driven", "too complex", "broad-theme match only", "different setting type", "more comic", "more heroic".

## Generate ${candidateCount} candidates

Return ONLY this JSON — no prose, no markdown fences:
{
  "candidates": [
    {
      "title": "Exact published title",
      "author": "Author full name",
      "candidateReason": "Short note on why this could be a candidate (NOT a final recommendation explanation).",
      "likelyMatchDimensions": ["tone", "emotionalFeel"],
      "riskFlags": ["more plot-driven"]
    }
  ]
}

Valid dimension values: plot, tone, characters, writingStyle, themes, setting, pacing, emotionalFeel, complexity, genre`;
}
