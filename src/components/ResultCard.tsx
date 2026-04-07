"use client";

import { useState } from "react";
import { type StyleRating, ratingLabels } from "@/lib/prompts";
import ScoreRing, { getScoreColor, getScoreLabel } from "./ScoreRing";
import RatingBar from "./RatingBar";

interface ResultCardProps {
  result: StyleRating;
  imagePreview: string;
}

export default function ResultCard({ result, imagePreview }: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const color = getScoreColor(result.overall_score);
  const label = getScoreLabel(result.overall_score);

  async function handleCopy() {
    const text = formatShareText(result);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    const text = formatShareText(result);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `StyleCheck AI - ${result.overall_score}/10`,
          text,
        });
        return;
      } catch {
        // fallthrough
      }
    }

    await navigator.clipboard.writeText(text);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  return (
    <div className="animate-slide-up space-y-4">
      {/* Main Score Card - THE screenshot moment */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          border: `1px solid ${color}30`,
        }}
      >
        {/* Top section: image + score */}
        <div className="flex items-center gap-4 p-5">
          {/* Thumbnail */}
          <div
            className="w-20 h-20 rounded-2xl bg-cover bg-center shrink-0 border-2"
            style={{
              backgroundImage: `url(${imagePreview})`,
              borderColor: `${color}40`,
            }}
          />

          {/* Score */}
          <div className="flex-1 flex items-center justify-between">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color }}
              >
                {label}
              </p>
              <p className="text-xl font-black text-white mt-0.5">
                {result.vibe}
              </p>
            </div>
            <ScoreRing score={result.overall_score} size={80} strokeWidth={6} />
          </div>
        </div>

        {/* Rating bars */}
        <div className="px-5 pb-2 space-y-3">
          {Object.entries(result.ratings).map(([key, val]) => {
            const info = ratingLabels[key];
            if (!info) return null;
            return (
              <RatingBar
                key={key}
                label={info.label}
                emoji={info.emoji}
                score={val.score}
                comment={val.comment}
              />
            );
          })}
        </div>

        {/* Roast & Compliment */}
        <div className="px-5 py-4 space-y-3 border-t border-white/5">
          <div className="flex gap-2">
            <span className="text-lg shrink-0">💀</span>
            <p className="text-sm text-gray-300 italic">{result.roast}</p>
          </div>
          <div className="flex gap-2">
            <span className="text-lg shrink-0">💖</span>
            <p className="text-sm text-gray-300 italic">{result.compliment}</p>
          </div>
        </div>

        {/* Tips */}
        <div className="px-5 py-4 border-t border-white/5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Style Tips
          </p>
          <div className="space-y-2">
            {result.tips.map((tip, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span
                  className="text-xs font-bold mt-0.5 shrink-0"
                  style={{ color }}
                >
                  {i + 1}.
                </span>
                <p className="text-sm text-gray-300">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Celebrity match */}
        <div className="px-5 py-3 border-t border-white/5">
          <div className="flex gap-2 items-start">
            <span className="text-lg shrink-0">⭐</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                Celebrity Match
              </p>
              <p className="text-sm text-gray-300">{result.celebrity_match}</p>
            </div>
          </div>
        </div>

        {/* Watermark */}
        <div className="px-5 py-2.5 flex items-center justify-between bg-white/[0.02]">
          <span className="text-[10px] text-gray-600 font-bold tracking-wider">
            STYLECHECK AI
          </span>
          <span className="text-[10px] text-gray-600">
            stylecheckai.app
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all cursor-pointer"
        >
          {copied ? "✓ Copied!" : "📋 Copy Results"}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
            boxShadow: `0 0 20px ${color}30`,
          }}
        >
          {shared ? "✓ Copied to share!" : "📤 Share"}
        </button>
      </div>
    </div>
  );
}

function formatShareText(result: StyleRating): string {
  const bars = Object.entries(result.ratings)
    .map(([key, val]) => {
      const info = ratingLabels[key];
      return `${info?.emoji ?? ""} ${info?.label ?? key}: ${val.score}/10`;
    })
    .join("\n");

  return `✨ StyleCheck AI - ${result.overall_score}/10

"${result.vibe}"

${bars}

💀 ${result.roast}
💖 ${result.compliment}

⭐ Celeb match: ${result.celebrity_match}

— StyleCheck AI`;
}
