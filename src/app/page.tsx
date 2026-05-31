import Link from 'next/link';
import { ArrowRight, Sparkles, BookOpen, SlidersHorizontal } from 'lucide-react';

const STEPS = [
  {
    icon: BookOpen,
    title: 'Pick a book you loved',
    description: 'Search for any book and tell us what made it special.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Define what mattered',
    description: 'Choose the specific aspects — tone, characters, writing style — and set their importance.',
  },
  {
    icon: Sparkles,
    title: 'Get your recommendations',
    description: 'Our AI reasons from your taste profile and returns 5 verified, explained matches.',
  },
];

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      {/* Hero */}
      <section className="pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium mb-6">
          <Sparkles className="w-3 h-3" />
          AI-powered literary discovery
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight leading-tight mb-5">
          Find your next book by what you<br className="hidden sm:block" />
          <span className="text-amber-700"> loved about the last one.</span>
        </h1>

        <p className="text-lg text-stone-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Choose a book, tell us what worked for you, and get AI-powered
          recommendations with clear reasoning — not just genre matches.
        </p>

        <Link
          href="/search"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors shadow-sm"
        >
          Start with a book
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-stone-100">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest text-center mb-10">
          How it works
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <div key={i} className="flex flex-col items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <step.icon className="w-4 h-4 text-amber-700" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">{step.title}</p>
                <p className="text-sm text-stone-500 mt-1 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Value prop footer */}
      <section className="py-16 border-t border-stone-100 text-center">
        <p className="text-stone-400 text-sm max-w-lg mx-auto leading-relaxed">
          Built for readers who've outgrown "if you liked X, try Y" — and want to understand
          <em> why</em> a recommendation actually fits.
        </p>
      </section>
    </div>
  );
}
