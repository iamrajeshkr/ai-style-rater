"use client";

import { getScoreColor } from "./ScoreRing";

interface RatingBarProps {
  label: string;
  emoji: string;
  score: number;
  comment: string;
}

export default function RatingBar({ label, emoji, score, comment }: RatingBarProps) {
  const color = getScoreColor(score);
  const width = (score / 10) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">
          {emoji} {label}
        </span>
        <span className="text-sm font-bold" style={{ color }}>
          {score}/10
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            boxShadow: `0 0 10px ${color}40`,
          }}
        />
      </div>
      <p className="text-xs text-gray-500">{comment}</p>
    </div>
  );
}
