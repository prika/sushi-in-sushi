"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { generateQRCodeDataURL } from "@/lib/qrcode";
import { useToast } from "@/components/ui";
import type { GamePrize as GamePrizeEntity } from "@/domain/entities/GamePrize";

export interface GamePrizeProps {
  /** Prize won by the player */
  prize: GamePrizeEntity;
  /** Callback to redeem the prize (marks as shown to staff) */
  onRedeem: (_prizeId: string) => Promise<void>;
  /** Callback when close/back is clicked */
  onClose: () => void;
  /** Translation function */
  t: (_key: string, _params?: Record<string, string | number>) => string;
}

/** Human-readable code from prize ID for staff validation */
function getPrizeCode(prizeId: string): string {
  return prizeId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Payload encoded in QR for staff scan */
function getPrizeQRPayload(prizeId: string): string {
  return `SUSHI-PRIZE-${prizeId}`;
}

export function GamePrize({ prize, onRedeem, onClose, t }: GamePrizeProps) {
  const { showToast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const code = getPrizeCode(prize.id);
  const payload = getPrizeQRPayload(prize.id);
  const isRedeemed = prize.redeemed;

  // Generate QR code on mount
  useEffect(() => {
    generateQRCodeDataURL(payload, { width: 200 }).then(setQrDataUrl);
  }, [payload]);

  // Reveal animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsRevealed(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleRedeem = useCallback(async () => {
    setIsRedeeming(true);
    try {
      await onRedeem(prize.id);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("mesa.games.prize.redeemError");
      showToast("error", message);
    } finally {
      setIsRedeeming(false);
    }
  }, [prize.id, onRedeem, showToast, t]);

  const description =
    prize.prizeDescription || prize.prizeValue || t("mesa.games.prize.default");

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
            {t("mesa.games.prize.title")}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {isRevealed ? (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-sm flex flex-col items-center"
            >
              {/* Trophy / confetti burst */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.1,
                }}
                className="text-6xl mb-4"
              >
                {isRedeemed ? "✅" : "🏆"}
              </motion.div>

              {/* Prize description */}
              <p className="text-xl font-bold text-[#D4AF37] text-center mb-1">
                {description}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {prize.displayName} · {prize.totalScore}{" "}
                {t("mesa.games.points")}
              </p>

              {/* QR Code */}
              {qrDataUrl && (
                <div className="bg-white rounded-2xl p-4 mb-4">
                  <Image
                    src={qrDataUrl}
                    alt="QR Code for prize redemption"
                    className="w-40 h-40 block"
                    width={160}
                    height={160}
                    unoptimized
                  />
                </div>
              )}

              {/* Staff code */}
              <div className="bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-3 mb-6 w-full text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  {t("mesa.games.prize.staffCode")}
                </p>
                <p className="text-2xl font-mono font-bold text-white tracking-wider">
                  {code}
                </p>
              </div>

              {/* Redeem button or redeemed state */}
              {isRedeemed ? (
                <div className="flex items-center gap-2 text-green-400">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="font-medium">
                    {t("mesa.games.prize.redeemed")}
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-400 text-center mb-4">
                    {t("mesa.games.prize.showStaff")}
                  </p>
                  <button
                    type="button"
                    onClick={handleRedeem}
                    disabled={isRedeeming}
                    className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-bold text-lg disabled:opacity-50"
                  >
                    {isRedeeming
                      ? t("mesa.games.prize.redeeming")
                      : t("mesa.games.prize.redeem")}
                  </button>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="hidden"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  repeatDelay: 0.3,
                }}
                className="text-5xl mb-4"
              >
                🎁
              </motion.div>
              <p className="text-gray-500">{t("mesa.games.prize.revealing")}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
