"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  computeCustomerTier,
  CUSTOMER_TIER_LABELS,
  CUSTOMER_TIER_COLORS,
} from "@/domain/value-objects/CustomerTier";

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  birth_date: string | null;
  points: number;
  total_spent: number;
  visit_count: number;
  marketing_consent: boolean;
}

interface Reservation {
  id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  location: string;
}

const LOCATION_LABELS: Record<string, string> = {
  circunvalacao: "Circunvalação",
  boavista: "Boavista",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  confirmed: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
  completed: "bg-blue-500/20 text-blue-400",
  no_show: "bg-gray-500/20 text-gray-400",
};

export default function ContaPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "pt";
  const t = useTranslations("conta");

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    birth_date: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/${locale}/entrar`);
        return;
      }

      const profileRes = await fetch("/api/auth/customer-me");

      if (!profileRes.ok) {
        // Sign out to break redirect loop (e.g. staff user without customer record)
        await supabase.auth.signOut();
        router.replace(`/${locale}/entrar?error=not_customer`);
        return;
      }

      const profileData = await profileRes.json();
      const { reservations: customerReservations, ...profile } = profileData;
      setCustomer(profile);
      setEditForm({
        name: profile.name || "",
        phone: profile.phone || "",
        birth_date: profile.birth_date || "",
      });
      setReservations(Array.isArray(customerReservations) ? customerReservations : []);
    } catch {
      router.replace(`/${locale}/entrar`);
    } finally {
      setIsLoading(false);
    }
  }, [locale, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/auth/customer-me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || t("saveError"));
        return;
      }

      const updated = await res.json();
      setCustomer(updated);
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError(t("errorGeneral"));
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t("statusPending"),
      confirmed: t("statusConfirmed"),
      cancelled: t("statusCancelled"),
      completed: t("statusCompleted"),
      no_show: t("statusNoShow"),
    };
    return map[status] || status;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!customer) return null;

  const tier = computeCustomerTier({
    email: customer.email,
    phone: customer.phone,
    birthDate: customer.birth_date,
    visitCount: customer.visit_count,
    totalSpent: customer.total_spent,
  });
  const tierLabel = CUSTOMER_TIER_LABELS[tier];
  const tierColors = CUSTOMER_TIER_COLORS[tier];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 md:pt-44 pb-16 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-white">
              {t("greeting", { name: customer.name.split(" ")[0] })}
            </h1>
            <p className="text-muted mt-1">{customer.email}</p>
          </div>

          {/* Tier + Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-white/10 rounded-xl p-4">
              <p className="text-xs text-muted uppercase tracking-wider mb-2">
                {t("tier")}
              </p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${tierColors.bg} ${tierColors.text}`}
              >
                {tierLabel}
              </span>
            </div>
            <div className="bg-card border border-white/10 rounded-xl p-4">
              <p className="text-xs text-muted uppercase tracking-wider mb-2">
                {t("points")}
              </p>
              <p className="text-2xl font-bold text-gold">{customer.points}</p>
            </div>
            <div className="bg-card border border-white/10 rounded-xl p-4">
              <p className="text-xs text-muted uppercase tracking-wider mb-2">
                {t("visits")}
              </p>
              <p className="text-2xl font-bold text-white">
                {customer.visit_count}
              </p>
            </div>
          </div>

          {/* Profile */}
          <div className="bg-card border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {t("profileTitle")}
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-gold hover:underline"
                >
                  {t("edit")}
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4">
                {saveError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                    {saveError}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-muted mb-2">{t("nameLabel")}</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:ring-0 outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted mb-2">
                    {t("phoneLabel")}
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:ring-0 outline-none transition-colors"
                    placeholder={t("phonePlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted mb-2">
                    {t("birthDateLabel")}
                  </label>
                  <input
                    type="date"
                    value={editForm.birth_date}
                    onChange={(e) =>
                      setEditForm({ ...editForm, birth_date: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:ring-0 outline-none transition-colors"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-gold text-black font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 text-sm"
                  >
                    {isSaving ? t("saving") : t("save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setSaveError("");
                    }}
                    className="px-6 py-2.5 border border-white/20 text-muted hover:text-white rounded-lg transition-colors text-sm"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="space-y-3">
                {saveSuccess && (
                  <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm mb-4">
                    {t("saveSuccess")}
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted text-sm">{t("nameLabel")}</dt>
                  <dd className="text-white text-sm font-medium">
                    {customer.name}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted text-sm">{t("emailLabel")}</dt>
                  <dd className="text-white text-sm font-medium">
                    {customer.email}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted text-sm">{t("phoneLabel")}</dt>
                  <dd className="text-white text-sm font-medium">
                    {customer.phone || (
                      <span className="text-gray-600">{t("notDefined")}</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted text-sm">{t("birthDateLabel")}</dt>
                  <dd className="text-white text-sm font-medium">
                    {customer.birth_date ? (
                      new Date(customer.birth_date).toLocaleDateString(
                        locale === "pt" ? "pt-PT" : locale,
                      )
                    ) : (
                      <span className="text-gray-600">{t("notDefined_f")}</span>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {/* Reservations */}
          {reservations.length > 0 && (
            <div className="bg-card border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">
                  {t("reservationsTitle")}
                </h2>
                <Link
                  href={`/${locale}/reservar`}
                  className="text-sm text-gold hover:underline"
                >
                  {t("newReservation")}
                </Link>
              </div>

              <div className="space-y-3">
                {reservations.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">
                        {new Date(r.reservation_date).toLocaleDateString(
                          locale === "pt" ? "pt-PT" : locale,
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )}
                        {r.reservation_time && ` · ${r.reservation_time.slice(0, 5)}`}
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        {r.party_size}{" "}
                        {r.party_size === 1 ? t("person") : t("people")} ·{" "}
                        {LOCATION_LABELS[r.location] || r.location}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || "bg-gray-500/20 text-gray-400"}`}
                    >
                      {getStatusLabel(r.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA if no reservations */}
          {reservations.length === 0 && (
            <div className="bg-card border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-muted mb-4">{t("noReservations")}</p>
              <Link
                href={`/${locale}/reservar`}
                className="inline-block px-6 py-3 bg-gold text-black font-semibold rounded-full hover:bg-gold/90 transition-colors text-sm"
              >
                {t("bookTable")}
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
