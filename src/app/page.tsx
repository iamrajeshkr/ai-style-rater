"use client";

import { useState, useRef } from "react";
import { type StyleRating, type StyleResponse, isStyleError } from "@/lib/prompts";
import ResultCard from "@/components/ResultCard";

type AppState = "upload" | "analyzing" | "result" | "error";

export default function Home() {
  const [state, setState] = useState<AppState>("upload");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [result, setResult] = useState<StyleRating | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload an image file 📸");
      setState("error");
      return;
    }

    // Max 4MB for base64
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg("Image too large - keep it under 4MB 📏");
      setState("error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      analyzeImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function analyzeImage(dataUrl: string) {
    setState("analyzing");

    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data: StyleResponse = await res.json();

      if (isStyleError(data)) {
        setErrorMsg(data.message);
        setState("error");
        return;
      }

      setResult(data);
      setState("result");
    } catch {
      setErrorMsg("Something broke 💀 Check your API key in .env.local");
      setState("error");
    }
  }

  function reset() {
    setState("upload");
    setImagePreview("");
    setResult(null);
    setErrorMsg("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Tagline */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500">
            rate your fit. get roasted. level up.
          </p>
        </div>

        {/* Upload State */}
        {state === "upload" && (
          <div className="animate-slide-up space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-purple-500/50 rounded-3xl p-10 text-center cursor-pointer transition-all hover:bg-white/[0.02] group"
            >
              <div className="text-5xl mb-4">👔</div>
              <p className="text-lg font-semibold text-gray-200 group-hover:text-purple-400 transition-colors">
                Drop your fit here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or tap to upload a photo
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="hidden"
              />
            </div>

            {/* Camera button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all cursor-pointer"
              style={{ boxShadow: "0 0 30px rgba(168,85,247,0.3)" }}
            >
              <CameraIcon />
              Take a Photo
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="hidden"
            />

            {/* Social proof */}
            <div className="text-center pt-4">
              <p className="text-xs text-gray-600">
                🔥 10K+ outfits rated • ✨ 100% honest • 💀 0% chill
              </p>
            </div>
          </div>
        )}

        {/* Analyzing State */}
        {state === "analyzing" && (
          <div className="animate-slide-up">
            {/* Image preview with scan effect */}
            <div className="relative rounded-3xl overflow-hidden mb-6">
              <img
                src={imagePreview}
                alt="Your outfit"
                className="w-full rounded-3xl"
              />
              {/* Scan line overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent">
                <div
                  className="absolute left-0 w-full h-0.5 bg-purple-500 animate-scan"
                  style={{ boxShadow: "0 0 20px 5px rgba(168,85,247,0.5)" }}
                />
              </div>
              {/* Corner brackets */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-purple-500 rounded-tl" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-purple-500 rounded-tr" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-purple-500 rounded-bl" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-purple-500 rounded-br" />
            </div>

            {/* Loading text */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-purple-500 animate-pulse-glow"
                      style={{ animationDelay: `${i * 200}ms` }}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-purple-400">
                  Analyzing your drip...
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Checking fit • Colors • Creativity • Accessories • Overall vibe
              </p>
            </div>
          </div>
        )}

        {/* Result State */}
        {state === "result" && result && (
          <div className="space-y-6">
            <ResultCard result={result} imagePreview={imagePreview} />

            <button
              onClick={reset}
              className="w-full py-3 rounded-2xl text-sm font-medium bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              📸 Rate Another Outfit
            </button>
          </div>
        )}

        {/* Error State */}
        {state === "error" && (
          <div className="animate-slide-up text-center space-y-4">
            <div className="text-5xl">😅</div>
            <p className="text-sm text-gray-300">{errorMsg}</p>
            <button
              onClick={reset}
              className="px-6 py-3 rounded-2xl text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
