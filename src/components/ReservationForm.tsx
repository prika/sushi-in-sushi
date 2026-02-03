"use client";

import { useState, useEffect } from "react";
import type { Location, ReservationOccasion } from "@/types/database";

interface ReservationFormProps {
  onSuccess?: () => void;
  defaultLocation?: Location;
}

const OCCASIONS: { value: ReservationOccasion | ""; label: string }[] = [
  { value: "", label: "Selecione (opcional)" },
  { value: "birthday", label: "Aniversário" },
  { value: "anniversary", label: "Celebração" },
  { value: "business", label: "Negócios" },
  { value: "other", label: "Outro" },
];

const TIME_SLOTS = [
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
];

export function ReservationForm({
  onSuccess,
  defaultLocation = "circunvalacao",
}: ReservationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [closureWarning, setClosureWarning] = useState<string | null>(null);
  const [isCheckingClosure, setIsCheckingClosure] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    reservation_date: "",
    reservation_time: "",
    party_size: 2,
    location: defaultLocation as Location,
    is_rodizio: true,
    special_requests: "",
    occasion: "" as ReservationOccasion | "",
    marketing_consent: false,
  });

  // Check if date is closed when date or location changes
  useEffect(() => {
    const checkClosure = async () => {
      if (!formData.reservation_date || !formData.location) {
        setClosureWarning(null);
        return;
      }

      setIsCheckingClosure(true);
      try {
        const response = await fetch(
          `/api/closures/check?date=${formData.reservation_date}&location=${formData.location}`
        );
        const data = await response.json();

        if (data.isClosed) {
          setClosureWarning(data.reason || "O restaurante está fechado nesta data");
        } else {
          setClosureWarning(null);
        }
      } catch (err) {
        console.error("Error checking closure:", err);
        setClosureWarning(null);
      } finally {
        setIsCheckingClosure(false);
      }
    };

    checkClosure();
  }, [formData.reservation_date, formData.location]);

  // Filter time slots based on current time (for same-day reservations)
  const getAvailableTimeSlots = () => {
    if (!formData.reservation_date) return TIME_SLOTS;

    const today = new Date().toISOString().split("T")[0];
    if (formData.reservation_date !== today) return TIME_SLOTS;

    const now = new Date();
    const bufferMinutes = 30; // 30 minutes buffer

    return TIME_SLOTS.filter((slot) => {
      const [hours, minutes] = slot.split(":").map(Number);
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);
      const bufferTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);
      return slotTime > bufferTime;
    });
  };

  const availableTimeSlots = getAvailableTimeSlots();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          occasion: formData.occasion || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao criar reserva");
      }

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar reserva");
    } finally {
      setIsSubmitting(false);
    }
  };

  const minDate = new Date().toISOString().split("T")[0];

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">✓</div>
        <h3 className="text-2xl font-semibold text-white mb-2">
          Reserva Recebida!
        </h3>
        <p className="text-muted mb-6">
          Entraremos em contacto para confirmar a sua reserva.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="px-6 py-2 bg-gold text-background font-medium hover:bg-gold-light transition-colors"
        >
          Fazer Nova Reserva
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {closureWarning && (
        <div className="p-4 bg-orange-500/20 border border-orange-500/50 rounded-lg text-orange-200 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{closureWarning}. Por favor escolha outra data.</span>
        </div>
      )}

      {/* Nome */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Primeiro Nome *
          </label>
          <input
            type="text"
            required
            value={formData.first_name}
            onChange={(e) =>
              setFormData({ ...formData, first_name: e.target.value })
            }
            className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-muted focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
            placeholder="João"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Apelido *
          </label>
          <input
            type="text"
            required
            value={formData.last_name}
            onChange={(e) =>
              setFormData({ ...formData, last_name: e.target.value })
            }
            className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-muted focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
            placeholder="Silva"
          />
        </div>
      </div>

      {/* Contacto */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-muted focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
            placeholder="joao@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Telefone *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-muted focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
            placeholder="+351 912 345 678"
          />
        </div>
      </div>

      {/* Data e Hora */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Data *
          </label>
          <input
            type="date"
            required
            min={minDate}
            value={formData.reservation_date}
            onChange={(e) =>
              setFormData({ ...formData, reservation_date: e.target.value })
            }
            className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-muted focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Hora *
          </label>
          <select
            required
            value={formData.reservation_time}
            onChange={(e) =>
              setFormData({ ...formData, reservation_time: e.target.value })
            }
            className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-muted focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
          >
            <option value="">Selecione a hora</option>
            {availableTimeSlots.length === 0 ? (
              <option value="" disabled>
                Sem horários disponíveis
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
                Não há mais horários disponíveis para hoje
              </p>
            )}
        </div>
      </div>

      {/* Pessoas e Localização */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Número de Pessoas *
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  party_size: Math.max(1, formData.party_size - 1),
                })
              }
              className="w-10 h-10 flex items-center justify-center bg-card border border-white/10 rounded-lg hover:border-gold text-white text-xl font-bold transition-colors"
            >
              -
            </button>
            <span className="flex-1 text-center text-xl font-semibold text-white">
              {formData.party_size}
            </span>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  party_size: Math.min(20, formData.party_size + 1),
                })
              }
              className="w-10 h-10 flex items-center justify-center bg-card border border-white/10 rounded-lg hover:border-gold text-white text-xl font-bold transition-colors"
            >
              +
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Restaurante *
          </label>
          <select
            required
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value as Location })
            }
            className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-muted focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
          >
            <option value="circunvalacao">Circunvalação</option>
            <option value="boavista">Boavista</option>
          </select>
        </div>
      </div>

      {/* Tipo de Serviço */}
      <div>
        <label className="block text-sm font-medium text-muted mb-2">
          Tipo de Serviço
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, is_rodizio: true })}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              formData.is_rodizio
                ? "bg-gold text-background"
                : "bg-card border border-white/10 text-white hover:border-gold"
            }`}
          >
            Rodízio
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, is_rodizio: false })}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              !formData.is_rodizio
                ? "bg-gold text-background"
                : "bg-card border border-white/10 text-white hover:border-gold"
            }`}
          >
            À Carta
          </button>
        </div>
      </div>

      {/* Ocasião */}
      <div>
        <label className="block text-sm font-medium text-muted mb-2">
          Ocasião
        </label>
        <select
          value={formData.occasion}
          onChange={(e) =>
            setFormData({
              ...formData,
              occasion: e.target.value as ReservationOccasion | "",
            })
          }
          className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-muted focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
        >
          {OCCASIONS.map((occ) => (
            <option key={occ.value} value={occ.value}>
              {occ.label}
            </option>
          ))}
        </select>
      </div>

      {/* Pedidos Especiais */}
      <div>
        <label className="block text-sm font-medium text-muted mb-2">
          Pedidos Especiais / Alergias
        </label>
        <textarea
          value={formData.special_requests}
          onChange={(e) =>
            setFormData({ ...formData, special_requests: e.target.value })
          }
          rows={3}
          className="w-full px-4 py-3 bg-card border border-white/10 rounded-lg text-white placeholder-muted focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors resize-none"
          placeholder="Informe-nos de alergias ou pedidos especiais..."
        />
      </div>

      {/* Marketing Consent */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="marketing_consent"
          checked={formData.marketing_consent}
          onChange={(e) =>
            setFormData({ ...formData, marketing_consent: e.target.checked })
          }
          className="mt-1 w-4 h-4 accent-gold"
        />
        <label htmlFor="marketing_consent" className="text-sm text-muted">
          Aceito receber novidades e promoções por email
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !!closureWarning || isCheckingClosure}
        className="w-full py-4 bg-gold text-background font-semibold text-lg tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "A processar..." : "Confirmar Reserva"}
      </button>

      <p className="text-xs text-muted text-center">
        A sua reserva será confirmada por telefone ou email.
      </p>
    </form>
  );
}
