'use client';

interface OptionalRefinementInputProps {
  value: string;
  onChange: (val: string) => void;
}

export default function OptionalRefinementInput({ value, onChange }: OptionalRefinementInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-stone-700">
        Anything specific you want us to capture?
        <span className="ml-1.5 text-xs font-normal text-stone-400">(optional)</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="I liked the melancholic tone and introspective characters, but I don't want something too slow."
        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none transition"
      />
    </div>
  );
}
