"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="flex items-center justify-between px-4 py-3 max-w-md mx-auto w-full">
      <a href="/" className="text-lg font-black tracking-tight">
        StyleCheck<span className="text-purple-500">AI</span>
      </a>

      {user ? (
        <a
          href="/profile"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm text-gray-300"
        >
          <span className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-[10px]">
            {user.user_metadata?.full_name?.[0]?.toUpperCase() ||
              user.email?.[0]?.toUpperCase() ||
              "?"}
          </span>
          Profile
        </a>
      ) : (
        <a
          href="/login"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-all"
        >
          Sign In
        </a>
      )}
    </nav>
  );
}
