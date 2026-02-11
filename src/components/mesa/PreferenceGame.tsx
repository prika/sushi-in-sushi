"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameQuestion } from "@/domain/entities/GameQuestion";
import type { GameAnswer } from "@/domain/entities/GameAnswer";

interface PreferenceGameProps {
  questions: GameQuestion[];
  onAnswer: (questionId: string, choice: "a" | "b") => Promise<GameAnswer | null>;
  onComplete: () => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

type ChoiceState = "idle" | "chosen";

export function PreferenceGame({
  questions,
  onAnswer,
  onComplete,
  onClose,
  t,
}: PreferenceGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choiceState, setChoiceState] = useState<ChoiceState>("idle");
  const [selectedChoice, setSelectedChoice] = useState<"a" | "b" | null>(null);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const current = questions[currentIndex];
  const total = questions.length;
  const isFinished = currentIndex >= total;
  const progress = total > 0 ? (currentIndex / total) * 100 : 0;

  const handleChoice = useCallback(
    async (choice: "a" | "b") => {
      if (choiceState !== "idle" || isSubmitting || !current) return;

      setSelectedChoice(choice);
      setChoiceState("chosen");
      setIsSubmitting(true);

      const answer = await onAnswer(current.id, choice);
      if (answer && answer.scoreEarned > 0) {
        setScore((s) => s + answer.scoreEarned);
      }

      setIsSubmitting(false);

      setTimeout(() => {
        setChoiceState("idle");
        setSelectedChoice(null);
        setCurrentIndex((i) => i + 1);
      }, 1000);
    },
    [choiceState, isSubmitting, current, onAnswer]
  );

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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">
            {t("mesa.games.preference.title")}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#D4AF37]">
              {score} {t("mesa.games.points")}
            </span>
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

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#D4AF37] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {Math.min(currentIndex + 1, total)} / {total}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-hidden">
        {isFinished ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="text-5xl mb-4">🎯</div>
            <p className="text-2xl font-bold text-white mb-1">
              {score} {t("mesa.games.points")}
            </p>
            <p className="text-gray-400 text-sm mb-6">
              {t("mesa.games.preference.preferencesRegistered")}
            </p>
            <button
              type="button"
              onClick={onComplete}
              className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold"
            >
              {t("mesa.games.viewLeaderboard")}
            </button>
          </motion.div>
        ) : current ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md"
            >
              {/* Question text */}
              <p className="text-center text-gray-400 text-sm mb-6">
                {current.questionText}
              </p>

              {/* VS layout */}
              <div className="flex gap-3 items-stretch">
                {/* Option A */}
                <motion.button
                  type="button"
                  disabled={choiceState !== "idle" || isSubmitting}
                  onClick={() => handleChoice("a")}
                  className={`flex-1 rounded-2xl border-2 p-5 flex flex-col items-center justify-center min-h-[160px] transition-colors ${
                    choiceState === "chosen" && selectedChoice === "a"
                      ? "border-[#D4AF37] bg-[#D4AF37]/10"
                      : choiceState === "chosen" && selectedChoice === "b"
                        ? "border-gray-800 bg-[#111] opacity-40"
                        : "border-gray-700 bg-[#1A1A1A] hover:border-[#D4AF37]/50"
                  }`}
                  whileTap={choiceState === "idle" ? { scale: 0.95 } : {}}
                >
                  {current.optionA?.imageUrl && (
                    <img
                      src={current.optionA.imageUrl}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover mb-3"
                      draggable={false}
                    />
                  )}
                  <span
                    className={`text-lg font-semibold ${
                      choiceState === "chosen" && selectedChoice === "a"
                        ? "text-[#D4AF37]"
                        : "text-white"
                    }`}
                  >
                    {current.optionA?.label ?? "A"}
                  </span>
                  {choiceState === "chosen" && selectedChoice === "a" && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-xs text-[#D4AF37] mt-2 font-medium"
                    >
                      +{current.points} {t("mesa.games.points")}
                    </motion.span>
                  )}
                </motion.button>

                {/* VS divider */}
                <div className="flex items-center">
                  <span className="text-gray-600 font-bold text-sm">VS</span>
                </div>

                {/* Option B */}
                <motion.button
                  type="button"
                  disabled={choiceState !== "idle" || isSubmitting}
                  onClick={() => handleChoice("b")}
                  className={`flex-1 rounded-2xl border-2 p-5 flex flex-col items-center justify-center min-h-[160px] transition-colors ${
                    choiceState === "chosen" && selectedChoice === "b"
                      ? "border-[#D4AF37] bg-[#D4AF37]/10"
                      : choiceState === "chosen" && selectedChoice === "a"
                        ? "border-gray-800 bg-[#111] opacity-40"
                        : "border-gray-700 bg-[#1A1A1A] hover:border-[#D4AF37]/50"
                  }`}
                  whileTap={choiceState === "idle" ? { scale: 0.95 } : {}}
                >
                  {current.optionB?.imageUrl && (
                    <img
                      src={current.optionB.imageUrl}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover mb-3"
                      draggable={false}
                    />
                  )}
                  <span
                    className={`text-lg font-semibold ${
                      choiceState === "chosen" && selectedChoice === "b"
                        ? "text-[#D4AF37]"
                        : "text-white"
                    }`}
                  >
                    {current.optionB?.label ?? "B"}
                  </span>
                  {choiceState === "chosen" && selectedChoice === "b" && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-xs text-[#D4AF37] mt-2 font-medium"
                    >
                      +{current.points} {t("mesa.games.points")}
                    </motion.span>
                  )}
                </motion.button>
              </div>

              {/* Hint */}
              <p className="text-center text-gray-600 text-xs mt-4">
                {t("mesa.games.preference.noWrongAnswer")}
              </p>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}
