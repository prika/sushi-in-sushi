"use client";

import { useState, useEffect, memo } from "react";
import { ALL_ALLERGENS } from "@/lib/constants/allergens";
import type { SessionCustomer } from "@/types/database";

export interface CustomerFormData {
  display_name: string;
  full_name: string;
  email: string;
  phone: string;
  birth_date: string;
  marketing_consent: boolean;
  preferred_contact: "email" | "phone" | "none";
  allergens: string[];
}

const EMPTY_FORM: CustomerFormData = {
  display_name: "",
  full_name: "",
  email: "",
  phone: "",
  birth_date: "",
  marketing_consent: false,
  preferred_contact: "email",
  allergens: [],
};

interface CustomerIdentifyModalProps {
  currentCustomer: SessionCustomer | null;
  sessionCustomers: SessionCustomer[];
  isRegistering: boolean;
  error: string | null;
  t: (_key: string) => string;
  onClose: () => void;
  onSubmit: (_formData: CustomerFormData) => void;
}

export const CustomerIdentifyModal = memo(function CustomerIdentifyModal({
  currentCustomer,
  sessionCustomers,
  isRegistering,
  error,
  t,
  onClose,
  onSubmit,
}: CustomerIdentifyModalProps) {
  const [form, setForm] = useState<CustomerFormData>(EMPTY_FORM);

  // Pre-fill form when opening for an already-identified customer
  useEffect(() => {
    if (currentCustomer) {
      setForm({
        display_name: currentCustomer.display_name || "",
        full_name: currentCustomer.full_name || "",
        email: currentCustomer.email || "",
        phone: currentCustomer.phone || "",
        birth_date: currentCustomer.birth_date || "",
        marketing_consent: currentCustomer.marketing_consent || false,
        preferred_contact: currentCustomer.preferred_contact || "email",
        allergens: currentCustomer.allergens || [],
      });
    }
  }, [currentCustomer]);

  const hasIncompleteProfile =
    currentCustomer &&
    (!currentCustomer.email ||
      !currentCustomer.full_name ||
      !currentCustomer.birth_date);

  const hasChanges = () => {
    if (!currentCustomer) return true;
    return (
      form.display_name.trim() !== currentCustomer.display_name ||
      form.email.trim() !== (currentCustomer.email || "") ||
      form.phone.trim() !== (currentCustomer.phone || "") ||
      form.birth_date !== (currentCustomer.birth_date || "") ||
      form.marketing_consent !== (currentCustomer.marketing_consent || false) ||
      form.preferred_contact !== (currentCustomer.preferred_contact || "email") ||
      JSON.stringify([...form.allergens].sort()) !==
        JSON.stringify([...(currentCustomer.allergens || [])].sort())
    );
  };

  const handleSubmit = () => {
    if (hasChanges()) {
      onSubmit(form);
    } else {
      onClose();
    }
  };

  const getButtonText = () => {
    if (!currentCustomer) {
      return sessionCustomers.length === 0
        ? t("mesa.startOrdering")
        : t("mesa.addPerson");
    }
    return hasChanges()
      ? t("mesa.saveChanges") || "Guardar Alteracoes"
      : t("mesa.continue") || "Continuar";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      <div className="relative bg-[#1A1A1A] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-scale-up">
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1A1A] px-6 pt-6 pb-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">{t("mesa.identify")}</h3>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-white cursor-pointer"
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
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {t("mesa.customizeExperience")}
          </p>
        </div>

        <div className="p-6">
          {/* Registration Form */}
          <div className="space-y-4">
            {/* Display Name - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t("mesa.howToAddress")}
              </label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    display_name: e.target.value,
                  }))
                }
                placeholder={t("mesa.namePlaceholder")}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:border-[#D4AF37] focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Incentive Message - Only show if no additional data has been provided */}
            {!currentCustomer?.email &&
              !currentCustomer?.phone &&
              !currentCustomer?.birth_date && (
                <div className="bg-gradient-to-r from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎁</span>
                    <div>
                      <p className="text-sm font-medium text-[#D4AF37]">
                        {t("mesa.exclusiveBenefits")}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t("mesa.benefitsDesc")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Allergen Selection - Collapsible */}
            <details className="group" open={form.allergens.length > 0}>
              <summary className="flex items-center justify-between cursor-pointer py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <span>
                  {t("mesa.allergenQuestion")}
                  {form.allergens.length > 0 && (
                    <span className="ml-2 text-xs text-red-400">
                      ({form.allergens.length})
                    </span>
                  )}
                </span>
                <svg
                  className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="flex flex-wrap gap-2 mt-2">
                {ALL_ALLERGENS.map((allergen) => {
                  const isSelected = form.allergens.includes(allergen.id);
                  return (
                    <button
                      key={allergen.id}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          allergens: isSelected
                            ? prev.allergens.filter((a) => a !== allergen.id)
                            : [...prev.allergens, allergen.id],
                        }))
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-red-500/20 text-red-300 border border-red-500/50"
                          : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
                      }`}
                    >
                      <span>{allergen.emoji}</span>
                      <span>
                        {t(`mesa.productDetail.allergenNames.${allergen.id}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {form.allergens.length > 0 && (
                <p className="text-xs text-red-400/70 mt-2">
                  {t("mesa.allergenWarning")}
                </p>
              )}
            </details>

            {/* Incomplete profile reminder */}
            {currentCustomer &&
              (currentCustomer.email ||
                currentCustomer.phone ||
                currentCustomer.birth_date) &&
              hasIncompleteProfile && (
                <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">&#8505;&#65039;</span>
                    <div>
                      <p className="text-sm font-medium text-blue-300">
                        Complete o seu perfil
                      </p>
                      <p className="text-xs text-blue-400/80 mt-1">
                        Adicione os dados em falta para desbloquear todos os
                        beneficios
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Optional Fields - Collapsible */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer py-2 text-sm text-gray-400 hover:text-white transition-colors">
                <span>{t("mesa.additionalData")}</span>
                <svg
                  className="w-5 h-5 transform group-open:rotate-180 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>

              <div className="space-y-4 pt-4">
                {/* Email */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 flex items-center gap-2">
                    {t("mesa.email")}
                    {currentCustomer?.email_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Verificado
                      </span>
                    )}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder={t("mesa.emailPlaceholder")}
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg focus:border-[#D4AF37] focus:outline-none text-sm"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5 flex items-center gap-2">
                    {t("mesa.phone")}
                    {currentCustomer?.phone_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Verificado
                      </span>
                    )}
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder={t("mesa.phonePlaceholder")}
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg focus:border-[#D4AF37] focus:outline-none text-sm"
                  />
                  <p className="text-xs text-amber-500/70 mt-1 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verificacao por SMS requer configuracao. Use email.
                  </p>
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    {t("mesa.birthDate")}
                  </label>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        birth_date: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg focus:border-[#D4AF37] focus:outline-none text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t("mesa.birthdaySurprise")}
                  </p>
                </div>

                {/* Preferred Contact */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {t("mesa.preferredContact")}
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "email", label: "Email" },
                      { value: "phone", label: "Telemovel" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            preferred_contact: option.value as
                              | "email"
                              | "phone",
                          }))
                        }
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                          form.preferred_contact === option.value
                            ? "bg-[#D4AF37] text-black"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Marketing Consent */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={form.marketing_consent}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          marketing_consent: e.target.checked,
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        form.marketing_consent
                          ? "bg-[#D4AF37] border-[#D4AF37]"
                          : "border-gray-600 group-hover:border-gray-500"
                      }`}
                    >
                      {form.marketing_consent && (
                        <svg
                          className="w-3 h-3 text-black"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">
                    {t("mesa.receivePromotions")}
                  </span>
                </label>
              </div>
            </details>
          </div>

          {/* Submit Button */}
          <div className="mt-6 pt-4 border-t border-gray-800">
            {error && (
              <div className="mb-3 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!form.display_name.trim() || isRegistering}
              className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-bold text-lg hover:bg-[#C4A030] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isRegistering ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full" />
                  <span>A guardar...</span>
                </div>
              ) : (
                getButtonText()
              )}
            </button>
          </div>

          {/* Active customers in session */}
          {sessionCustomers.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-800/50">
              <p className="text-xs text-gray-500 mb-2.5 uppercase tracking-wide">
                {t("mesa.atTable")}
              </p>
              <div className="flex flex-wrap gap-2">
                {sessionCustomers.map((customer) => (
                  <span
                    key={customer.id}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      currentCustomer?.id === customer.id
                        ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                        : "bg-gray-800/50 text-gray-400"
                    }`}
                  >
                    {customer.display_name}
                    {customer.is_session_host && (
                      <span className="ml-1 opacity-70">
                        {t("mesa.host")}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
