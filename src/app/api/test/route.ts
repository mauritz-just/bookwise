import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GROQ_API_KEY;
  const mode = process.env.AI_MODE;

  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY is not set', mode });
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
        max_tokens: 5,
      }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: 'Groq API error', status: res.status, data, mode });
    return NextResponse.json({ ok: true, mode, reply: data.choices[0].message.content });
  } catch (err) {
    return NextResponse.json({ error: String(err), mode });
  }
}
