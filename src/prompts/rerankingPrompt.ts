import type {
  RecommendationRequest,
  SourceBookAnalysis,
  SimilarityDimension,
  ValidatedRecommendationCandidate,
} from '@/types';
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

export function buildRerankingPrompt(
  request: RecommendationRequest,
  analysis: SourceBookAnalysis,
  candidates: ValidatedRecommendationCandidate[],
  finalCount: number,
): string {
  const { sourceBook, selectedDimensions, optionalRefinement, recommendationMode } = request;

  const highDimensions = selectedDimensions.filter((d) => d.importance === 'high');
  const mediumDimensions = selectedDimensions.filter((d) => d.importance === 'medium');
  const lowDimensions = selectedDimensions.filter((d) => d.importance === 'low');

  const dimensionBlock = [
    highDimensions.length > 0 && `### HIGH importance (MANDATORY in every recommendation)\n${highDimensions.map((d) => `  - ${DIMENSION_LABELS[d.dimension]}: ${DIMENSION_PROSE[d.dimension]}`).join('\n')}`,
    mediumDimensions.length > 0 && `### MEDIUM importance (supporting signal)\n${mediumDimensions.map((d) => `  - ${DIMENSION_LABELS[d.dimension]}: ${DIMENSION_PROSE[d.dimension]}`).join('\n')}`,
    lowDimensions.length > 0 && `### LOW importance (weak signal)\n${lowDimensions.map((d) => `  - ${DIMENSION_LABELS[d.dimension]}: ${DIMENSION_PROSE[d.dimension]}`).join('\n')}`,
  ].filter(Boolean).join('\n\n');

  const highDimNames = highDimensions.map((d) => d.dimension).join(', ');

  const complexityLow = selectedDimensions.some((d) => d.dimension === 'complexity' && d.importance === 'low');
  const pacingHigh = selectedDimensions.some((d) => d.dimension === 'pacing' && d.importance === 'high');
  const plotHigh = selectedDimensions.some((d) => d.dimension === 'plot' && d.importance === 'high');

  // Accessible, fast, problem-solving profile (e.g. Plot High + Pacing High + Complexity Low).
  const accessibleFastBlock = (pacingHigh || plotHigh) && complexityLow
    ? `\n## Accessibility & pace profile (the reader wants fast, accessible, NOT dense)
This reader prioritized fast/plot-forward reading with LOW complexity. Rank for a propulsive, accessible reading experience.

Prioritize (rank these higher):
- fast, accessible plotting and page-turner pacing
- science/problem-based problem-solving and clear stakes
- survival or mission structure; competence fantasy
- humor or lightness; momentum over rumination
- low-to-medium complexity

Penalize (rank these lower or drop):
- dense or "hard" sci-fi; slow, philosophical, or meditative sci-fi
- complex space opera; political / systems / governance sci-fi
- high-concept books that are more intellectually interesting than fast and fun
- challenging books generally (Complexity is LOW)

Apply these score caps strictly:
- If the book is challenging/dense and Complexity is LOW: cap at 82 unless it is extremely aligned on BOTH Plot and Pacing (fast, plot-forward).
- If Pacing is HIGH and the book is steady or slow: cap at 84.
- If the appeal is "intellectual curiosity" rather than problem-solving / mission / survival / fast plot: cap at 79.
- If the book is political / systems sci-fi rather than science-problem-solving adventure: cap at 75.

Such books may remain in the list as partial matches but must NOT rank near the top.\n`
    : '';

  const modeInstructions: Record<string, string> = {
    balanced: 'Mix well-known titles with some lesser-known gems while strictly honouring the selected dimensions.',
    safe: 'Prioritise widely read, critically acclaimed books the reader is very likely to enjoy. Minimise risk.',
    unexpected: 'Favour the more surprising defensible candidates while still honouring the HIGH-importance dimensions.',
    hiddenGems: 'Favour underrated and overlooked candidates over obvious bestsellers.',
  };

  const candidateList = candidates
    .map((c, i) => {
      const dims = c.likelyMatchDimensions.join(', ') || 'none';
      const flags = c.riskFlags.length > 0 ? c.riskFlags.join('; ') : 'none';
      return `${i + 1}. "${c.title}" by ${c.author}\n   candidateReason: ${c.candidateReason}\n   likelyMatchDimensions: ${dims}\n   riskFlags: ${flags}`;
    })
    .join('\n\n');

  return `You are an expert literary advisor performing the FINAL RANKING step of a recommendation pipeline. A longlist of real, Open-Library-verified candidate books is given below. Your job is to score and select the best ${finalCount} of them for this specific reader.

CRITICAL CONSTRAINT: You may ONLY choose books from the candidate list below. You may NOT invent, add, or substitute any other book. Every title and author you return must appear EXACTLY (verbatim) in the candidate list. Do not correct, reformat, or "improve" the titles or author names — copy them character-for-character.

## Source book
Title: "${sourceBook.title}"
Author: ${sourceBook.author}

## Source book analysis (authoritative interpretation)
- Genre mode: ${analysis.sourceGenreMode}
- Setting type: ${analysis.sourceSettingType}
- Emotional register: ${analysis.sourceEmotionalRegister}
- Social dynamics: ${analysis.sourceSocialDynamics}

## Selected similarity dimensions
${dimensionBlock}

${optionalRefinement ? `## Reader's own words\n"${optionalRefinement}"\n\n` : ''}## Recommendation mode
${modeInstructions[recommendationMode] ?? modeInstructions.balanced}
${accessibleFastBlock}
## Candidate longlist (choose ONLY from these)
${candidateList}

## How to score (apply strictly — 90+ MUST be rare)
A book may score 90 or above ONLY IF it strongly matches BOTH:
  (a) the highest-importance selected dimension (${highDimNames || 'none selected'}), AND
  (b) at least TWO of the four source classifications (genre mode, setting type, emotional register, social dynamics).
If it matches the highest dimension but only ONE source classification, score it 80–89. If it shares only the broad category or a single classification, score 70–79.

Penalties:
- Genre-mode mismatch (when Genre was not selected): cap at 79.
- Broad-theme-only overlap (love, loss, identity, memory, family, mortality, power, class) without matching emotional register / genre mode / setting type: subtract 15–30.
- Honour the candidate's own riskFlags — let them pull the score down where relevant.

In a list of ${finalCount}, usually only 0–2 books should score 90+. Below 70: drop the book (do not return it).

## Banned generic language
Do NOT use vague phrases ("the human experience", "search for meaning", "richly imagined world", "poignant and powerful", "deeply resonant", "captures the essence") unless made specific to this book. Never write a sentence that could apply to any book.

## Your task
From the candidate list, select up to ${finalCount} books, score them, and write final user-facing copy. Order them best-first. All returned books must score 70 or above.

For each:
- "whyItFits": 2–3 sentences naming the selected HIGH-importance dimension(s) and explaining the specific match to the source book — more than broad theme or genre.
- "possibleMismatch": one specific, honest, real difference (not a vague hedge).

Return ONLY this JSON — no prose, no markdown fences:
{
  "recommendations": [
    {
      "title": "Exact title copied verbatim from the candidate list",
      "author": "Exact author copied verbatim from the candidate list",
      "matchScore": <integer 70-100>,
      "oneSentenceHook": "One compelling sentence on why this fits the selected dimensions.",
      "premise": "A spoiler-free 2-3 sentence description — setting, central character, core situation. No twists, no endings.",
      "whyItFits": "Two or three specific sentences referencing the selected dimensions by name.",
      "matchingDimensions": ["dimension1", "dimension2"],
      "possibleMismatch": "One specific, honest sentence about a real difference.",
      "tags": ["tag1", "tag2", "tag3"],
      "difficulty": "easy|medium|hard",
      "pacing": "slow|moderate|fast"
    }
  ]
}

Valid values for matchingDimensions: plot, tone, characters, writingStyle, themes, setting, pacing, emotionalFeel, complexity, genre`;
}
