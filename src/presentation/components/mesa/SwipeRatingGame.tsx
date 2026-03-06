"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/domain/entities";

const MIN_RATINGS_FOR_DRINK = 5;

export interface TableLeaderInfo {
  productId: string;
  totalScore: number;
  voteCount: number;
}

export interface OrderItem {
  orderId: string;
  product: Product;
}

interface SwipeRatingGameProps {
  sessionId: string;
  sessionCustomerId: string | null;
  gameSessionId: string | null;
  orderItems: OrderItem[];
  tableLeader: TableLeaderInfo | null;
  leaderProductName: string | null;
  userRatingCount: number;
  totalRatingsAtTable: number;
  onClose: () => void;
  onRated: () => void;
  t: (_key: string, _params?: Record<string, string | number>) => string;
}

export function SwipeRatingGame({
  sessionId,
  sessionCustomerId,
  gameSessionId,
  orderItems,
  leaderProductName,
  userRatingCount,
  onClose,
  onRated,
  t,
}: SwipeRatingGameProps) {
  const [stack, setStack] = useState<OrderItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragDirection, setDragDirection] = useState<"left" | "right" | null>(
    null,
  );
  const [exitDirection, setExitDirection] = useState<"left" | "right">("right");
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const lastScoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    setStack([...orderItems]);
    setCurrentIndex(0);
  }, [orderItems]);

  useEffect(() => {
    return () => {
      if (lastScoreTimeoutRef.current !== null) {
        clearTimeout(lastScoreTimeoutRef.current);
        lastScoreTimeoutRef.current = null;
      }
    };
  }, []);

  const submitRating = useCallback(
    async (productId: string, orderId: string, rating: number) => {
      setIsSubmitting(true);
      try {
        if (gameSessionId) {
          // Unified scoring: call games/answer API (also dual-writes to product_ratings)
          const res = await fetch("/api/mesa/games/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameSessionId,
              sessionCustomerId: sessionCustomerId ?? undefined,
              productId: Number(productId),
              orderId,
              gameType: "tinder",
              answer: { rating },
              questionPoints: 10,
              sessionId,
            }),
          });
          if (!res.ok) throw new Error("Failed to submit");
          const data = await res.json();
          const earned = data.scoreEarned ?? 0;
          setLastScore(earned);
          setTotalScore((prev) => prev + earned);
          // Clear score display after 1s; cancel any previous timer and avoid setState on unmount
          if (lastScoreTimeoutRef.current !== null) {
            clearTimeout(lastScoreTimeoutRef.current);
          }
          lastScoreTimeoutRef.current = setTimeout(() => {
            lastScoreTimeoutRef.current = null;
            setLastScore(null);
          }, 1000);
        } else {
          // Fallback: direct ratings API (no game session)
          const res = await fetch("/api/mesa/ratings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              sessionCustomerId: sessionCustomerId ?? undefined,
              productId: Number(productId),
              orderId,
              rating,
            }),
          });
          if (!res.ok) throw new Error("Failed to submit");
        }
        onRated();
      } catch (e) {
        console.error(e);
      } finally {
        setIsSubmitting(false);
      }
    },
    [sessionId, sessionCustomerId, gameSessionId, onRated],
  );

  const current = stack[currentIndex];
  const remaining = stack.length - currentIndex;
  const hasWonDrink = userRatingCount >= MIN_RATINGS_FOR_DRINK;
  const neededForDrink = Math.max(0, MIN_RATINGS_FOR_DRINK - userRatingCount);

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      if (!current || isSubmitting) return;
      const rating = direction === "right" ? 5 : 2;
      setExitDirection(direction);
      setDragDirection(direction);
      submitRating(current.product.id, current.orderId, rating).finally(() => {
        setCurrentIndex((i) => i + 1);
        setDragDirection(null);
      });
    },
    [current, isSubmitting, submitRating],
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      if (!current || isSubmitting) return;
      const threshold = 80;
      const v = info.velocity.x;
      const x = info.offset.x;
      if (x > threshold || v > 300) {
        handleSwipe("right");
      } else if (x < -threshold || v < -300) {
        handleSwipe("left");
      }
    },
    [current, isSubmitting, handleSwipe],
  );

  const finished = !current && stack.length > 0;
  const noProducts = stack.length === 0 && !finished;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0D0D0D]"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header + Banner */}
      <div className="shrink-0 px-4 pt-2 pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">
            {t("mesa.rate.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
            aria-label={t("mesa.rate.close")}
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

        {/* Incentive banner */}
        <div className="space-y-1.5">
          {leaderProductName && (
            <div className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] border border-[#D4AF37]/30 px-3 py-2">
              <span className="text-[#D4AF37]">🏆</span>
              <span className="text-sm text-gray-300">
                {t("mesa.rate.tableLeader")}:{" "}
                <strong className="text-white">{leaderProductName}</strong>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] border border-gray-700 px-3 py-2">
            <span className="text-[#D4AF37]">🍹</span>
            <span className="text-sm text-gray-300">
              {hasWonDrink
                ? t("mesa.rate.freeDrinkWon")
                : sessionCustomerId
                  ? t("mesa.rate.freeDrinkProgress", {
                      count: neededForDrink,
                      min: MIN_RATINGS_FOR_DRINK,
                    })
                  : t("mesa.rate.joinTableToWin")}
            </span>
          </div>
        </div>
      </div>

      {/* Cards area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
        {noProducts && (
          <p className="text-gray-500 text-center">
            {t("mesa.rate.noProducts")}
          </p>
        )}

        {finished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <p className="text-xl font-semibold text-white mb-1">
              {t("mesa.rate.thanks")}
            </p>
            <p className="text-gray-400 text-sm mb-2">
              {t("mesa.rate.thanksSub")}
            </p>
            {gameSessionId && totalScore > 0 && (
              <p className="text-[#D4AF37] text-lg font-bold mb-4">
                +{totalScore} pts
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold"
            >
              {gameSessionId
                ? t("mesa.rate.seeLeaderboard")
                : t("mesa.rate.done")}
            </button>
          </motion.div>
        )}

        {/* Floating score indicator */}
        <AnimatePresence>
          {lastScore !== null && (
            <motion.div
              key={`score-${currentIndex}`}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: -10, scale: 1 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5 }}
              className="absolute top-16 z-10 text-[#D4AF37] text-2xl font-bold drop-shadow-lg"
            >
              +{lastScore} pts
            </motion.div>
          )}
        </AnimatePresence>

        {current && !finished && (
          <>
            <p className="text-sm text-gray-500 mb-2">
              {t("mesa.rate.swipeHint")} · {remaining} {t("mesa.rate.left")}
              {gameSessionId && totalScore > 0 && (
                <span className="ml-2 text-[#D4AF37]">({totalScore} pts)</span>
              )}
            </p>

            <div className="relative w-full max-w-[320px] aspect-[4/5] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.orderId}
                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl border border-gray-700 bg-[#1A1A1A] cursor-grab active:cursor-grabbing"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.4}
                  onDragEnd={handleDragEnd}
                  onDrag={(_, info) =>
                    setDragDirection(info.offset.x > 0 ? "right" : "left")
                  }
                  onDragStart={() => setDragDirection(null)}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    x: exitDirection === "right" ? 400 : -400,
                    opacity: 0,
                    transition: { duration: 0.2 },
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{ touchAction: "none" }}
                >
                  {/* Product image */}
                  <div className="absolute inset-0">
                    {current.product.imageUrl ? (
                      <Image
                        src={current.product.imageUrl}
                        alt={current.product.name || "Product image"}
                        fill
                        className="object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <span className="text-6xl">🍣</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                    <h3 className="text-xl font-bold text-white drop-shadow">
                      {current.product.name}
                    </h3>
                    {current.product.description && (
                      <p className="text-sm text-gray-300 line-clamp-2 mt-0.5">
                        {current.product.description}
                      </p>
                    )}
                  </div>

                  {/* Swipe indicators overlay */}
                  {dragDirection && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 pointer-events-none flex items-center justify-between px-6"
                    >
                      {dragDirection === "left" && (
                        <motion.span
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          className="rounded-xl border-2 border-red-400/80 text-red-400 px-4 py-2 text-lg font-bold bg-black/50"
                        >
                          {t("mesa.rate.nope")}
                        </motion.span>
                      )}
                      {dragDirection === "right" && (
                        <motion.span
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          className="rounded-xl border-2 border-green-400/80 text-green-400 px-4 py-2 text-lg font-bold bg-black/50 ml-auto"
                        >
                          {t("mesa.rate.like")}
                        </motion.span>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Buttons for accessibility */}
            <div className="flex flex-col gap-3 mt-6">
              <div className="flex gap-4 justify-center">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSwipe("left")}
                  className="w-14 h-14 rounded-full border-2 border-red-500/70 text-red-400 flex items-center justify-center hover:bg-red-500/20 disabled:opacity-50"
                >
                  <svg
                    className="w-6 h-6"
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
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSwipe("right")}
                  className="w-14 h-14 rounded-full border-2 border-green-500/70 text-green-400 flex items-center justify-center hover:bg-green-500/20 disabled:opacity-50"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>

              {/* Skip button */}
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => i + 1)}
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors text-sm font-medium disabled:opacity-50"
              >
                {t("mesa.games.skip")} →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
