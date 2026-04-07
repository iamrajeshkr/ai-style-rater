"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import ScoreRing, { getScoreColor, getScoreLabel } from "@/components/ScoreRing";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_ratings: number;
  best_score: number;
  created_at: string;
};

type Rating = {
  id: string;
  overall_score: number;
  vibe: string;
  roast: string;
  celebrity_match: string;
  image_url: string | null;
  created_at: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) setProfile(profileData);

      const { data: ratingsData } = await supabase
        .from("ratings")
        .select("id, overall_score, vibe, roast, celebrity_match, image_url, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (ratingsData) setRatings(ratingsData);
      setLoading(false);
    }

    load();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-purple-500 animate-pulse-glow"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Fashionista";

  const avgScore =
    ratings.length > 0
      ? Math.round(
          (ratings.reduce((sum, r) => sum + r.overall_score, 0) /
            ratings.length) *
            10
        ) / 10
      : 0;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            ← Back
          </a>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>

        {/* Profile Card */}
        <div
          className="rounded-3xl p-6 text-center space-y-4"
          style={{
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            border: "1px solid rgba(168,85,247,0.2)",
          }}
        >
          {/* Avatar */}
          <div className="flex justify-center">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-20 h-20 rounded-full border-2 border-purple-500/40"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center text-3xl">
                👤
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-black text-white">{displayName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Member since{" "}
              {new Date(profile?.created_at || "").toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 pt-2">
            <div className="text-center">
              <p className="text-2xl font-black text-white">
                {profile?.total_ratings || 0}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                Ratings
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-purple-400">{avgScore}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                Avg Score
              </p>
            </div>
            <div className="text-center">
              <p
                className="text-2xl font-black"
                style={{
                  color: getScoreColor(profile?.best_score || 0),
                }}
              >
                {profile?.best_score || 0}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                Best Score
              </p>
            </div>
          </div>
        </div>

        {/* Rating History */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
            Rating History
          </h3>

          {ratings.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-4xl">👔</p>
              <p className="text-sm text-gray-500">
                No ratings yet — go rate your first outfit!
              </p>
              <a
                href="/"
                className="inline-block px-6 py-2.5 rounded-2xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all"
              >
                Rate an Outfit
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {ratings.map((rating) => {
                const color = getScoreColor(rating.overall_score);
                const label = getScoreLabel(rating.overall_score);
                return (
                  <div
                    key={rating.id}
                    className="rounded-2xl p-4 flex items-center gap-4"
                    style={{
                      background: "linear-gradient(135deg, #1a1a2e, #16213e)",
                      border: `1px solid ${color}20`,
                    }}
                  >
                    {rating.image_url ? (
                      <div
                        className="w-14 h-14 rounded-xl bg-cover bg-center shrink-0 border"
                        style={{
                          backgroundImage: `url(${rating.image_url})`,
                          borderColor: `${color}30`,
                        }}
                      />
                    ) : (
                      <ScoreRing
                        score={rating.overall_score}
                        size={56}
                        strokeWidth={4}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        &ldquo;{rating.vibe}&rdquo;
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(rating.created_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                      style={{
                        color,
                        background: `${color}15`,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
