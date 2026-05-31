import type { RecommendationRequest, SimilarityDimension, ImportanceLevel } from '@/types';

const DIMENSION_PROSE: Record<SimilarityDimension, string> = {
  plot: 'plot structure, narrative arc, and how the storyline unfolds',
  tone: 'overall tone and atmosphere',
  characters: 'character depth, development, and relationships',
  writingStyle: 'prose style, voice, and narrative technique',
  themes: 'central themes and ideas explored',
  setting: 'world-building, time period, and sense of place',
  pacing: 'story pacing and narrative rhythm',
  emotionalFeel: 'emotional impact and resonance',
  complexity: 'narrative and thematic complexity',
  genre: 'genre conventions and reader expectations',
};

const IMPORTANCE_PROSE: Record<ImportanceLevel, string> = {
  low: 'weak signal only — do not drive recommendations based on this',
  medium: 'supporting signal — matters but does not dominate',
  high: 'MANDATORY — must be strongly present in every recommendation',
};

export function buildRecommendationPrompt(request: RecommendationRequest): string {
  const { sourceBook, selectedDimensions, optionalRefinement, recommendationMode, numberOfRecommendations } = request;

  const highDimensions = selectedDimensions.filter((d) => d.importance === 'high');
  const mediumDimensions = selectedDimensions.filter((d) => d.importance === 'medium');
  const lowDimensions = selectedDimensions.filter((d) => d.importance === 'low');

  const dimensionBlock = [
    highDimensions.length > 0 && `### HIGH importance (MANDATORY in every recommendation)\n${highDimensions.map((d) => `  - ${DIMENSION_PROSE[d.dimension]}`).join('\n')}`,
    mediumDimensions.length > 0 && `### MEDIUM importance (supporting signal)\n${mediumDimensions.map((d) => `  - ${DIMENSION_PROSE[d.dimension]}`).join('\n')}`,
    lowDimensions.length > 0 && `### LOW importance (weak signal — do not drive recommendations based on these)\n${lowDimensions.map((d) => `  - ${DIMENSION_PROSE[d.dimension]}`).join('\n')}`,
  ].filter(Boolean).join('\n\n');

  const descriptionText = sourceBook.description
    ? `\nDescription: ${sourceBook.description.slice(0, 1000)}${sourceBook.description.length > 1000 ? '…' : ''}`
    : '';
  const subjectsText = sourceBook.subjects && sourceBook.subjects.length > 0
    ? `\nSubjects/genres: ${sourceBook.subjects.slice(0, 15).join(', ')}`
    : '';

  const modeInstructions: Record<string, string> = {
    balanced: 'Mix well-known titles with some lesser-known gems. Aim for variety while strictly honouring the selected dimensions.',
    safe: 'Prioritise widely read, critically acclaimed books the reader is very likely to enjoy. Minimise risk.',
    unexpected: 'Surprise the reader. Recommend books they would not expect — cross genres, time periods, styles — while still honouring the HIGH-importance dimensions.',
    hiddenGems: 'Focus on underrated and overlooked books. Avoid bestsellers and obvious picks.',
  };

  const exclusionNote = request.excludeTitles && request.excludeTitles.length > 0
    ? `\n## Already shown — do NOT include these\n${request.excludeTitles.map((t) => `- ${t}`).join('\n')}\n`
    : '';

  const highDimNames = highDimensions.map((d) => d.dimension).join(', ');

  const negativeRules = [
    '- It is literary, acclaimed, or philosophical in general',
    '- It shares broad themes like love, mortality, memory, identity, or power',
    '- It belongs to the same genre or time period',
    '- The plot is vaguely similar',
    !selectedDimensions.some((d) => d.dimension === 'complexity') && '- It is intellectually complex, experimental, postmodern, or surrealist (complexity was not selected)',
    !selectedDimensions.some((d) => d.dimension === 'setting') && '- It shares a similar setting, historical period, mythology, worldbuilding, or speculative premise (setting was not selected)',
    !selectedDimensions.some((d) => d.dimension === 'writingStyle') && '- The prose style or narrative technique is similar (writing style was not selected)',
    selectedDimensions.some((d) => d.dimension === 'plot' && d.importance === 'low') && '- The plot structure is similar (plot was selected as LOW importance)',
  ].filter(Boolean).join('\n');

  return `You are an expert literary advisor. Your task is to recommend books based on the EXACT reading experience a reader loved — not based on general genre similarity, literary prestige, or broad thematic overlap.

## Source book
Title: "${sourceBook.title}"
Author: ${sourceBook.author}${sourceBook.firstPublishYear ? `\nPublished: ${sourceBook.firstPublishYear}` : ''}${descriptionText}${subjectsText}

IMPORTANT: The description and subjects above are context to understand the source book. They are NOT instructions for what to match. Do not recommend books simply because they share themes from the description. The selected dimensions below are the only criteria that determine what similarity matters.

## Selected similarity dimensions
${dimensionBlock}

${optionalRefinement ? `## Reader's own words\n"${optionalRefinement}"\n` : ''}${exclusionNote}## Recommendation mode
${modeInstructions[recommendationMode] ?? modeInstructions.balanced}

## Strict reasoning rules

Before including any book, answer these questions internally:

1. Does this book STRONGLY match the HIGH-importance dimensions? (${highDimNames || 'none'})
   If no → do not include it, or score below 70.
2. Is the similarity more specific than "broad themes"?
   Broad theme overlap alone (love, mortality, identity, memory, oppression) is NOT sufficient. The reading EXPERIENCE must match.
3. Is the emotional register similar?
   A book with a different emotional register (heroic vs. melancholic, comic vs. tragic, fast-paced vs. meditative) should score below 70 unless the selected dimensions justify it.
4. Would the reader understand why this book was recommended based on the dimensions they selected?
   If the recommendation would feel like a mismatch, reduce the score or remove it.

## Do NOT recommend a book primarily because:
${negativeRules}

## Score calibration — use this scale strictly

90–100: Exceptional. Strongly matches nearly ALL high-importance dimensions. No major mismatch.
80–89: Strong. Matches main high-importance dimensions with one notable difference.
70–79: Partial. Matches some dimensions with clear limitations.
Below 70: DO NOT include.

If the main similarity is broad themes, subtract 15–30 points from your initial score.
Do not give 85–95 to books that are only thematically related or generally literary.

## Your task
Recommend exactly ${numberOfRecommendations} real, published books. All must score 70 or above.

Rules:
1. Every book must be a real, verifiable published work. Do not invent titles.
2. Do not recommend the source book itself.
3. Each high-importance dimension must appear in matchingDimensions for each recommendation.
4. "whyItFits" must explicitly name the selected dimensions and explain how this specific book matches them. No generic blurbs. Write like a literary advisor explaining a precise match.
5. "possibleMismatch" must be honest and specific — name a real difference, not a vague hedge.
6. No duplicates.
7. Return ONLY valid JSON — no prose, no markdown fences.

## Required JSON format
{
  "recommendations": [
    {
      "title": "Exact published title",
      "author": "Author full name as commonly known",
      "matchScore": <integer 70–100>,
      "oneSentenceHook": "One compelling sentence on why this fits the selected dimensions.",
      "premise": "A spoiler-free 2–3 sentence description — setting, central character, core situation. No twists, no endings.",
      "whyItFits": "Two or three sentences that explicitly reference the selected dimensions by name. Explain how this book's specific qualities match the reader's priorities. Do not write sentences that could apply to any book.",
      "matchingDimensions": ["dimension1", "dimension2"],
      "possibleMismatch": "One specific, honest sentence about a real difference that might not work for this reader.",
      "tags": ["tag1", "tag2", "tag3"],
      "difficulty": "easy|medium|hard",
      "pacing": "slow|moderate|fast"
    }
  ]
}

Valid values for matchingDimensions: plot, tone, characters, writingStyle, themes, setting, pacing, emotionalFeel, complexity, genre`;
}
