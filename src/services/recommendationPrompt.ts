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
  low: 'nice to have',
  medium: 'moderately important',
  high: 'critically important',
};

export function buildRecommendationPrompt(request: RecommendationRequest): string {
  const { sourceBook, selectedDimensions, optionalRefinement, recommendationMode, numberOfRecommendations } = request;

  const dimensionList = selectedDimensions
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.importance] - order[b.importance];
    })
    .map((d) => `  - ${DIMENSION_PROSE[d.dimension]} [${IMPORTANCE_PROSE[d.importance]}]`)
    .join('\n');

  const modeInstructions: Record<string, string> = {
    balanced: 'Mix well-known titles with some lesser-known gems. Aim for variety across sub-genres while honouring the selected dimensions.',
    safe: 'Prioritise widely read, critically acclaimed books the reader is very likely to enjoy. Minimise risk.',
    unexpected: 'Surprise the reader. Recommend books they would not expect — cross genres, time periods, and styles — while still honouring the dimensions.',
    hiddenGems: 'Focus on underrated and overlooked books. Avoid bestsellers and obvious picks.',
  };

  const exclusionNote = request.excludeTitles && request.excludeTitles.length > 0
    ? `\n## Already recommended — do NOT include these\n${request.excludeTitles.map((t) => `- ${t}`).join('\n')}\n`
    : '';

  return `You are an expert literary advisor with encyclopaedic knowledge of fiction and non-fiction across all languages and centuries. Your job is to recommend books based on the specific reading experience a reader loved — not simply by genre or surface similarity.

## Reader's source book
Title: "${sourceBook.title}"
Author: ${sourceBook.author}${sourceBook.firstPublishYear ? `\nPublished: ${sourceBook.firstPublishYear}` : ''}

## What they valued (ordered by importance)
${dimensionList}

${optionalRefinement ? `## Reader's own words\n"${optionalRefinement}"\n` : ''}
${exclusionNote}## Mode
${modeInstructions[recommendationMode] ?? modeInstructions.balanced}

## Your task
Recommend exactly ${numberOfRecommendations} real, published books. Follow these rules strictly:

1. Every recommended book MUST be a real, verifiable published work. Do not invent titles.
2. Reason from the specific dimensions, especially those marked "critically important". Do not rely on shallow genre matching.
3. Include a mix of well-known and lesser-known titles unless the mode dictates otherwise.
4. For each book, be genuinely honest in the "possibleMismatch" field — this builds trust.
5. Do not recommend the source book itself.
6. The "whyItFits" field MUST be specific to THAT book and THAT reader's selected dimensions. Never write generic sentences that could apply to multiple books. Name specific qualities of the recommended book and tie them directly to the reader's stated preferences.
7. Return ONLY valid JSON — no prose before or after, no markdown fences.

## Required JSON format
{
  "recommendations": [
    {
      "title": "Exact published title",
      "author": "Author full name as commonly known",
      "matchScore": <integer 0–100>,
      "oneSentenceHook": "One compelling sentence on why this fits.",
      "premise": "A spoiler-free 2–3 sentence description of what this book is about — its setting, central character, and core situation. No plot twists, no endings. Written to intrigue, not summarise.",
      "whyItFits": "Two or three sentences that are SPECIFIC to this book. Reference the book's actual qualities — its prose, specific themes, narrative structure — and tie each point directly to the reader's selected dimensions. Do not write sentences that could describe any other book.",
      "matchingDimensions": ["dimension1", "dimension2"],
      "possibleMismatch": "One honest sentence about what might not work for this reader.",
      "tags": ["tag1", "tag2", "tag3"],
      "difficulty": "easy|medium|hard",
      "pacing": "slow|moderate|fast"
    }
  ]
}

Valid values for matchingDimensions array: plot, tone, characters, writingStyle, themes, setting, pacing, emotionalFeel, complexity, genre`;
}
