import type { RecommendationRequest } from '@/types';

export function buildSourceAnalysisPrompt(request: RecommendationRequest): string {
  const { sourceBook } = request;

  const descriptionText = sourceBook.description
    ? `\nDescription: ${sourceBook.description.slice(0, 1000)}${sourceBook.description.length > 1000 ? '…' : ''}`
    : '';
  const subjectsText = sourceBook.subjects && sourceBook.subjects.length > 0
    ? `\nSubjects/genres: ${sourceBook.subjects.slice(0, 15).join(', ')}`
    : '';

  return `You are a literary analyst. Classify the following book precisely. This classification will be used to find books that match its SPECIFIC reading experience — not just its broad category.

## Book
Title: "${sourceBook.title}"
Author: ${sourceBook.author}${sourceBook.firstPublishYear ? `\nPublished: ${sourceBook.firstPublishYear}` : ''}${descriptionText}${subjectsText}

## Classify along these four axes

1. sourceGenreMode — the KIND of reading experience. Examples: literary realism, dark academia, campus novel, gothic mystery, psychological literary suspense, historical literary fiction, myth retelling, fantasy, high-concept science fiction, domestic realism, satire, postmodern fiction.

2. sourceSettingType — the specific social/physical world. Examples: elite academic institution, closed intellectual student circle, decaying aristocratic society, urban loneliness, postwar domestic world, immigrant social world, artistic/bohemian milieu, mythological ancient world, dystopian institution.

3. sourceEmotionalRegister — the dominant emotional texture. Examples: melancholic, tense, morally uneasy, restrained, obsessive, satirical, comic, romantic, heroic, paranoid, surreal, nostalgic.

4. sourceSocialDynamics — the human/relational forces driving the book. Examples: class performance, secrecy, group pressure, intellectual elitism, privilege, moral corruption, family duty, romantic longing, institutional oppression, artistic ambition.

Be specific and concrete. Each field should be a short phrase (a few descriptors), not a paragraph.

## Return ONLY this JSON — no prose, no markdown fences
{
  "sourceGenreMode": "...",
  "sourceSettingType": "...",
  "sourceEmotionalRegister": "...",
  "sourceSocialDynamics": "..."
}`;
}
