# Bookwise — AI Book Recommendations

> "Find your next book by what you loved about the last one."

An MVP for an AI-powered book recommendation web app that matches readers by reading experience, not just genre.

## Quick start

```bash
cd book-recommender
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

By default `AI_MODE=mock` — no API keys needed. The mock returns a curated set of literary fiction recommendations so you can test the full flow immediately.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `AI_MODE` | `mock` | `mock` \| `openai` \| `claude` |
| `OPENAI_API_KEY` | — | Required when `AI_MODE=openai` |
| `ANTHROPIC_API_KEY` | — | Required when `AI_MODE=claude` |

---

## User flow

1. **Home** `/` — Landing page with CTA
2. **Search** `/search` — Search Open Library, select a book
3. **Preferences** `/preferences` — Pick dimensions + importance levels + optional note
4. **Recommendations** `/recommendations` — AI generates 8 candidates, validates top 5 via Open Library, displays cards

State is persisted in `localStorage` so a page refresh doesn't break the flow.

---

## Architecture

```
src/
├── app/                        # Next.js App Router pages + API routes
│   ├── api/search/             # GET  — proxies Open Library search
│   └── api/recommendations/    # POST — calls AI → validates → returns top 5
├── components/                 # Reusable UI components
├── services/
│   ├── openLibraryService.ts   # Search + book validation via Open Library API
│   ├── aiRecommendationService.ts  # AI abstraction (mock / OpenAI / Claude)
│   ├── recommendationPrompt.ts # Prompt builder
│   ├── validationService.ts    # Validates AI candidates via Open Library
│   └── mockRecommendations.ts  # Curated mock data for local dev
├── types/index.ts              # All TypeScript types + dimension metadata
└── lib/utils.ts                # cn() helper
```

### Adding a new AI provider

1. Add a new case in `aiRecommendationService.ts`
2. Set `AI_MODE=yourprovider` in `.env.local`
3. Return an `AIRecommendationResponse` — Zod validates the shape

### Adding a new recommendation mode

1. Add the mode to the `RecommendationMode` union in `types/index.ts`
2. Add mode instructions in `recommendationPrompt.ts`
3. Pass the mode in the API request

---

## Tech stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** — design system
- **Zod** — runtime validation of AI responses
- **Open Library API** — book search and validation (free, no key required)
- **Lucide React** — icons
