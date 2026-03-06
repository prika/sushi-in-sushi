"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useSiteSettings } from "@/presentation/hooks/useSiteSettings";
import { pushGTMEvent } from "@/presentation/hooks/useGTMEvent";

export default function EntrarPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || "pt";
  const t = useTranslations("entrar");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { settings } = useSiteSettings();
  const notCustomerError = searchParams?.get("error") === "not_customer";

  // Redirect if already authenticated as customer
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(`/${locale}/conta`);
      }
    });
  }, [locale, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(t("errorCredentials"));
        return;
      }

      pushGTMEvent("login", { method: "email" });
      router.push(`/${locale}/conta`);
    } catch {
      setError(t("errorGeneral"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={`/${locale}`}>
            <div className="w-20 h-20 relative mx-auto mb-4">
              <Image
                src={settings?.logo_url || "/logo.png"}
                alt={settings?.brand_name ?? ""}
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <h1 className="font-display text-2xl font-semibold text-gold tracking-[0.1em] uppercase">
            {settings?.brand_name ?? ""}
          </h1>
          <p className="text-muted text-sm mt-2">{t("title")}</p>
        </div>

        <div className="bg-card border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            {t("heading")}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {notCustomerError && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-3 rounded-lg text-sm">
                {t("errorNotCustomer")}{" "}
                <Link href="/login" className="underline font-medium hover:text-amber-300">
                  /login
                </Link>
              </div>
            )}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm text-muted mb-2">
                {t("emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:ring-0 outline-none transition-colors"
                placeholder="o-seu@email.com"
                required
                autoComplete="email"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:ring-0 outline-none transition-colors"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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

            <div className="flex justify-end">
              <Link
                href={`/${locale}/recuperar-password`}
                className="text-xs text-muted hover:text-gold transition-colors"
              >
                {t("forgotPassword")}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gold text-black font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            {t("noAccount")}{" "}
            <Link href={`/${locale}/registar`} className="text-gold hover:underline">
              {t("createAccount")}
            </Link>
          </p>
        </div>

        <div className="text-center mt-6">
          <Link
            href={`/${locale}`}
            className="text-muted text-sm hover:text-white transition-colors"
          >
            {t("backToSite")}
          </Link>
        </div>
      </div>
    </div>
  );
}
