"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { LeaderboardEntry } from "@/domain/repositories/IGameAnswerRepository";

export interface LeaderboardEntryWithRank extends LeaderboardEntry {
  rank: number;
}

export interface GameLeaderboardProps {
  /** Leaderboard entries (rank added by GetGameLeaderboardUseCase) */
  leaderboard: (LeaderboardEntry & { rank?: number })[];
  /** Session ID for real-time subscription */
  sessionId: string;
  /** Callback to refresh leaderboard data */
  onRefresh: () => Promise<void>;
  /** Optional: ID of current user to highlight their row */
  currentSessionCustomerId?: string | null;
  /** Callback when close/back is clicked */
  onClose: () => void;
  /** Translation function */
  t: (_key: string, _params?: Record<string, string | number>) => string;
}

const RANK_ICONS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export function GameLeaderboard({
  leaderboard,
  sessionId,
  onRefresh,
  currentSessionCustomerId,
  onClose,
  t,
}: GameLeaderboardProps) {
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const isFirstRenderRef = useRef(true);
  const [toast, setToast] = useState<string | null>(null);

  // Real-time: subscribe to game_answers changes, debounced refresh
  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout>;

    const channel = supabase
      .channel(`game-leaderboard-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_answers",
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            onRefresh();
          }, 800);
        },
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [sessionId, onRefresh]);

  // Stable unique key for rank tracking: sessionCustomerId for known players;
  // for anonymous (null sessionCustomerId), use sessionId + displayName + totalScore to avoid collisions
  const getRankKey = useCallback(
    (entry: LeaderboardEntry) =>
      entry.sessionCustomerId ??
      `${sessionId}-${entry.displayName}-${entry.totalScore}`,
    [sessionId],
  );

  // Track previous ranks for animation direction
  const getRankChange = useCallback(
    (entry: LeaderboardEntryWithRank): "up" | "down" | "same" | null => {
      if (isFirstRenderRef.current) return null;
      const prev = prevRanksRef.current.get(getRankKey(entry));
      if (prev === null) return null;
      if (entry.rank < prev) return "up";
      if (entry.rank > prev) return "down";
      return "same";
    },
    [getRankKey],
  );

  useEffect(() => {
    if (leaderboard.length > 0) {
      // Detect rank change notification for current user
      if (!isFirstRenderRef.current && currentSessionCustomerId) {
        const myKey = currentSessionCustomerId;
        const prevRank = prevRanksRef.current.get(myKey);
        const currentEntry = leaderboard.find(
          (e) => e.sessionCustomerId === myKey,
        );
        const currentRank = currentEntry
          ? (currentEntry.rank ?? leaderboard.indexOf(currentEntry) + 1)
          : null;

        if (prevRank !== null && currentRank !== null) {
          if (currentRank < prevRank) {
            // User moved up
            setToast(t("mesa.games.realtime.movedUp", { rank: currentRank }));
            setTimeout(() => setToast(null), 3000);
          } else if (currentRank > prevRank) {
            // User was overtaken
            const overtaker = leaderboard.find(
              (e) =>
                (e.rank ?? 0) === prevRank && e.sessionCustomerId !== myKey,
            );
            setToast(
              overtaker
                ? t("mesa.games.realtime.overtaken", {
                    name: overtaker.displayName,
                  })
                : t("mesa.games.realtime.droppedRank", { rank: currentRank }),
            );
            setTimeout(() => setToast(null), 3000);
          }
        }
      }

      isFirstRenderRef.current = false;
      const next = new Map<string, number>();
      for (const e of leaderboard) {
        next.set(getRankKey(e), e.rank ?? 0);
      }
      prevRanksRef.current = next;
    }
  }, [leaderboard, currentSessionCustomerId, t, getRankKey]);

  const isEmpty = leaderboard.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0D0D0D]"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header */}
      <div className="shrink-0 px-4 pt-2 pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {t("mesa.games.leaderboard")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
            aria-label={t("mesa.games.close")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Rank change toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-4 right-4 z-10 bg-[#D4AF37]/90 text-black text-sm font-semibold px-4 py-2.5 rounded-xl text-center shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-500"
          >
            {t("mesa.games.leaderboardEmpty")}
          </motion.p>
        ) : (
          <div className="space-y-2 max-w-md mx-auto">
            <AnimatePresence mode="popLayout">
              {leaderboard.map((entry, index) => {
                const entryWithRank: LeaderboardEntryWithRank = {
                  ...entry,
                  rank: entry.rank ?? index + 1,
                };
                const { rank } = entryWithRank;
                const isLeader = rank === 1;
                const isCurrentUser =
                  currentSessionCustomerId !== null &&
                  entry.sessionCustomerId === currentSessionCustomerId;
                const change = getRankChange(entryWithRank);

                return (
                  <motion.div
                    key={getRankKey(entry)}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      x:
                        change === "up"
                          ? [0, -8, 0]
                          : change === "down"
                            ? [0, 8, 0]
                            : 0,
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                    className={`
                      flex items-center gap-4 p-4 rounded-xl border
                      transition-colors
                      ${
                        isLeader
                          ? "bg-[#D4AF37]/20 border-[#D4AF37]/50"
                          : "bg-[#1A1A1A] border-gray-800"
                      }
                      ${isCurrentUser ? "ring-2 ring-[#D4AF37]/50" : ""}
                    `}
                  >
                    {/* Rank */}
                    <div
                      className={`
                        shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                        ${isLeader ? "bg-[#D4AF37] text-black" : "bg-gray-800 text-gray-300"}
                      `}
                    >
                      {RANK_ICONS[rank] ?? rank}
                    </div>

                    {/* Name + score */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold truncate ${
                          isLeader ? "text-[#D4AF37]" : "text-white"
                        }`}
                      >
                        {entry.displayName}
                        {isCurrentUser && (
                          <span className="ml-1 text-xs text-gray-500">
                            (tu)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {entry.totalScore} {t("mesa.games.points")}
                      </p>
                    </div>

                    {/* Rank change indicator */}
                    {change === "up" && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-green-400 text-xl"
                      >
                        ↑
                      </motion.span>
                    )}
                    {change === "down" && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-red-400 text-xl"
                      >
                        ↓
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
