"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QuizGame } from "./QuizGame";
import { PreferenceGame } from "./PreferenceGame";
import { SwipeRatingGame, type TableLeaderInfo } from "./SwipeRatingGame";
import { GameLeaderboard } from "./GameLeaderboard";
import { GamePrize } from "./GamePrize";
import type { GameQuestion } from "@/domain/entities/GameQuestion";
import type { GameAnswer } from "@/domain/entities/GameAnswer";
import type { GamePrize as GamePrizeEntity } from "@/domain/entities/GamePrize";
import type { LeaderboardEntry } from "@/domain/repositories/IGameAnswerRepository";
import type { Product } from "@/domain/entities";
import type { GamesMode } from "@/domain/value-objects/GameConfig";

type GameFlowStep = "select" | "playing" | "leaderboard" | "prize";
type GameChoice = "quiz" | "preference" | "tinder";

interface GameHubProps {
  sessionId: string;
  sessionCustomerId: string | null;
  restaurantId: string | null;
  gamesMode: GamesMode;
  // Props for SwipeRatingGame (tinder mode)
  products: Product[];
  tableLeader: TableLeaderInfo | null;
  leaderProductName: string | null;
  userRatingCount: number;
  totalRatingsAtTable: number;
  onRated: () => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const GAME_CHOICES: GameChoice[] = ["quiz", "preference", "tinder"];

export function GameHub({
  sessionId,
  sessionCustomerId,
  restaurantId,
  gamesMode,
  products,
  tableLeader,
  leaderProductName,
  userRatingCount,
  totalRatingsAtTable,
  onRated,
  onClose,
  t,
}: GameHubProps) {
  const [step, setStep] = useState<GameFlowStep>("select");
  const [gameChoice, setGameChoice] = useState<GameChoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const randomPickedRef = useRef(false);

  // Game state from API
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentPrize, setCurrentPrize] = useState<GamePrizeEntity | null>(null);

  // Fetch game config + start game session (all game types including tinder)
  const startGame = useCallback(
    async (choice: GameChoice) => {
      setIsLoading(true);
      setGameChoice(choice);
      try {
        const res = await fetch("/api/mesa/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            gameType: choice,
            restaurantId: restaurantId || null,
          }),
        });

        if (!res.ok) throw new Error("Erro ao iniciar jogo");
        const data = await res.json();

        setGameSessionId(data.gameSession.id);

        if (choice !== "tinder") {
          // Filter questions by game type
          const allQuestions: GameQuestion[] = data.questions ?? [];
          const filtered = allQuestions.filter((q) => q.gameType === choice);
          // If not enough questions of the chosen type, use all
          setQuestions(filtered.length >= 3 ? filtered : allQuestions);
        }

        setStep("playing");
      } catch (e) {
        console.error(e);
        alert((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, restaurantId]
  );

  // Random mode: auto-pick a random game on mount
  useEffect(() => {
    if (gamesMode === "random" && step === "select" && !randomPickedRef.current) {
      randomPickedRef.current = true;
      const randomChoice = GAME_CHOICES[Math.floor(Math.random() * GAME_CHOICES.length)];
      startGame(randomChoice);
    }
  }, [gamesMode, step, startGame]);

  // Submit quiz answer via API
  const handleQuizAnswer = useCallback(
    async (questionId: string, selectedIndex: number): Promise<GameAnswer | null> => {
      if (!gameSessionId) return null;
      const question = questions.find((q) => q.id === questionId);

      try {
        const res = await fetch("/api/mesa/games/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameSessionId,
            sessionCustomerId,
            questionId,
            gameType: "quiz",
            answer: { selectedIndex },
            questionPoints: question?.points ?? 10,
            correctAnswerIndex: question?.correctAnswerIndex ?? null,
          }),
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.answer as GameAnswer;
      } catch {
        return null;
      }
    },
    [gameSessionId, sessionCustomerId, questions]
  );

  // Submit preference answer via API
  const handlePreferenceAnswer = useCallback(
    async (questionId: string, choice: "a" | "b"): Promise<GameAnswer | null> => {
      if (!gameSessionId) return null;
      const question = questions.find((q) => q.id === questionId);

      try {
        const res = await fetch("/api/mesa/games/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameSessionId,
            sessionCustomerId,
            questionId,
            gameType: "preference",
            answer: { choice },
            questionPoints: question?.points ?? 10,
          }),
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.answer as GameAnswer;
      } catch {
        return null;
      }
    },
    [gameSessionId, sessionCustomerId, questions]
  );

  // Complete game and get leaderboard + prize
  const handleGameComplete = useCallback(async () => {
    if (!gameSessionId) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/mesa/games/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameSessionId,
          sessionId,
          config: {
            gamesEnabled: true,
            gamesPrizeType: "none",
            gamesMinRoundsForPrize: 1,
            gamesQuestionsPerRound: questions.length,
          },
        }),
      });

      if (!res.ok) throw new Error("Erro ao completar jogo");
      const data = await res.json();

      setLeaderboard(data.leaderboard ?? []);
      setCurrentPrize(data.prize ?? null);
      setStep("leaderboard");
    } catch (e) {
      console.error(e);
      // Still show leaderboard even on error
      setStep("leaderboard");
    } finally {
      setIsLoading(false);
    }
  }, [gameSessionId, sessionId, questions.length]);

  // Refresh leaderboard
  const refreshLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/mesa/games?sessionId=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setLeaderboard(data.leaderboard ?? []);
    } catch {
      // silent fail
    }
  }, [sessionId]);

  // Redeem prize
  const handleRedeem = useCallback(async (prizeId: string) => {
    try {
      const res = await fetch("/api/mesa/games/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizeId }),
      });
      if (!res.ok) throw new Error("Erro ao resgatar");
      const data = await res.json();
      if (data.prize) setCurrentPrize(data.prize);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Reset and play again
  const handlePlayAgain = useCallback(() => {
    setStep("select");
    setGameChoice(null);
    setGameSessionId(null);
    setQuestions([]);
    setCurrentPrize(null);
    randomPickedRef.current = false;
  }, []);

  // ─── Render ──────────────────────────────────────────

  // Playing Quiz (fullscreen)
  if (step === "playing" && gameChoice === "quiz" && questions.length > 0) {
    return (
      <QuizGame
        questions={questions}
        onAnswer={handleQuizAnswer}
        onComplete={handleGameComplete}
        onClose={onClose}
        t={t}
      />
    );
  }

  // Playing Preference (fullscreen)
  if (step === "playing" && gameChoice === "preference" && questions.length > 0) {
    return (
      <PreferenceGame
        questions={questions}
        onAnswer={handlePreferenceAnswer}
        onComplete={handleGameComplete}
        onClose={onClose}
        t={t}
      />
    );
  }

  // Playing Tinder/Swipe Rating (fullscreen)
  if (step === "playing" && gameChoice === "tinder") {
    return (
      <SwipeRatingGame
        sessionId={sessionId}
        sessionCustomerId={sessionCustomerId}
        gameSessionId={gameSessionId}
        products={products}
        tableLeader={tableLeader}
        leaderProductName={leaderProductName}
        userRatingCount={userRatingCount}
        totalRatingsAtTable={totalRatingsAtTable}
        onClose={handleGameComplete}
        onRated={onRated}
        t={t}
      />
    );
  }

  // Leaderboard (fullscreen)
  if (step === "leaderboard") {
    return (
      <>
        <GameLeaderboard
          leaderboard={leaderboard}
          sessionId={sessionId}
          onRefresh={refreshLeaderboard}
          currentSessionCustomerId={sessionCustomerId}
          onClose={() => {
            if (currentPrize) {
              setStep("prize");
            } else {
              handlePlayAgain();
            }
          }}
          t={t}
        />
        {/* Play again + prize buttons overlay at bottom */}
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-gradient-to-t from-[#0D0D0D] to-transparent pt-8 pb-6 px-4 flex flex-col items-center gap-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
          {currentPrize && (
            <button
              type="button"
              onClick={() => setStep("prize")}
              className="w-full max-w-sm py-3 rounded-xl bg-[#D4AF37] text-black font-bold text-center"
            >
              {t("mesa.games.hub.seePrize")}
            </button>
          )}
          <button
            type="button"
            onClick={handlePlayAgain}
            className="w-full max-w-sm py-3 rounded-xl border border-gray-600 text-gray-300 font-medium text-center hover:bg-gray-800 transition-colors"
          >
            {t("mesa.games.hub.playAgain")}
          </button>
        </div>
      </>
    );
  }

  // Prize (fullscreen)
  if (step === "prize" && currentPrize) {
    return (
      <GamePrize
        prize={currentPrize}
        onRedeem={handleRedeem}
        onClose={handlePlayAgain}
        t={t}
      />
    );
  }

  // ─── Game Selection Screen ─────────────────────────
  // (Only shown in 'selection' mode; in 'random' mode the useEffect auto-picks)

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
            {t("mesa.games.hub.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
            aria-label={t("mesa.games.close")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <p className="text-center text-gray-400 text-sm mb-8">
              {t("mesa.games.hub.subtitle")}
            </p>

            <div className="space-y-4">
              {/* Quiz option */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => startGame("quiz")}
                className="w-full rounded-2xl border-2 border-gray-700 bg-[#1A1A1A] p-5 text-left hover:border-[#D4AF37]/50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">
                    🧠
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {t("mesa.games.quizLabel")}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {t("mesa.games.hub.quizDesc")}
                    </p>
                  </div>
                </div>
              </button>

              {/* Preference option */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => startGame("preference")}
                className="w-full rounded-2xl border-2 border-gray-700 bg-[#1A1A1A] p-5 text-left hover:border-[#D4AF37]/50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl">
                    🤔
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {t("mesa.games.preferenceLabel")}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {t("mesa.games.hub.prefDesc")}
                    </p>
                  </div>
                </div>
              </button>

              {/* Swipe Rating (Tinder) option */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => startGame("tinder")}
                className="w-full rounded-2xl border-2 border-gray-700 bg-[#1A1A1A] p-5 text-left hover:border-[#D4AF37]/50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-pink-500/20 flex items-center justify-center text-2xl">
                    ⭐
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {t("mesa.games.swipeLabel")}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {t("mesa.games.hub.swipeDesc")}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Loading overlay */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center mt-8"
              >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
