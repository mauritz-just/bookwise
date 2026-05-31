import type { RecommendationRequest, SimilarityDimension } from '@/types';

const DIMENSION_PROSE: Record<SimilarityDimension, string> = {
  plot: 'plot structure, narrative arc, and how the storyline unfolds',
  tone: 'overall tone and atmosphere',
  characters: 'character depth, development, and relationships',
  writingStyle: 'prose style, voice, and narrative technique',
  themes: 'central themes and ideas explored',
  setting: 'the social and physical world: place, time period, social environment, institutions, class, geography, and atmosphere (NOT fantasy-style world-building)',
  pacing: 'story pacing and narrative rhythm',
  emotionalFeel: 'emotional impact and resonance',
  complexity: 'narrative and thematic complexity',
  genre: 'genre conventions and reader expectations',
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

  const settingSelected = selectedDimensions.some((d) => d.dimension === 'setting');
  const genreSelected = selectedDimensions.some((d) => d.dimension === 'genre');
  const settingHigh = highDimensions.some((d) => d.dimension === 'setting');
  const toneOrFeelHigh = highDimensions.some((d) => d.dimension === 'tone' || d.dimension === 'emotionalFeel');

  const settingTypeCheck = settingSelected
    ? `\n## Setting / Social World check (selected)
First identify the SETTING TYPE of the source book. Examples: elite academic institution / dark academia, decaying aristocratic society, urban loneliness, postwar domestic world, rural family community, mythological ancient world, fantasy world, dystopian institution, immigrant social world, artistic/bohemian milieu.

Recommendations must match the same or a closely related setting type. ${settingHigh ? 'Setting is HIGH, so the social world must align closely.' : ''}${!genreSelected ? '\nBecause Genre was NOT selected: if the source book is realistic or literary fiction, do NOT recommend fantasy, portal fantasy, magical realism, mythological retellings, time-travel, or high-concept speculative books merely because they have strong world-building. Cap any such mismatch at 79.' : ''}`
    : '';

  const emotionalRegisterCheck = toneOrFeelHigh
    ? `\n## Emotional register check (Tone / Emotional Feel is HIGH)
First identify the EMOTIONAL REGISTER of the source book (e.g. quiet melancholy, subdued tragedy, romantic longing, moral unease, grief, restraint, inevitability, comic energy, heroic drama, satirical bite).
Recommend books that match that emotional register — not just books that share broad themes. If a candidate is more energetic, comic, heroic, fantastical, satirical, or plot-driven than the source book, score it below 80 unless the selected dimensions clearly justify the difference.`
    : '';

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

## STEP 1 — Classify the source book first (internal, do not output)
Before generating any recommendation, classify "${sourceBook.title}" along these four axes:

1. sourceGenreMode — e.g. literary realism, dark academia, campus novel, gothic mystery, psychological literary suspense, historical literary fiction, myth retelling, fantasy, high-concept science fiction, domestic realism, satire, postmodern fiction.
2. sourceSettingType — e.g. elite academic institution, closed intellectual student circle, decaying aristocratic society, urban loneliness, postwar domestic world, immigrant social world, artistic/bohemian milieu, mythological ancient world, dystopian institution.
3. sourceEmotionalRegister — e.g. melancholic, tense, morally uneasy, restrained, obsessive, satirical, comic, romantic, heroic, paranoid, surreal, nostalgic.
4. sourceSocialDynamics — e.g. class performance, secrecy, group pressure, intellectual elitism, privilege, moral corruption, family duty, romantic longing, institutional oppression, artistic ambition.

These four classifications define the SPECIFIC reading experience. A book is only a strong match if it shares the specific source classifications — not merely the same broad category (e.g. "realistic literary fiction" or "about class").

## STEP 2 — The 90+ gate (strict)
A recommendation may score 90 or above ONLY IF it strongly matches BOTH:
  (a) the highest-importance selected dimension, AND
  (b) at least TWO of the four source classifications above (sourceGenreMode, sourceSettingType, sourceEmotionalRegister, sourceSocialDynamics).

If a book matches the highest dimension but only ONE (or zero) source classifications, it must score below 90 — usually 70–85.

Do NOT give 90+ merely because a book is:
- realistic literary fiction
- about class
- about identity
- about relationships
- set in a wealthy or institutional environment
- character-driven
- by the same author

## Strict reasoning rules

Before including any book, answer these questions internally:

1. Does this book STRONGLY match the HIGH-importance dimensions? (${highDimNames || 'none'})
   If no → do not include it, or score below 70.
2. Is the similarity more specific than "broad themes"?
   Broad theme overlap alone is NOT sufficient. The reading EXPERIENCE must match.
3. Is the emotional register similar?
4. Is the GENRE MODE similar? (see genre-mode rule below)
5. Would the reader understand why this book was recommended based on the dimensions they selected?
   If the recommendation would feel like a mismatch, reduce the score or remove it.

## Do NOT recommend a book primarily because:
${negativeRules}

## Genre-mode mismatch penalty
Genre mode is the KIND of reading experience: literary realism, campus novel, dark academia, gothic mystery, domestic realism, historical literary fiction, fantasy, mythological retelling, high-concept science fiction, time-travel speculative fiction, magical realism, satire, philosophical/postmodern fiction.
A recommendation can share setting, themes, or tone but still be a WEAK match if its genre mode is very different from the source book and the selected dimensions do not justify the shift. When genre mode differs significantly and Genre was not selected, cap the score at 79.
- Do not recommend fantasy world-building for realistic dark academia unless Genre was selected.
- Do not recommend mythological retellings for campus literary fiction just because both reference Greek/classical material.
- Do not recommend time-travel or high-concept speculative fiction for literary social-world matching unless speculative genre is selected.
- Do not recommend surreal/postmodern books merely because they are intellectual or literary.
- Do not recommend heroic mythic romance for quiet melancholic realism.

## Broad-theme penalty
Do NOT treat these as strong matches on their own: love, loss, identity, memory, family, mortality, power, oppression, human relationships, the human condition, search for meaning, social class, belonging, trauma, coming of age.
If a recommendation mostly matches through broad themes but differs in emotional register, genre mode, pacing, setting type, or character experience, subtract 15–30 points.
${settingTypeCheck}${emotionalRegisterCheck}

## Banned generic language
Do NOT use these vague phrases unless you immediately make them specific to this book and the selected dimensions: "the human experience", "human relationships", "search for meaning", "complexities of life", "complexities of identity", "emotionally charged exploration", "richly imagined world", "poignant and powerful", "deeply resonant", "captures the essence".
Bad: "This novel explores love, loss, identity, and the human condition."
Good: "This fits the quiet, emotionally restrained melancholy you prioritized — its characters are shaped by memory and grief rather than by a fast plot."

## Score calibration — use this scale strictly. 90+ MUST BE RARE.
In a list of ${numberOfRecommendations} candidates, usually only 0–2 books should score 90+. If more than 3 exceed 90, recalibrate downward.

95–100: Near-perfect. Rare. Matches the highest-weighted dimension AND at least three of the four source classifications. No major mismatch.
90–94: Excellent. Matches the highest-weighted dimension AND at least two of the four source classifications (see the 90+ gate above). No major genre-mode mismatch.
80–89: Good but imperfect. Matches the highest dimension but only one source classification, or has a meaningful mismatch.
70–79: Partial. Shares the broad category or a single source classification (e.g. closed group dynamics) but lacks the specific genre mode, setting type, or emotional register.
Below 70: DO NOT include.

Never give 90+ to a book whose main similarity is broad themes, literary prestige, author fame, generic atmosphere, or merely "realistic literary fiction about class/identity/relationships".

Example recalibration (for The Secret History with Setting / Social World High):
- The Remains of the Day: partial social-world match, but lacks dark academia, youth clique dynamics, secrecy, and intellectual group pressure → below 85.
- The Goldfinch: strong Tartt-style match, but NOT dark academia. Cap below 90 unless the explanation focuses on dense social worlds, art obsession, moral drift, and psychological consequences. Never label it "dark academia".
- The Interestings, The Group, The Rules of Attraction: valid partial matches at 75–82 (closed group dynamics, but not dark academic tone).
- If We Were Villains, Bunny, Brideshead Revisited, The Name of the Rose, Possession, The Likeness, The Truants, Black Chalk, The Secret Place: favoured — closed intellectual/elite social worlds with secrecy and moral pressure.

## Your task
Recommend exactly ${numberOfRecommendations} real, published books. All must score 70 or above.

Rules:
1. Every book must be a real, verifiable published work. Do not invent titles.
2. Do not recommend the source book itself.
3. Each high-importance dimension must appear in matchingDimensions for each recommendation.
4. "whyItFits" must: (a) name the selected high-importance dimension, (b) explain how this book matches that dimension, (c) give one specific similarity to the source book, (d) make clear the match is more than broad theme or genre. No generic blurbs. When Setting / Social World is involved, name the SPECIFIC social world type (e.g. "a closed intellectual environment where class, education, secrecy, and group pressure shape moral choices") — never generic phrasing like "realistic literary fiction focused on social institutions". Do not falsely label a book "dark academia" if it is not.
5. "possibleMismatch" must name a specific, real difference (e.g. "More fantasy-driven than The Secret History, so its world feels like magical escapism rather than dark academia"). Never a vague hedge like "the pacing may be slow" or "the style may differ".
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
