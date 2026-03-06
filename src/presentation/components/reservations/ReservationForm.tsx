"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useReservation, type ReservationFormData } from "@/presentation/hooks/useReservation";
import type { Location, ReservationOccasion } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

// =============================================
// COMPONENT
// =============================================

interface ReservationFormProps {
  onSuccess?: () => void;
  defaultLocation?: Location;
}

interface CustomerProfile {
  name: string;
  email: string;
  phone?: string | null;
  marketing_consent?: boolean;
}

export function ReservationForm({
  onSuccess,
  defaultLocation,
}: ReservationFormProps) {
  const t = useTranslations("reservationForm");
  const tR = useTranslations("reservation");
  const params = useParams();
  const locale = (params?.locale as string) || "pt";

  // Form state
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
    location: defaultLocation || "",
    is_rodizio: true,
    special_requests: "",
    occasion: "",
    marketing_consent: false,
  });

  // Refs for auto-focus
  const dateRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Auth state
  const [loggedInCustomer, setLoggedInCustomer] = useState<CustomerProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  // Track which fields were pre-filled by customer profile
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Dynamic restaurant locations
  const [restaurantLocations, setRestaurantLocations] = useState<{ slug: string; name: string }[]>([]);
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("restaurants")
      .select("slug, name")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data?.length) {
          setRestaurantLocations(data);
          // Set default location from DB if none was provided
          if (!defaultLocation) {
            setFormData((prev) => ({ ...prev, location: data[0].slug }));
          }
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const occasions: { value: ReservationOccasion | ""; labelKey: string }[] = [
    { value: "", labelKey: "selectOptional" },
    { value: "birthday", labelKey: "birthday" },
    { value: "anniversary", labelKey: "celebration" },
    { value: "business", labelKey: "business" },
    { value: "other", labelKey: "other" },
  ];

  // Check auth on mount
  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const res = await fetch("/api/auth/customer-me");
          if (res.ok) {
            const customer = await res.json();
            if (isMounted) prefillFromCustomer(customer);
          }
        }
      } catch {
        // no-op: keep guest mode fallback
      } finally {
        if (isMounted) setAuthChecked(true);
      }
    })();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prefillFromCustomer = (customer: CustomerProfile) => {
    setLoggedInCustomer(customer);
    const nameParts = (customer.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    const hasPhone = !!customer.phone;

    // Track which fields are locked (only lock non-empty values)
    const locked = new Set<string>();
    if (firstName) locked.add("first_name");
    if (lastName) locked.add("last_name");
    if (customer.email) locked.add("email");
    if (hasPhone) locked.add("phone");
    setLockedFields(locked);

    setFormData((prev) => ({
      ...prev,
      first_name: firstName,
      last_name: lastName,
      email: customer.email || "",
      phone: customer.phone || prev.phone,
      marketing_consent: customer.marketing_consent ?? prev.marketing_consent,
    }));

    // Auto-focus first empty required field
    setTimeout(() => {
      if (!hasPhone) {
        phoneRef.current?.focus();
      } else {
        dateRef.current?.focus();
      }
    }, 100);
  };

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsSigningIn(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (signInError) {
        setLoginError(t("accountBannerWrongCredentials"));
        return;
      }
      const res = await fetch("/api/auth/customer-me");
      if (res.ok) {
        const customer = await res.json();
        prefillFromCustomer(customer);
      } else {
        setLoggedInCustomer({ name: loginEmail, email: loginEmail });
        setFormData((prev) => ({ ...prev, email: loginEmail }));
      }
      setShowLoginPanel(false);
    } catch {
      setLoginError(t("accountBannerError"));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setLoggedInCustomer(null);
    setLockedFields(new Set());
  };

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
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        reservation_date: "",
        reservation_time: "",
        party_size: 2,
        location: defaultLocation || "",
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

  const inputClass = "w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors";
  const lockedClass = "w-full px-4 py-3 bg-card/50 border border-white/5 rounded-lg text-white/50 cursor-not-allowed outline-none";
  const needsAttentionClass = "w-full px-4 py-3 bg-card border border-gold/40 rounded-lg text-white placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors ring-1 ring-gold/20";

  const getInputClass = (fieldName: string, value: string) => {
    if (lockedFields.has(fieldName)) return lockedClass;
    if (loggedInCustomer && !value) return needsAttentionClass;
    return inputClass;
  };

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
    <div className="space-y-6">
      {/* ── Account Banner ─────────────────────────────────────────── */}
      {authChecked && (
        loggedInCustomer ? (
          /* Logged in state */
          <div className="flex items-center gap-3 px-4 py-3 bg-gold/10 border border-gold/30 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gold text-sm font-semibold truncate">
                {t("accountBannerLoggedIn", { name: loggedInCustomer.name.split(" ")[0] })}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {t("accountBannerLoggedInSub")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-gray-500 hover:text-white transition-colors whitespace-nowrap flex-shrink-0"
            >
              {t("accountBannerSignOut")}
            </button>
          </div>
        ) : (
          /* Guest state — login incentive */
          <div className="rounded-xl border border-white/10 overflow-hidden">
            {/* Header row — always visible */}
            <button
              type="button"
              onClick={() => setShowLoginPanel(!showLoginPanel)}
              className="w-full flex items-center gap-4 px-4 py-3.5 bg-gradient-to-r from-gold/10 to-card hover:from-gold/15 transition-colors text-left"
              aria-expanded={showLoginPanel}
            >
              <div className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center flex-shrink-0">
                <svg className="w-4.5 h-4.5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" style={{ width: "18px", height: "18px" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">
                  {t("accountBannerTitle")}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {t("accountBannerSubtitle")}
                </p>
              </div>
              <span className="text-gold text-xs font-semibold flex-shrink-0 flex items-center gap-1">
                {t("accountBannerLogin")}
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${showLoginPanel ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            {/* Expandable login form */}
            {showLoginPanel && (
              <form
                onSubmit={handleQuickLogin}
                className="px-4 pb-4 pt-3 border-t border-white/10 bg-card/60"
              >
                {loginError && (
                  <p className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {loginError}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="o-seu@email.com"
                    className="flex-1 px-3 py-2.5 bg-card border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                  />
                  <div className="relative flex-1">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder={t("accountBannerPassword")}
                      className="w-full pl-3 pr-10 py-2.5 bg-card border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label={showLoginPassword ? t("hidePassword") : t("showPassword")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showLoginPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isSigningIn}
                    className="sm:w-auto px-5 py-2.5 bg-gold text-background text-sm font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    {isSigningIn ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      t("accountBannerLoginBtn")
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2.5 text-xs text-gray-500">
                  <span>
                    {t("accountBannerNoAccount")}{" "}
                    <a href={`/${locale}/registar`} className="text-gold hover:underline">
                      {t("accountBannerCreateAccount")}
                    </a>
                  </span>
                  <a href={`/${locale}/recuperar-password`} className="hover:text-gray-300 transition-colors">
                    {t("accountBannerForgotPassword")}
                  </a>
                </div>
              </form>
            )}
          </div>
        )
      )}

      {/* ── Reservation Form ────────────────────────────────────────── */}
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
                  disabled={lockedFields.has("first_name")}
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  className={getInputClass("first_name", formData.first_name)}
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
                  disabled={lockedFields.has("last_name")}
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  className={getInputClass("last_name", formData.last_name)}
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
                  disabled={lockedFields.has("email")}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={getInputClass("email", formData.email)}
                  placeholder="joao@email.com"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                  {t("phone")} {t("required")}
                </label>
                <input
                  ref={phoneRef}
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  autoComplete="tel"
                  disabled={lockedFields.has("phone")}
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className={getInputClass("phone", formData.phone)}
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
                  ref={dateRef}
                  type="date"
                  id="reservation_date"
                  name="reservation_date"
                  required
                  min={minDate}
                  value={formData.reservation_date}
                  onChange={(e) =>
                    setFormData({ ...formData, reservation_date: e.target.value })
                  }
                  className={getInputClass("reservation_date", formData.reservation_date)}
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
                  className={getInputClass("reservation_time", formData.reservation_time)}
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
                  {restaurantLocations.map((loc) => (
                    <option key={loc.slug} value={loc.slug}>{loc.name}</option>
                  ))}
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

            {/* Marketing Consent — hidden if logged in and already opted in */}
            {(!loggedInCustomer || !loggedInCustomer.marketing_consent) && (
              <label
                htmlFor="marketing_consent"
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.marketing_consent
                    ? "border-gold/40 bg-gold/5"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <input
                  type="checkbox"
                  id="marketing_consent"
                  name="marketing_consent"
                  checked={formData.marketing_consent}
                  onChange={(e) =>
                    setFormData({ ...formData, marketing_consent: e.target.checked })
                  }
                  className="mt-0.5 w-4 h-4 accent-gold flex-shrink-0"
                />
                <div>
                  <span className="text-sm text-gray-300 font-medium block">
                    {t("marketingConsent")}
                  </span>
                  {!loggedInCustomer && (
                    <span className="text-xs text-gray-500 mt-0.5 block">
                      {t("marketingConsentNote")}{" "}
                      <a href={`/${locale}/registar`} className="text-gold hover:underline">
                        {t("marketingConsentRegister")}
                      </a>
                    </span>
                  )}
                </div>
              </label>
            )}
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
    </div>
  );
}
