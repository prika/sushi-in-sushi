"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameQuestion } from "@/domain/entities/GameQuestion";
import type { GameAnswer } from "@/domain/entities/GameAnswer";

const TIMER_SECONDS = 15;

interface QuizGameProps {
  questions: GameQuestion[];
  onAnswer: (questionId: string, selectedIndex: number) => Promise<GameAnswer | null>;
  onComplete: () => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

type AnswerState = "idle" | "correct" | "wrong" | "timeout";

export function QuizGame({
  questions,
  onAnswer,
  onComplete,
  onClose,
  t,
}: QuizGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = questions[currentIndex];
  const total = questions.length;
  const isFinished = currentIndex >= total;
  const progress = total > 0 ? ((currentIndex) / total) * 100 : 0;

  // Timer
  useEffect(() => {
    if (isFinished || answerState !== "idle") return;

    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isFinished, answerState]);

  // Handle timeout
  useEffect(() => {
    if (timeLeft === 0 && answerState === "idle" && !isFinished) {
      handleTimeout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, answerState, isFinished]);

  const handleTimeout = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswerState("timeout");
    setSelectedOption(null);

    setTimeout(() => {
      advanceQuestion();
    }, 1500);
  }, []);

  const advanceQuestion = useCallback(() => {
    setAnswerState("idle");
    setSelectedOption(null);
    setCurrentIndex((i) => i + 1);
  }, []);

  const handleSelectOption = useCallback(
    async (optionIndex: number) => {
      if (answerState !== "idle" || isSubmitting || !current) return;

      if (timerRef.current) clearInterval(timerRef.current);
      setSelectedOption(optionIndex);
      setIsSubmitting(true);

      const isCorrect = optionIndex === current.correctAnswerIndex;
      setAnswerState(isCorrect ? "correct" : "wrong");

      const answer = await onAnswer(current.id, optionIndex);
      if (answer && answer.scoreEarned > 0) {
        setScore((s) => s + answer.scoreEarned);
      }

      setIsSubmitting(false);

      setTimeout(() => {
        advanceQuestion();
      }, 1500);
    },
    [answerState, isSubmitting, current, onAnswer, advanceQuestion]
  );

  const timerPercent = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor =
    timeLeft > 10 ? "bg-green-500" : timeLeft > 5 ? "bg-yellow-500" : "bg-red-500";

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
            {t("mesa.games.quiz.title")}
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
          /* Finished screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="text-5xl mb-4">
              {score >= total * 7 ? "🏆" : score >= total * 4 ? "🎉" : "👏"}
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {score} {t("mesa.games.points")}
            </p>
            <p className="text-gray-400 text-sm mb-6">
              {score >= total * 7
                ? t("mesa.games.quiz.scoreMaster")
                : score >= total * 4
                  ? t("mesa.games.quiz.scoreGood")
                  : t("mesa.games.quiz.scoreTry")}
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
          /* Question card */
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md"
            >
              {/* Timer bar */}
              {answerState === "idle" && (
                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-4">
                  <motion.div
                    className={`h-full rounded-full ${timerColor}`}
                    animate={{ width: `${timerPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}

              {/* Category + difficulty */}
              <div className="flex items-center gap-2 mb-3">
                {current.category && (
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    {current.category.replace(/_/g, " ")}
                  </span>
                )}
                <span className="text-xs text-gray-600">
                  {"⭐".repeat(current.difficulty)}
                </span>
              </div>

              {/* Question */}
              <div className="rounded-2xl bg-[#1A1A1A] border border-gray-700 p-5 mb-4">
                <p className="text-lg font-medium text-white leading-relaxed">
                  {current.questionText}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {(current.options ?? []).map((option, index) => {
                  const isSelected = selectedOption === index;
                  const isCorrectAnswer = index === current.correctAnswerIndex;
                  const showResult = answerState !== "idle";

                  let optionStyle =
                    "border-gray-700 bg-[#1A1A1A] text-white hover:border-[#D4AF37]/50";

                  if (showResult) {
                    if (isCorrectAnswer) {
                      optionStyle =
                        "border-green-500 bg-green-500/10 text-green-400";
                    } else if (isSelected && !isCorrectAnswer) {
                      optionStyle =
                        "border-red-500 bg-red-500/10 text-red-400";
                    } else {
                      optionStyle =
                        "border-gray-800 bg-[#111] text-gray-600";
                    }
                  }

                  if (answerState === "timeout" && isCorrectAnswer) {
                    optionStyle =
                      "border-green-500 bg-green-500/10 text-green-400";
                  }

                  const label = String.fromCharCode(65 + index); // A, B, C, D

                  return (
                    <motion.button
                      key={index}
                      type="button"
                      disabled={answerState !== "idle" || isSubmitting}
                      onClick={() => handleSelectOption(index)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors ${optionStyle}`}
                      whileTap={answerState === "idle" ? { scale: 0.98 } : {}}
                    >
                      <span
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          showResult && isCorrectAnswer
                            ? "bg-green-500 text-white"
                            : showResult && isSelected && !isCorrectAnswer
                              ? "bg-red-500 text-white"
                              : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {showResult && isCorrectAnswer
                          ? "✓"
                          : showResult && isSelected && !isCorrectAnswer
                            ? "✗"
                            : label}
                      </span>
                      <span className="text-sm">{option}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Feedback message */}
              <AnimatePresence>
                {answerState !== "idle" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 text-center"
                  >
                    {answerState === "correct" && (
                      <p className="text-green-400 font-medium">
                        ✅ {t("mesa.games.quiz.correct", { pts: current.points })}
                      </p>
                    )}
                    {answerState === "wrong" && (
                      <p className="text-red-400 font-medium">
                        ❌ {t("mesa.games.quiz.wrong")}
                      </p>
                    )}
                    {answerState === "timeout" && (
                      <p className="text-yellow-400 font-medium">
                        ⏰ {t("mesa.games.quiz.timeout")}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}
