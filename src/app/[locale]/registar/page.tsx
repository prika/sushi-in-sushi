"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export default function RegistarPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "pt";
  const t = useTranslations("registar");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError(t("errorPasswordMatch"));
      return;
    }
    if (form.password.length < 8) {
      setError(t("errorPasswordLength"));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/customer-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("errorGeneral"));
        return;
      }

      // Auto sign-in after registration
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      router.push(`/${locale}/conta`);
    } catch {
      setError(t("errorGeneral"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 lg:gap-12 items-center">
        {/* Left Column - Branding & Benefits */}
        <div className="text-center lg:text-left mb-8 lg:mb-0">
          <Link href={`/${locale}`}>
            <div className="w-20 h-20 relative mx-auto lg:mx-0 mb-4">
              <Image
                src="/logo.png"
                alt="Sushi in Sushi"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-gold tracking-[0.1em]">
            SUSHI IN SUSHI
          </h1>
          <p className="text-muted text-sm mt-2 mb-8">{t("title")}</p>

          <div className="hidden lg:block space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium">{t("benefitPointsTitle")}</h3>
                <p className="text-muted text-sm mt-1">{t("benefitPointsDesc")}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium">{t("benefitOffersTitle")}</h3>
                <p className="text-muted text-sm mt-1">{t("benefitOffersDesc")}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium">{t("benefitReservationsTitle")}</h3>
                <p className="text-muted text-sm mt-1">{t("benefitReservationsDesc")}</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block mt-8">
            <Link
              href={`/${locale}`}
              className="text-muted text-sm hover:text-white transition-colors"
            >
              {t("backToSite")}
            </Link>
          </div>
        </div>

        {/* Right Column - Form */}
        <div>
          <div className="bg-card border border-white/10 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6 text-center">
              {t("heading")}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm text-muted mb-2">
                  {t("nameLabel")}
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:ring-0 outline-none transition-colors"
                  placeholder={t("namePlaceholder")}
                  required
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm text-muted mb-2">
                  {t("emailLabel")}
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:ring-0 outline-none transition-colors"
                  placeholder="o-seu@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm text-muted mb-2">
                  {t("phoneLabel")}{" "}
                  <span className="text-gray-600">{t("phoneOptional")}</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:ring-0 outline-none transition-colors"
                  placeholder={t("phonePlaceholder")}
                  autoComplete="tel"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm text-muted mb-2">
                  {t("passwordLabel")}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:ring-0 outline-none transition-colors"
                    placeholder={t("passwordPlaceholder")}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm text-muted mb-2">
                  {t("confirmLabel")}
                </label>
                <input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:ring-0 outline-none transition-colors"
                  placeholder={t("confirmPlaceholder")}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gold text-black font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t("submitting")}
                  </>
                ) : (
                  t("submit")
                )}
              </button>
            </form>

            <p className="text-center text-sm text-muted mt-6">
              {t("alreadyHaveAccount")}{" "}
              <Link href={`/${locale}/entrar`} className="text-gold hover:underline">
                {t("login")}
              </Link>
            </p>
          </div>

          <div className="text-center mt-6 lg:hidden">
            <Link
              href={`/${locale}`}
              className="text-muted text-sm hover:text-white transition-colors"
            >
              {t("backToSite")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
