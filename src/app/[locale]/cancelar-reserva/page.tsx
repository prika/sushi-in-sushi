"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getReasonsForSource, type CancellationReason } from "@/lib/constants/cancellation-reasons";

type Step = "email" | "verify" | "select" | "confirm" | "success";

interface ReservationItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  location: string;
  is_rodizio: boolean;
  status: string;
  occasion: string | null;
  special_requests: string | null;
  tables_assigned: boolean;
}

const getLocationLabel = (slug: string): string => {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
};

const customerReasons = getReasonsForSource("customer");

export default function CancelarReservaPage() {
  const t = useTranslations("cancelReservation");
  const locale = useLocale();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [token, setToken] = useState("");
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<ReservationItem | null>(null);
  const [reasonId, setReasonId] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer with proper cleanup on unmount
  const cooldownActive = cooldown > 0;
  useEffect(() => {
    if (!cooldownActive) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownActive]);

  // Check if reservation is within 2h deadline
  const isWithinDeadline = (r: ReservationItem): boolean => {
    const dt = new Date(`${r.reservation_date}T${r.reservation_time}`);
    const twoHoursBefore = new Date(dt.getTime() - 2 * 60 * 60 * 1000);
    return new Date() <= twoHoursBefore;
  };

  const handleSendCode = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reservation-cancel/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("errorSendCode"));
        return;
      }

      setStep("verify");
      setCooldown(60);
    } catch {
      setError(t("errorConnection"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newCode.every((d) => d !== "")) {
      const fullToken = newCode.join("");
      setToken(fullToken);
      handleVerify(fullToken);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setCode(newCode);
      setToken(pasted);
      handleVerify(pasted);
    }
  };

  const handleVerify = async (tokenValue?: string) => {
    const tk = tokenValue || code.join("");
    if (tk.length !== 6) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reservation-cancel/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), token: tk }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("errorInvalidCode"));
        return;
      }

      setToken(tk);
      setReservations(data.reservations || []);
      setStep("select");
    } catch {
      setError(t("errorConnection"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectReservation = (r: ReservationItem) => {
    setSelectedReservation(r);
    setReasonId("");
    setCustomReason("");
    setError(null);
    setStep("confirm");
  };

  const handleCancel = async () => {
    if (!selectedReservation || !reasonId) return;

    const selectedReason = customerReasons.find((r) => r.id === reasonId);
    const finalReason = selectedReason?.isCustom
      ? customReason.trim()
      : selectedReason?.label || "";

    if (!finalReason) {
      setError(t("reasonRequired"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/reservation-cancel/${selectedReservation.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          token,
          reason: finalReason,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("errorCancelFailed"));
        return;
      }

      setStep("success");
    } catch {
      setError(t("errorConnection"));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const localeMap: Record<string, string> = {
      pt: "pt-PT", en: "en-US", fr: "fr-FR", de: "de-DE", it: "it-IT", es: "es-ES",
    };
    return new Date(dateStr).toLocaleDateString(localeMap[locale] || "pt-PT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const selectedReasonObj = customerReasons.find((r) => r.id === reasonId);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#D4AF37] font-[family-name:var(--font-cormorant)]">
            {t("pageTitle")}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t("pageSubtitle")}</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
          {/* Step indicator */}
          <div className="flex border-b border-gray-800">
            {["email", "verify", "select", "confirm"].map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 ${
                  ["email", "verify", "select", "confirm", "success"].indexOf(step) >= i
                    ? "bg-[#D4AF37]"
                    : "bg-gray-800"
                }`}
              />
            ))}
          </div>

          <div className="p-6">
            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Step 1: Email */}
            {step === "email" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{t("stepEmailTitle")}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {t("stepEmailDescription")}
                  </p>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                  placeholder={t("emailPlaceholder")}
                  className="w-full px-4 py-3 bg-[#252525] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none"
                />
                <button
                  onClick={handleSendCode}
                  disabled={isLoading || !email.trim()}
                  className="w-full py-3 bg-[#D4AF37] text-[#1a1a1a] font-semibold rounded-lg hover:bg-[#B8941F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t("sending") : t("sendCode")}
                </button>
              </div>
            )}

            {/* Step 2: Verify Code */}
            {step === "verify" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{t("stepVerifyTitle")}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {t("stepVerifyDescription")} <strong className="text-gray-300">{email}</strong>
                  </p>
                </div>
                {/* 6-digit code inputs */}
                <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { codeInputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      className="w-12 h-14 text-center text-2xl font-mono bg-[#252525] border border-gray-700 rounded-lg text-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none"
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <button
                    onClick={() => { setStep("email"); setCode(["", "", "", "", "", ""]); setError(null); }}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    {t("changeEmail")}
                  </button>
                  <button
                    onClick={handleSendCode}
                    disabled={cooldown > 0}
                    className="text-[#D4AF37] hover:text-[#B8941F] disabled:text-gray-600 disabled:cursor-not-allowed"
                  >
                    {cooldown > 0 ? t("resendCooldown", { seconds: cooldown }) : t("resendCode")}
                  </button>
                </div>
                {isLoading && (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]" />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Select Reservation */}
            {step === "select" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{t("stepSelectTitle")}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {t("stepSelectDescription")}
                  </p>
                </div>
                {reservations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">{t("noReservations")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reservations.map((r) => {
                      const canCancel = isWithinDeadline(r);
                      return (
                        <button
                          key={r.id}
                          onClick={() => canCancel && handleSelectReservation(r)}
                          disabled={!canCancel}
                          className={`w-full text-left p-4 rounded-lg border transition-colors ${
                            canCancel
                              ? "bg-[#252525] border-gray-700 hover:border-[#D4AF37] cursor-pointer"
                              : "bg-[#1e1e1e] border-gray-800 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">
                              {formatDate(r.reservation_date)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.status === "confirmed"
                                ? "bg-green-900/50 text-green-400"
                                : "bg-yellow-900/50 text-yellow-400"
                            }`}>
                              {r.status === "confirmed" ? t("statusConfirmed") : t("statusPending")}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span>{r.reservation_time}</span>
                            <span className="text-gray-600">|</span>
                            <span>{r.party_size} {t("people")}</span>
                            <span className="text-gray-600">|</span>
                            <span>{getLocationLabel(r.location)}</span>
                          </div>
                          {!canCancel && (
                            <p className="text-xs text-red-400 mt-2">
                              {t("deadlineWarning")}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Confirm Cancellation */}
            {step === "confirm" && selectedReservation && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{t("stepConfirmTitle")}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {t("stepConfirmDescription")}
                  </p>
                </div>

                {/* Reservation summary */}
                <div className="p-4 bg-[#252525] rounded-lg border border-gray-700 space-y-2">
                  <p className="text-white font-medium">{formatDate(selectedReservation.reservation_date)}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span>{selectedReservation.reservation_time}</span>
                    <span className="text-gray-600">|</span>
                    <span>{selectedReservation.party_size} {t("people")}</span>
                    <span className="text-gray-600">|</span>
                    <span>{getLocationLabel(selectedReservation.location)}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {selectedReservation.is_rodizio ? t("rodizio") : t("alaCarte")}
                  </p>
                </div>

                {/* Reason selection */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t("reasonLabel")}</label>
                  <select
                    value={reasonId}
                    onChange={(e) => setReasonId(e.target.value)}
                    className="w-full px-4 py-3 bg-[#252525] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none"
                  >
                    <option value="">{t("reasonPlaceholder")}</option>
                    {customerReasons.map((r: CancellationReason) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Custom reason textarea */}
                {selectedReasonObj?.isCustom && (
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder={t("reasonCustomPlaceholder")}
                    rows={3}
                    className="w-full px-4 py-3 bg-[#252525] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none resize-none"
                  />
                )}

                {/* Warning */}
                <p className="text-xs text-gray-500 text-center">
                  {t("irreversibleWarning")}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep("select"); setError(null); }}
                    className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-[#252525] transition-colors"
                  >
                    {t("back")}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isLoading || !reasonId || (selectedReasonObj?.isCustom && !customReason.trim())}
                    className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? t("cancelling") : t("cancelButton")}
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Success */}
            {step === "success" && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">{t("successTitle")}</h2>
                <p className="text-gray-400 text-sm">
                  {t("successMessage")}<br />
                  {t("successEmailNote")}
                </p>
                <a
                  href={`/${locale}/reservar`}
                  className="inline-block mt-4 px-6 py-3 bg-[#D4AF37] text-[#1a1a1a] font-semibold rounded-lg hover:bg-[#B8941F] transition-colors"
                >
                  {t("newReservation")}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6">
          {t("footerNote")}
        </p>
      </div>
    </div>
  );
}
