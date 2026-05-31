export type SimilarityDimension =
  | 'plot'
  | 'tone'
  | 'characters'
  | 'writingStyle'
  | 'themes'
  | 'setting'
  | 'pacing'
  | 'emotionalFeel'
  | 'complexity'
  | 'genre';

export type ImportanceLevel = 'low' | 'medium' | 'high';

export type RecommendationMode = 'balanced' | 'safe' | 'unexpected' | 'hiddenGems';

export type ValidationStatus = 'validated' | 'unvalidated' | 'pending';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Pacing = 'slow' | 'moderate' | 'fast';

export interface Book {
  id: string;
  title: string;
  author: string;
  firstPublishYear?: number;
  coverUrl?: string;
  openLibraryKey: string;
  isbn?: string;
  description?: string;
  subjects?: string[];
  language?: string;
}

export interface SelectedDimension {
  dimension: SimilarityDimension;
  importance: ImportanceLevel;
}

export interface RecommendationRequest {
  sourceBook: Book;
  selectedDimensions: SelectedDimension[];
  optionalRefinement?: string;
  targetLanguage: string;
  numberOfRecommendations: number;
  recommendationMode: RecommendationMode;
}

export interface RawAIRecommendation {
  title: string;
  author: string;
  matchScore: number;
  oneSentenceHook: string;
  premise?: string;
  whyItFits: string;
  matchingDimensions: SimilarityDimension[];
  possibleMismatch: string;
  tags: string[];
  difficulty: Difficulty;
  pacing: Pacing;
}

export interface Recommendation extends RawAIRecommendation {
  validationStatus: ValidationStatus;
  bookData?: Book;
}

export interface AIRecommendationResponse {
  recommendations: RawAIRecommendation[];
}

export const DIMENSION_LABELS: Record<SimilarityDimension, string> = {
  plot: 'Plot',
  tone: 'Tone',
  characters: 'Characters',
  writingStyle: 'Writing Style',
  themes: 'Themes',
  setting: 'Setting',
  pacing: 'Pacing',
  emotionalFeel: 'Emotional Feel',
  complexity: 'Complexity',
  genre: 'Genre',
};

export const DIMENSION_DESCRIPTIONS: Record<SimilarityDimension, string> = {
  plot: 'Story structure, narrative arc, twists, and how the storyline unfolds',
  tone: 'Overall mood and atmosphere of the book',
  characters: 'Depth, development, relatability, and complexity of the characters',
  writingStyle: 'Prose quality, voice, sentence rhythm, and narrative technique',
  themes: 'Central ideas and questions the book explores',
  setting: 'World-building, time period, location, and how vividly the world is drawn',
  pacing: 'How fast or slow the story moves and how tension is managed',
  emotionalFeel: 'The emotional impact and how the book makes you feel',
  complexity: 'Narrative layers, ambiguity, and intellectual depth',
  genre: 'Genre conventions and the type of story it is',
};

export const ALL_DIMENSIONS: SimilarityDimension[] = [
  'plot', 'tone', 'characters', 'writingStyle', 'themes',
  'setting', 'pacing', 'emotionalFeel', 'complexity', 'genre',
];
