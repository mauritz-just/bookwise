import { z } from 'zod';
import type { RecommendationRequest, AIRecommendationResponse } from '@/types';
import { buildRecommendationPrompt } from './recommendationPrompt';
import { MOCK_RECOMMENDATIONS } from './mockRecommendations';

const RawRecommendationSchema = z.object({
  title: z.string(),
  author: z.string(),
  matchScore: z.number().min(0).max(100).transform(Math.round),
  oneSentenceHook: z.string(),
  premise: z.string().optional(),
  whyItFits: z.string(),
  matchingDimensions: z.array(z.enum([
    'plot', 'tone', 'characters', 'writingStyle', 'themes',
    'setting', 'pacing', 'emotionalFeel', 'complexity', 'genre',
  ])),
  possibleMismatch: z.string(),
  tags: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  pacing: z.enum(['slow', 'moderate', 'fast']),
});

const AIResponseSchema = z.object({
  recommendations: z.array(RawRecommendationSchema),
});

function parseAndValidate(raw: unknown): AIRecommendationResponse {
  const result = AIResponseSchema.safeParse(raw);
  if (!result.success) {
    console.error('AI response validation failed:', result.error);
    throw new Error('AI returned invalid response structure');
  }
  return result.data;
}

async function mockMode(request: RecommendationRequest): Promise<AIRecommendationResponse> {
  await new Promise((r) => setTimeout(r, 1800));
  const shuffled = [...MOCK_RECOMMENDATIONS].sort(() => Math.random() - 0.5);
  return { recommendations: shuffled.slice(0, request.numberOfRecommendations) };
}

async function openAIMode(request: RecommendationRequest): Promise<AIRecommendationResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const prompt = buildRecommendationPrompt(request);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.75,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI request failed: ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return parseAndValidate(parsed);
}

async function claudeMode(request: RecommendationRequest): Promise<AIRecommendationResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const prompt = buildRecommendationPrompt(request);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude request failed: ${res.status}`);
  const data = await res.json();

  let text: string = data.content[0].text;
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const parsed = JSON.parse(text);
  return parseAndValidate(parsed);
}

function buildSeed(request: RecommendationRequest): number {
  const key = [
    request.sourceBook.title.toLowerCase().trim(),
    request.sourceBook.author.toLowerCase().trim(),
    request.selectedDimensions
      .slice()
      .sort((a, b) => a.dimension.localeCompare(b.dimension))
      .map((d) => `${d.dimension}:${d.importance}`)
      .join(','),
    request.optionalRefinement?.toLowerCase().trim() ?? '',
  ].join('|');

  // Simple deterministic hash → integer
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (Math.imul(31, hash) + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

async function groqMode(request: RecommendationRequest): Promise<AIRecommendationResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const prompt = buildRecommendationPrompt(request);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a literary advisor. You must respond with valid JSON only — no prose, no markdown fences, no explanation outside the JSON object.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 3000,
      seed: buildSeed(request),
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq request failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  let text: string = data.choices[0].message.content;
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const parsed = JSON.parse(text);
  return parseAndValidate(parsed);
}

export async function getAIRecommendations(
  request: RecommendationRequest,
): Promise<AIRecommendationResponse> {
  const mode = process.env.AI_MODE ?? 'mock';

  switch (mode) {
    case 'openai':
      return openAIMode(request);
    case 'claude':
      return claudeMode(request);
    case 'groq':
      return groqMode(request);
    default:
      return mockMode(request);
  }
}
