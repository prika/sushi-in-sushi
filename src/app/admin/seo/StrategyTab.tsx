"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, Button } from "@/presentation/components/ui";

// ─── Objective Categories & Definitions ─────────────────────────────────────

interface ObjectiveDef {
  id: string;
  label: string;
  description: string;
  kpi: string;
}

interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  objectives: ObjectiveDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "acquisition",
    label: "Aquisicao de Clientes",
    icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
    color: "blue",
    objectives: [
      { id: "acq_new_customers", label: "Atrair novos clientes", description: "Aumentar visibilidade e trazer pessoas que nunca visitaram", kpi: "Novos clientes/mes" },
      { id: "acq_tourists", label: "Captar turistas", description: "Atrair visitantes internacionais", kpi: "% sessoes locale != pt" },
      { id: "acq_local_seo", label: "Dominar pesquisa local", description: "Top Google Maps 'sushi perto de mim'", kpi: "Trafego organico" },
      { id: "acq_social_discovery", label: "Descoberta via redes sociais", description: "Instagram, TikTok, redes", kpi: "Trafego social" },
      { id: "acq_delivery_platforms", label: "Presenca em plataformas", description: "UberEats, Glovo, TheFork", kpi: "Pedidos delivery/mes" },
    ],
  },
  {
    id: "retention",
    label: "Retencao e Fidelizacao",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    color: "rose",
    objectives: [
      { id: "ret_repeat_visits", label: "Aumentar visitas repetidas", description: "Fidelizar clientes existentes", kpi: "% clientes 2+ visitas/mes" },
      { id: "ret_loyalty_engagement", label: "Engagement do programa", description: "Subir tiers do programa de fidelizacao", kpi: "% clientes tier 3+" },
      { id: "ret_avg_ticket", label: "Aumentar ticket medio", description: "Mais revenue por visita", kpi: "Ticket medio vs anterior" },
      { id: "ret_reactivation", label: "Reativar clientes inativos", description: "Trazer de volta quem nao vem ha 30+ dias", kpi: "Reativados/mes" },
      { id: "ret_lifetime_value", label: "Valor do cliente a longo prazo", description: "Maximizar LTV", kpi: "LTV medio por tier" },
    ],
  },
  {
    id: "reservations",
    label: "Reservas e Comparencia",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    color: "emerald",
    objectives: [
      { id: "res_increase_bookings", label: "Mais reservas", description: "Aumentar volume de reservas", kpi: "Reservas/semana" },
      { id: "res_reduce_noshow", label: "Reduzir no-shows", description: "Diminuir faltas sem aviso", kpi: "Taxa no-show %" },
      { id: "res_fill_quiet_times", label: "Preencher horarios mortos", description: "Ocupar periodos com baixa procura", kpi: "Ocupacao horarios fracos" },
      { id: "res_advance_booking", label: "Reservas antecipadas", description: "Incentivar reservas com antecedencia", kpi: "Dias medio antecedencia" },
      { id: "res_group_bookings", label: "Grupos e eventos", description: "Atrair grupos grandes e eventos", kpi: "Reservas 6+ pessoas/mes" },
    ],
  },
  {
    id: "reputation",
    label: "Presenca Online e Reputacao",
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    color: "amber",
    objectives: [
      { id: "rep_google_reviews", label: "Melhorar reviews Google", description: "Mais e melhores avaliacoes", kpi: "Rating medio + novas/mes" },
      { id: "rep_tripadvisor", label: "Ranking TripAdvisor", description: "Subir posicao na zona", kpi: "Posicao TripAdvisor" },
      { id: "rep_instagram_growth", label: "Crescer no Instagram", description: "Seguidores e engagement", kpi: "Seguidores + engagement" },
      { id: "rep_brand_awareness", label: "Notoriedade da marca", description: "Reconhecimento e pesquisas branded", kpi: "Pesquisas branded" },
    ],
  },
  {
    id: "operations",
    label: "Operacional e Experiencia",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    color: "purple",
    objectives: [
      { id: "ops_table_turnover", label: "Rotacao de mesas", description: "Otimizar tempo por sessao", kpi: "Tempo medio sessao" },
      { id: "ops_digital_ordering", label: "Pedidos digitais", description: "Aumentar uso do QR code", kpi: "% pedidos via QR" },
      { id: "ops_satisfaction", label: "Satisfacao do cliente", description: "Medir e melhorar experiencia", kpi: "NPS (futuro)" },
    ],
  },
  {
    id: "revenue",
    label: "Revenue e Crescimento",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "yellow",
    objectives: [
      { id: "rev_weekend_max", label: "Maximizar fim-de-semana", description: "Revenue maximo Sex-Dom", kpi: "Receita Sex-Dom vs target" },
      { id: "rev_weekday_growth", label: "Crescer dias uteis", description: "Aumentar Seg-Qui", kpi: "Receita Seg-Qui vs anterior" },
      { id: "rev_special_events", label: "Eventos especiais", description: "Datas comemorativas e tematicos", kpi: "Receita eventos vs normal" },
      { id: "rev_new_channels", label: "Novos canais de receita", description: "Delivery, takeaway, catering", kpi: "Receita novos canais" },
    ],
  },
];

// ─── Context Questionnaire Options ──────────────────────────────────────────

const AUDIENCE_OPTIONS = [
  "Familias", "Casais", "Amigos", "Corporate", "Turistas", "Estudantes", "Foodies/Influencers",
] as const;

const TONE_OPTIONS = [
  { id: "premium", label: "Premium / Sofisticado" },
  { id: "casual", label: "Casual / Moderno" },
  { id: "fun", label: "Divertido / Irreverente" },
  { id: "traditional", label: "Tradicional / Autentico" },
  { id: "minimal", label: "Minimalista / Clean" },
] as const;

const CHANNEL_OPTIONS = [
  "Instagram", "Facebook", "TikTok", "Google Business", "Email", "SMS", "WhatsApp",
] as const;

const CUISINE_OPTIONS = [
  "Rodizio", "A la carte", "Omakase", "Fusion", "Tradicional japones",
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

interface SelectedObjective {
  id: string;
  priority: number;
  notes: string;
}

interface ChannelEntry {
  channel: string;
  priority: "primary" | "secondary";
}

interface KeyDate {
  label: string;
  date: string;
  recurring: boolean;
}

interface StrategyData {
  objectives: SelectedObjective[];
  target_audience: string[];
  competitive_edge: string;
  communication_tone: string;
  age_range_min: number;
  age_range_max: number;
  key_dates: KeyDate[];
  marketing_budget_monthly: number;
  active_channels: ChannelEntry[];
  competitors: string[];
  cuisine_types: string[];
  capacity_lunch: number | null;
  capacity_dinner: number | null;
  avg_price_min: number | null;
  avg_price_max: number | null;
}

const DEFAULT_STRATEGY: StrategyData = {
  objectives: [],
  target_audience: [],
  competitive_edge: "",
  communication_tone: "",
  age_range_min: 25,
  age_range_max: 45,
  key_dates: [],
  marketing_budget_monthly: 0,
  active_channels: [],
  competitors: [],
  cuisine_types: [],
  capacity_lunch: null,
  capacity_dinner: null,
  avg_price_min: null,
  avg_price_max: null,
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function StrategyTab() {
  const [data, setData] = useState<StrategyData>(DEFAULT_STRATEGY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [competitorInput, setCompetitorInput] = useState("");
  const [keyDateLabel, setKeyDateLabel] = useState("");
  const [keyDateDate, setKeyDateDate] = useState("");
  const [keyDateRecurring, setKeyDateRecurring] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Load
  useEffect(() => {
    fetch("/api/admin/business-strategy")
      .then((r) => r.json())
      .then((raw) => {
        if (raw) {
          setData({
            objectives: raw.objectives ?? [],
            target_audience: raw.target_audience ?? [],
            competitive_edge: raw.competitive_edge ?? "",
            communication_tone: raw.communication_tone ?? "",
            age_range_min: raw.age_range_min ?? 25,
            age_range_max: raw.age_range_max ?? 45,
            key_dates: raw.key_dates ?? [],
            marketing_budget_monthly: raw.marketing_budget_monthly ?? 0,
            active_channels: raw.active_channels ?? [],
            competitors: raw.competitors ?? [],
            cuisine_types: raw.cuisine_types ?? [],
            capacity_lunch: raw.capacity_lunch ?? null,
            capacity_dinner: raw.capacity_dinner ?? null,
            avg_price_min: raw.avg_price_min !== null && raw.avg_price_min !== undefined ? Number(raw.avg_price_min) : null,
            avg_price_max: raw.avg_price_max !== null && raw.avg_price_max !== undefined ? Number(raw.avg_price_max) : null,
          });
        }
      })
      .catch(() => setMessage({ type: "error", text: "Erro ao carregar estrategia." }))
      .finally(() => setIsLoading(false));
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/business-strategy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro");
      setMessage({ type: "success", text: "Estrategia guardada com sucesso." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erro desconhecido" });
    } finally {
      setIsSaving(false);
    }
  }, [data]);

  // Objective helpers
  const selectedMap = useMemo(
    () => new Map(data.objectives.map((o) => [o.id, o])),
    [data.objectives],
  );

  const toggleObjective = useCallback((id: string) => {
    setData((prev) => {
      const exists = prev.objectives.find((o) => o.id === id);
      if (exists) {
        return { ...prev, objectives: prev.objectives.filter((o) => o.id !== id) };
      }
      return { ...prev, objectives: [...prev.objectives, { id, priority: 3, notes: "" }] };
    });
  }, []);

  const updateObjectivePriority = useCallback((id: string, priority: number) => {
    setData((prev) => ({
      ...prev,
      objectives: prev.objectives.map((o) => (o.id === id ? { ...o, priority } : o)),
    }));
  }, []);

  const updateObjectiveNotes = useCallback((id: string, notes: string) => {
    setData((prev) => ({
      ...prev,
      objectives: prev.objectives.map((o) => (o.id === id ? { ...o, notes } : o)),
    }));
  }, []);

  // Channel helpers
  const toggleChannel = useCallback((channel: string) => {
    setData((prev) => {
      const exists = prev.active_channels.find((c) => c.channel === channel);
      if (exists) {
        return { ...prev, active_channels: prev.active_channels.filter((c) => c.channel !== channel) };
      }
      return { ...prev, active_channels: [...prev.active_channels, { channel, priority: "secondary" }] };
    });
  }, []);

  const setChannelPriority = useCallback((channel: string, priority: "primary" | "secondary") => {
    setData((prev) => ({
      ...prev,
      active_channels: prev.active_channels.map((c) =>
        c.channel === channel ? { ...c, priority } : c,
      ),
    }));
  }, []);

  // Competitor helpers
  const addCompetitor = useCallback(() => {
    const val = competitorInput.trim();
    if (!val || data.competitors.includes(val)) return;
    setData((prev) => ({ ...prev, competitors: [...prev.competitors, val] }));
    setCompetitorInput("");
  }, [competitorInput, data.competitors]);

  const removeCompetitor = useCallback((c: string) => {
    setData((prev) => ({ ...prev, competitors: prev.competitors.filter((x) => x !== c) }));
  }, []);

  // Key date helpers
  const addKeyDate = useCallback(() => {
    if (!keyDateLabel.trim() || !keyDateDate) return;
    setData((prev) => ({
      ...prev,
      key_dates: [...prev.key_dates, { label: keyDateLabel.trim(), date: keyDateDate, recurring: keyDateRecurring }],
    }));
    setKeyDateLabel("");
    setKeyDateDate("");
    setKeyDateRecurring(false);
  }, [keyDateLabel, keyDateDate, keyDateRecurring]);

  const removeKeyDate = useCallback((idx: number) => {
    setData((prev) => ({ ...prev, key_dates: prev.key_dates.filter((_, i) => i !== idx) }));
  }, []);

  const selectedCount = data.objectives.length;

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent";
  const smallInputClass = "w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent";

  if (isLoading) return <div className="text-gray-500 text-sm p-4">A carregar estrategia...</div>;

  const colorMap: Record<string, { bg: string; border: string; text: string; light: string }> = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", light: "bg-blue-100" },
    rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", light: "bg-rose-100" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", light: "bg-emerald-100" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", light: "bg-amber-100" },
    purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", light: "bg-purple-100" },
    yellow: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", light: "bg-yellow-100" },
  };

  return (
    <div className="space-y-8">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Estrategia de Marketing</h3>
          <p className="text-sm text-gray-500">
            Define os objetivos do negocio e contexto. Isto alimenta as sugestoes AI e segmentacao.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {selectedCount} objetivo{selectedCount !== 1 ? "s" : ""} selecionado{selectedCount !== 1 ? "s" : ""}
          </span>
          <Button type="button" variant="primary" disabled={isSaving} onClick={handleSave}>
            {isSaving ? "A guardar..." : "Guardar Estrategia"}
          </Button>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      {/* ═══ Objectives ═══ */}
      <div className="space-y-4">
        <h4 className="text-base font-semibold text-gray-800">Objetivos Estrategicos</h4>
        <p className="text-xs text-gray-500">
          Seleciona os objetivos que se aplicam ao teu negocio. Define a prioridade (1=baixa, 5=critica) e notas opcionais.
        </p>

        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const colors = colorMap[cat.color] ?? colorMap.blue;
            const catSelectedCount = cat.objectives.filter((o) => selectedMap.has(o.id)).length;
            const isExpanded = expandedCategory === cat.id;

            return (
              <Card key={cat.id} className={`overflow-hidden border ${catSelectedCount > 0 ? colors.border : "border-gray-200"}`}>
                {/* Category Header */}
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                  className={`cursor-pointer w-full flex items-center justify-between px-5 py-3.5 transition-colors ${
                    catSelectedCount > 0 ? colors.bg : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className={`w-5 h-5 ${catSelectedCount > 0 ? colors.text : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={cat.icon} />
                    </svg>
                    <span className={`font-medium ${catSelectedCount > 0 ? colors.text : "text-gray-700"}`}>
                      {cat.label}
                    </span>
                    {catSelectedCount > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.light} ${colors.text} font-medium`}>
                        {catSelectedCount}/{cat.objectives.length}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Objectives List */}
                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {cat.objectives.map((obj) => {
                      const selected = selectedMap.get(obj.id);
                      return (
                        <div key={obj.id} className={`px-5 py-3 ${selected ? "bg-white" : "bg-gray-50/50"}`}>
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleObjective(obj.id)}
                              className={`cursor-pointer mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                selected
                                  ? "bg-[#D4AF37] border-[#D4AF37]"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                            >
                              {selected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${selected ? "text-gray-900" : "text-gray-600"}`}>
                                  {obj.label}
                                </span>
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {obj.kpi}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{obj.description}</p>

                              {/* Priority & Notes (when selected) */}
                              {selected && (
                                <div className="mt-2 flex items-center gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-gray-500 font-medium">Prioridade:</span>
                                    {[1, 2, 3, 4, 5].map((p) => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => updateObjectivePriority(obj.id, p)}
                                        className={`cursor-pointer w-6 h-6 rounded text-xs font-bold transition-colors ${
                                          selected.priority === p
                                            ? "bg-[#D4AF37] text-white"
                                            : selected.priority >= p
                                              ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                        }`}
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Notas (opcional)..."
                                    value={selected.notes}
                                    onChange={(e) => updateObjectiveNotes(obj.id, e.target.value)}
                                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-700 focus:ring-1 focus:ring-[#D4AF37] focus:border-transparent"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* ═══ Context Questionnaire ═══ */}
      <div className="space-y-6">
        <h4 className="text-base font-semibold text-gray-800 border-t border-gray-200 pt-6">
          Contexto do Negocio
        </h4>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Target Audience */}
            <Card className="p-5 space-y-3">
              <h5 className="text-sm font-semibold text-gray-700">Publico-alvo principal</h5>
              <div className="flex flex-wrap gap-2">
                {AUDIENCE_OPTIONS.map((opt) => {
                  const active = data.target_audience.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setData((prev) => ({
                          ...prev,
                          target_audience: active
                            ? prev.target_audience.filter((a) => a !== opt)
                            : [...prev.target_audience, opt],
                        }))
                      }
                      className={`cursor-pointer px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        active
                          ? "bg-[#D4AF37] text-white border-[#D4AF37]"
                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Communication Tone */}
            <Card className="p-5 space-y-3">
              <h5 className="text-sm font-semibold text-gray-700">Tom de comunicacao</h5>
              <div className="space-y-1.5">
                {TONE_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="tone"
                      checked={data.communication_tone === opt.id}
                      onChange={() => setData((prev) => ({ ...prev, communication_tone: opt.id }))}
                      className="w-4 h-4 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt.label}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* Cuisine Types */}
            <Card className="p-5 space-y-3">
              <h5 className="text-sm font-semibold text-gray-700">Tipo de cozinha / especialidade</h5>
              <div className="flex flex-wrap gap-2">
                {CUISINE_OPTIONS.map((opt) => {
                  const active = data.cuisine_types.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setData((prev) => ({
                          ...prev,
                          cuisine_types: active
                            ? prev.cuisine_types.filter((c) => c !== opt)
                            : [...prev.cuisine_types, opt],
                        }))
                      }
                      className={`cursor-pointer px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        active
                          ? "bg-[#D4AF37] text-white border-[#D4AF37]"
                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Competitive Edge */}
            <Card className="p-5 space-y-3">
              <h5 className="text-sm font-semibold text-gray-700">Diferencial competitivo</h5>
              <textarea
                rows={3}
                value={data.competitive_edge}
                onChange={(e) => setData((prev) => ({ ...prev, competitive_edge: e.target.value }))}
                placeholder="O que vos distingue? Ex: Peixe fresco diario, ambiente unico, chef premiado..."
                className={`${inputClass} resize-none`}
              />
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Age Range */}
            <Card className="p-5 space-y-3">
              <h5 className="text-sm font-semibold text-gray-700">Faixa etaria dominante</h5>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={16}
                  max={80}
                  value={data.age_range_min}
                  onChange={(e) => setData((prev) => ({ ...prev, age_range_min: Number(e.target.value) }))}
                  className={`${smallInputClass} w-20 text-center`}
                />
                <span className="text-gray-400">a</span>
                <input
                  type="number"
                  min={16}
                  max={80}
                  value={data.age_range_max}
                  onChange={(e) => setData((prev) => ({ ...prev, age_range_max: Number(e.target.value) }))}
                  className={`${smallInputClass} w-20 text-center`}
                />
                <span className="text-xs text-gray-400">anos</span>
              </div>
            </Card>

            {/* Capacity & Price */}
            <Card className="p-5 space-y-4">
              <h5 className="text-sm font-semibold text-gray-700">Capacidade e precos</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Capacidade almoco</label>
                  <input
                    type="number"
                    min={0}
                    value={data.capacity_lunch ?? ""}
                    onChange={(e) => setData((prev) => ({ ...prev, capacity_lunch: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="Ex: 60"
                    className={smallInputClass}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Capacidade jantar</label>
                  <input
                    type="number"
                    min={0}
                    value={data.capacity_dinner ?? ""}
                    onChange={(e) => setData((prev) => ({ ...prev, capacity_dinner: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="Ex: 80"
                    className={smallInputClass}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Preco medio min</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={data.avg_price_min ?? ""}
                      onChange={(e) => setData((prev) => ({ ...prev, avg_price_min: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="15"
                      className={`${smallInputClass} pr-8`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">EUR</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Preco medio max</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={data.avg_price_max ?? ""}
                      onChange={(e) => setData((prev) => ({ ...prev, avg_price_max: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="35"
                      className={`${smallInputClass} pr-8`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">EUR</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Marketing Budget */}
            <Card className="p-5 space-y-3">
              <h5 className="text-sm font-semibold text-gray-700">Orcamento marketing / mes</h5>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={data.marketing_budget_monthly || ""}
                  onChange={(e) => setData((prev) => ({ ...prev, marketing_budget_monthly: Number(e.target.value) || 0 }))}
                  placeholder="0"
                  className={`${inputClass} pr-12`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">EUR</span>
              </div>
            </Card>

            {/* Active Channels */}
            <Card className="p-5 space-y-3">
              <h5 className="text-sm font-semibold text-gray-700">Canais ativos</h5>
              <div className="space-y-2">
                {CHANNEL_OPTIONS.map((ch) => {
                  const entry = data.active_channels.find((c) => c.channel === ch);
                  return (
                    <div key={ch} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleChannel(ch)}
                        className={`cursor-pointer flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          entry
                            ? "bg-[#D4AF37] border-[#D4AF37]"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {entry && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className={`text-sm flex-1 ${entry ? "text-gray-900" : "text-gray-500"}`}>{ch}</span>
                      {entry && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setChannelPriority(ch, "primary")}
                            className={`cursor-pointer text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                              entry.priority === "primary"
                                ? "bg-[#D4AF37] text-white"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            Principal
                          </button>
                          <button
                            type="button"
                            onClick={() => setChannelPriority(ch, "secondary")}
                            className={`cursor-pointer text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                              entry.priority === "secondary"
                                ? "bg-gray-600 text-white"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            Secundario
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        {/* Full-width bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Competitors */}
          <Card className="p-5 space-y-3">
            <h5 className="text-sm font-semibold text-gray-700">Concorrentes diretos</h5>
            <div className="flex gap-2">
              <input
                type="text"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCompetitor())}
                placeholder="Nome do concorrente..."
                className={smallInputClass}
              />
              <button
                type="button"
                onClick={addCompetitor}
                className="cursor-pointer px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                Adicionar
              </button>
            </div>
            {data.competitors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.competitors.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {c}
                    <button
                      type="button"
                      onClick={() => removeCompetitor(c)}
                      className="cursor-pointer text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Key Dates */}
          <Card className="p-5 space-y-3">
            <h5 className="text-sm font-semibold text-gray-700">Datas-chave do ano</h5>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Evento</label>
                <input
                  type="text"
                  value={keyDateLabel}
                  onChange={(e) => setKeyDateLabel(e.target.value)}
                  placeholder="Dia dos Namorados"
                  className={smallInputClass}
                />
              </div>
              <div className="w-36">
                <label className="text-xs text-gray-500 mb-1 block">Data</label>
                <input
                  type="date"
                  value={keyDateDate}
                  onChange={(e) => setKeyDateDate(e.target.value)}
                  className={smallInputClass}
                />
              </div>
              <label className="flex items-center gap-1.5 mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keyDateRecurring}
                  onChange={(e) => setKeyDateRecurring(e.target.checked)}
                  className="w-4 h-4 text-[#D4AF37] rounded cursor-pointer"
                />
                <span className="text-xs text-gray-500">Anual</span>
              </label>
              <button
                type="button"
                onClick={addKeyDate}
                className="cursor-pointer px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0 mb-0.5"
              >
                +
              </button>
            </div>
            {data.key_dates.length > 0 && (
              <div className="space-y-1">
                {data.key_dates.map((kd, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">{kd.label}</span>
                      <span className="text-gray-400">{kd.date}</span>
                      {kd.recurring && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full">Anual</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeKeyDate(idx)}
                      className="cursor-pointer text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ═══ Bottom Save ═══ */}
      <div className="flex items-center gap-3 pt-2">
        {message && (
          <p className={`text-sm flex-1 ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {message.text}
          </p>
        )}
        <Button type="button" variant="primary" disabled={isSaving} onClick={handleSave}>
          {isSaving ? "A guardar..." : "Guardar Estrategia"}
        </Button>
      </div>
    </div>
  );
}
