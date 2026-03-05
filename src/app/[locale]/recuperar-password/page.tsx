"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { APP_URL } from "@/lib/config/constants";

export default function RecuperarPasswordPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "pt";
  const t = useTranslations("recuperarPassword");

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${APP_URL}/${locale}/redefinir-password`,
      });
      // Always show success — never reveal if email exists
      setSubmitted(true);
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
                src="/logo.png"
                alt="Sushi in Sushi"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <h1 className="font-display text-2xl font-semibold text-gold tracking-[0.1em]">
            SUSHI IN SUSHI
          </h1>
          <p className="text-muted text-sm mt-2">{t("title")}</p>
        </div>

        {submitted ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
            <svg
              className="w-12 h-12 text-green-400 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-green-400 font-medium mb-2">{t("successTitle")}</p>
            <p className="text-muted text-sm">{t("successDesc")}</p>
          </div>
        ) : (
          <div className="bg-card border border-white/10 rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-muted text-sm text-center mb-6">
                {t("description")}
              </p>

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
          </div>
        )}

        <div className="text-center mt-6 space-y-2">
          <Link
            href={`/${locale}/entrar`}
            className="block text-muted text-sm hover:text-gold transition-colors"
          >
            {t("backToLogin")}
          </Link>
          <Link
            href={`/${locale}`}
            className="block text-muted/60 text-sm hover:text-muted transition-colors"
          >
            {t("backToSite")}
          </Link>
        </div>
      </div>
    </div>
  );
}
