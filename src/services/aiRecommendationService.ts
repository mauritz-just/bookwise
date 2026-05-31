// Generic LLM caller shared by every pipeline step (source analysis,
// candidate generation, reranking). Each provider returns a cleaned JSON
// string; callers parse + validate with their own Zod schema.

export interface CallAIOptions {
  /** Lower = more deterministic. */
  temperature?: number;
  maxTokens?: number;
  /** Stable string used to derive a deterministic Groq seed. */
  seedKey?: string;
  /** Optional system instruction (used by OpenAI-compatible providers). */
  system?: string;
}

function hashSeed(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (Math.imul(31, hash) + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

const DEFAULT_SYSTEM =
  'You are a literary advisor. You must respond with valid JSON only — no prose, no markdown fences, no explanation outside the JSON object.';

async function callGroq(prompt: string, opts: CallAIOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: opts.system ?? DEFAULT_SYSTEM },
        { role: 'user', content: prompt },
      ],
      temperature: opts.temperature ?? 0.35,
      max_tokens: opts.maxTokens ?? 4000,
      seed: opts.seedKey ? hashSeed(opts.seedKey) : undefined,
      response_format: { type: 'json_object' },
    }),
  });

  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq request failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return stripFences(data.choices[0].message.content);
}

async function callGemini(prompt: string, opts: CallAIOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: opts.temperature ?? 0.5,
          maxOutputTokens: opts.maxTokens ?? 4000,
        },
      }),
    },
  );

  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return stripFences(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
}

async function callOpenAI(prompt: string, opts: CallAIOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: opts.system ?? DEFAULT_SYSTEM },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: opts.temperature ?? 0.5,
      max_tokens: opts.maxTokens ?? 4000,
    }),
  });

  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`OpenAI request failed: ${res.status}`);
  const data = await res.json();
  return stripFences(data.choices[0].message.content);
}

async function callClaude(prompt: string, opts: CallAIOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.5,
      system: opts.system ?? DEFAULT_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`Claude request failed: ${res.status}`);
  const data = await res.json();
  return stripFences(data.content[0].text);
}

export function getActiveAIMode(): string {
  return process.env.AI_MODE ?? 'groq';
}

/** Call the configured LLM provider and return the raw JSON text + source label. */
export async function callAI(
  prompt: string,
  opts: CallAIOptions = {},
): Promise<{ text: string; source: string }> {
  const mode = getActiveAIMode();

  let text: string;
  switch (mode) {
    case 'gemini':
      text = await callGemini(prompt, opts);
      break;
    case 'openai':
      text = await callOpenAI(prompt, opts);
      break;
    case 'claude':
      text = await callClaude(prompt, opts);
      break;
    case 'groq':
      text = await callGroq(prompt, opts);
      break;
    default:
      throw new Error(`Unknown AI_MODE: ${mode}`);
  }

  return { text, source: mode };
}
