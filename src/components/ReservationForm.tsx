"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useReservation, type ReservationFormData } from "@/presentation/hooks/useReservation";
import type { Location, ReservationOccasion } from "@/types/database";

// =============================================
// COMPONENT
// =============================================

interface ReservationFormProps {
  onSuccess?: () => void;
  defaultLocation?: Location;
}

export function ReservationForm({
  onSuccess,
  defaultLocation = "circunvalacao",
}: ReservationFormProps) {
  const t = useTranslations("reservationForm");
  const tR = useTranslations("reservation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ReservationFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    reservation_date: "",
    reservation_time: "",
    party_size: 2,
    location: defaultLocation,
    is_rodizio: true,
    special_requests: "",
    occasion: "",
    marketing_consent: false,
  });

  const occasions: { value: ReservationOccasion | ""; labelKey: string }[] = [
    { value: "", labelKey: "selectOptional" },
    { value: "birthday", labelKey: "birthday" },
    { value: "anniversary", labelKey: "celebration" },
    { value: "business", labelKey: "business" },
    { value: "other", labelKey: "other" },
  ];

  // Use the hook for business logic
  const {
    closureWarning,
    isCheckingClosure,
    availableTimeSlots,
    createReservation,
  } = useReservation({
    date: formData.reservation_date,
    location: formData.location,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await createReservation(formData);

    if (result.success) {
      setSuccess(true);
      onSuccess?.();
      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        reservation_date: "",
        reservation_time: "",
        party_size: 2,
        location: defaultLocation,
        is_rodizio: true,
        special_requests: "",
        occasion: "",
        marketing_consent: false,
      });
    } else {
      setError(result.error || t("errorDefault"));
    }

    setIsSubmitting(false);
  };

  const minDate = new Date().toISOString().split("T")[0];

  if (success) {
    return (
      <div className="text-center py-8" data-testid="success">
        <div className="text-5xl mb-4" role="img" aria-label={t("successTitle")}>✓</div>
        <h3 className="text-2xl font-semibold text-white mb-2">
          {t("successTitle")}
        </h3>
        <p className="text-gray-300 mb-6">
          {t("successMessage")}
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="px-6 py-2 bg-gold text-background font-medium hover:bg-gold-light transition-colors"
        >
          {t("newReservation")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm" data-testid="error" role="alert">
          {error}
        </div>
      )}

      {closureWarning && (
        <div className="p-4 bg-orange-500/20 border border-orange-500/50 rounded-lg text-orange-200 text-sm flex items-center gap-3" data-testid="closure-warning" role="alert">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{closureWarning}. {t("closureWarning")}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-12">
        {/* Coluna Esquerda — Dados essenciais */}
        <div className="space-y-6">
          {/* Nome */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-2">
                {t("firstName")} {t("required")}
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                required
                autoComplete="given-name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                placeholder="João"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-2">
                {t("lastName")} {t("required")}
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                required
                autoComplete="family-name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                placeholder="Silva"
              />
            </div>
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                {t("email")} {t("required")}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                placeholder="joao@email.com"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                {t("phone")} {t("required")}
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                placeholder="+351 912 345 678"
              />
            </div>
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="reservation_date" className="block text-sm font-medium text-gray-300 mb-2">
                {t("date")} {t("required")}
              </label>
              <input
                type="date"
                id="reservation_date"
                name="reservation_date"
                required
                min={minDate}
                value={formData.reservation_date}
                onChange={(e) =>
                  setFormData({ ...formData, reservation_date: e.target.value })
                }
                className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="reservation_time" className="block text-sm font-medium text-gray-300 mb-2">
                {t("time")} {t("required")}
              </label>
              <select
                id="reservation_time"
                name="reservation_time"
                required
                value={formData.reservation_time}
                onChange={(e) =>
                  setFormData({ ...formData, reservation_time: e.target.value })
                }
                className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              >
                <option value="">{t("selectTime")}</option>
                {availableTimeSlots.length === 0 ? (
                  <option value="" disabled>
                    {t("noTimesAvailable")}
                  </option>
                ) : (
                  availableTimeSlots.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))
                )}
              </select>
              {formData.reservation_date &&
                availableTimeSlots.length === 0 &&
                formData.reservation_date === new Date().toISOString().split("T")[0] && (
                  <p className="mt-1 text-xs text-orange-400">
                    {t("noTimesToday")}
                  </p>
                )}
            </div>
          </div>

          {/* Pessoas e Localização */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="party_size" className="block text-sm font-medium text-gray-300 mb-2">
                {t("partySize")} {t("required")}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={t("decreaseParty")}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      party_size: Math.max(1, formData.party_size - 1),
                    })
                  }
                  className="w-11 h-11 flex items-center justify-center bg-card border border-white/10 rounded-lg hover:border-gold text-white text-xl font-bold transition-colors"
                >
                  -
                </button>
                <span id="party_size" className="flex-1 text-center text-xl font-semibold text-white" aria-live="polite" aria-atomic="true">
                  {formData.party_size}
                </span>
                <button
                  type="button"
                  aria-label={t("increaseParty")}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      party_size: Math.min(20, formData.party_size + 1),
                    })
                  }
                  className="w-11 h-11 flex items-center justify-center bg-card border border-white/10 rounded-lg hover:border-gold text-white text-xl font-bold transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
                {t("restaurant")} {t("required")}
              </label>
              <select
                id="location"
                name="location"
                required
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value as Location })
                }
                className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
              >
                <option value="circunvalacao">Circunvalação</option>
                <option value="boavista">Boavista</option>
              </select>
            </div>
          </div>
        </div>

        {/* Coluna Direita — Preferências */}
        <div className="space-y-6 mt-6 lg:mt-0">
          {/* Tipo de Serviço */}
          <div role="group" aria-labelledby="service-type-label">
            <span id="service-type-label" className="block text-sm font-medium text-gray-300 mb-2">
              {t("serviceType")}
            </span>
            <div className="flex gap-4">
              <button
                type="button"
                name="is_rodizio"
                aria-pressed={formData.is_rodizio}
                onClick={() => setFormData({ ...formData, is_rodizio: true })}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  formData.is_rodizio
                    ? "bg-gold text-background"
                    : "bg-card border border-white/10 text-white hover:border-gold"
                }`}
              >
                {t("rodizio")}
              </button>
              <button
                type="button"
                aria-pressed={!formData.is_rodizio}
                onClick={() => setFormData({ ...formData, is_rodizio: false })}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  !formData.is_rodizio
                    ? "bg-gold text-background"
                    : "bg-card border border-white/10 text-white hover:border-gold"
                }`}
              >
                {t("alaCarte")}
              </button>
            </div>
          </div>

          {/* Ocasião */}
          <div>
            <label htmlFor="occasion" className="block text-sm font-medium text-gray-300 mb-2">
              {t("occasion")}
            </label>
            <select
              id="occasion"
              name="occasion"
              value={formData.occasion}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  occasion: e.target.value as ReservationOccasion | "",
                })
              }
              className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
            >
              {occasions.map((occ) => (
                <option key={occ.value} value={occ.value}>
                  {tR(occ.labelKey)}
                </option>
              ))}
            </select>
          </div>

          {/* Pedidos Especiais */}
          <div>
            <label htmlFor="special_requests" className="block text-sm font-medium text-gray-300 mb-2">
              {t("specialRequests")}
            </label>
            <textarea
              id="special_requests"
              name="special_requests"
              value={formData.special_requests}
              onChange={(e) =>
                setFormData({ ...formData, special_requests: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors resize-none"
              placeholder={t("specialRequestsPlaceholder")}
            />
          </div>

          {/* Marketing Consent */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="marketing_consent"
              name="marketing_consent"
              checked={formData.marketing_consent}
              onChange={(e) =>
                setFormData({ ...formData, marketing_consent: e.target.checked })
              }
              className="mt-1 w-4 h-4 accent-gold"
            />
            <label htmlFor="marketing_consent" className="text-sm text-gray-300">
              {t("marketingConsent")}
            </label>
          </div>
        </div>
      </div>

      {/* Submit — centrado */}
      <div className="flex flex-col items-center pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !!closureWarning || isCheckingClosure}
          className="w-full lg:w-auto lg:min-w-[320px] py-4 px-12 bg-gold text-background font-semibold text-lg tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          {t("confirmationNote")}
        </p>
      </div>
    </form>
  );
}
