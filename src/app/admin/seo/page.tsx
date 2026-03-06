"use client";

import { useState, useEffect, useRef } from "react";
import { Card, Button } from "@/components/ui";
import Image from "next/image";

// ─── Constants ───────────────────────────────────────────────────────────────

type SubTab = "brand" | "metadata" | "images" | "gtm";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "brand", label: "Marca & Redes" },
  { id: "metadata", label: "Metadata SEO" },
  { id: "images", label: "Imagens & Branding" },
  { id: "gtm", label: "Google Tag Manager" },
];

const LOCALES = ["pt", "en", "fr", "de", "it", "es"] as const;
const emptyLocaleMap = () => Object.fromEntries(LOCALES.map((l) => [l, ""]));

const PAGE_META_PAGES = ["menu", "reservar", "equipa"] as const;
const PAGE_META_LABELS: Record<string, string> = { menu: "Menu", reservar: "Reservar Mesa", equipa: "Equipa" };
const emptyPageMeta = () =>
  Object.fromEntries(PAGE_META_PAGES.map((p) => [p, { titles: emptyLocaleMap(), descriptions: emptyLocaleMap() }]));

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SeoPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("brand");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ─── Brand & Social ─────────────────────────────────────────────
  const [brandName, setBrandName] = useState("");
  const [descriptions, setDescriptions] = useState<Record<string, string>>(emptyLocaleMap);
  const [descLang, setDescLang] = useState("pt");
  const [priceRange, setPriceRange] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [googleReviewsUrl, setGoogleReviewsUrl] = useState("");
  const [tripadvisorUrl, setTripadvisorUrl] = useState("");
  const [theforkUrl, setTheforkUrl] = useState("");
  const [zomatoUrl, setZomatoUrl] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  // ─── GTM ────────────────────────────────────────────────────────
  const [gtmId, setGtmId] = useState("");

  // ─── SEO Metadata ──────────────────────────────────────────────
  const [metaTitles, setMetaTitles] = useState<Record<string, string>>(emptyLocaleMap);
  const [titleLang, setTitleLang] = useState("pt");
  const [metaDescriptions, setMetaDescriptions] = useState<Record<string, string>>(emptyLocaleMap);
  const [metaDescLang, setMetaDescLang] = useState("pt");
  const [metaOgDescriptions, setMetaOgDescriptions] = useState<Record<string, string>>(emptyLocaleMap);
  const [ogLang, setOgLang] = useState("pt");
  const [metaKeywords, setMetaKeywords] = useState<Record<string, string>>(emptyLocaleMap);
  const [kwLang, setKwLang] = useState("pt");

  // ─── Images ────────────────────────────────────────────────────
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [appleTouchIconUrl, setAppleTouchIconUrl] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");

  // ─── Page Meta ─────────────────────────────────────────────────
  const [pageMeta, setPageMeta] = useState<
    Record<string, { titles: Record<string, string>; descriptions: Record<string, string> }>
  >(emptyPageMeta);
  const [pageMetaLangs, setPageMetaLangs] = useState<Record<string, string>>(
    Object.fromEntries(PAGE_META_PAGES.map((p) => [p, "pt"])),
  );

  // ─── AI Translation / Generation ────────────────────────────────
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // ─── Image Upload ─────────────────────────────────────────────
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const handleImageUpload = async (file: File, type: "logo" | "favicon" | "apple_touch_icon" | "og_image") => {
    setIsUploading(type);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      const res = await fetch("/api/admin/site-settings/upload", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao fazer upload");
      }
      const data = await res.json();

      const setters: Record<string, (_v: string) => void> = {
        logo: setLogoUrl, favicon: setFaviconUrl,
        apple_touch_icon: setAppleTouchIconUrl, og_image: setOgImageUrl,
      };
      setters[type](data.url);

      if (type === "logo" && data.generated) {
        setFaviconUrl(data.generated.favicon_url);
        setAppleTouchIconUrl(data.generated.apple_touch_icon_url);
        setOgImageUrl(data.generated.og_image_url);
        setMessage({ type: "success", text: "Logo carregado e icones gerados automaticamente. Revisa e guarda." });
      } else {
        setMessage({ type: "success", text: "Imagem carregada. Guarda para aplicar." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao fazer upload" });
    } finally {
      setIsUploading(null);
    }
  };

  // ─── Load Data ─────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setBrandName(data.brand_name ?? "");
          if (data.descriptions) {
            setDescriptions((prev: Record<string, string>) => ({ ...prev, ...data.descriptions }));
          } else if (data.description) {
            setDescriptions((prev) => ({ ...prev, pt: data.description }));
          }
          setPriceRange(data.price_range ?? "");
          setFacebookUrl(data.facebook_url ?? "");
          setInstagramUrl(data.instagram_url ?? "");
          setGoogleReviewsUrl(data.google_reviews_url ?? "");
          setTripadvisorUrl(data.tripadvisor_url ?? "");
          setTheforkUrl(data.thefork_url ?? "");
          setZomatoUrl(data.zomato_url ?? "");
          setGoogleMapsUrl(data.google_maps_url ?? "");
          setGtmId(data.gtm_id ?? "");
          if (data.meta_titles) setMetaTitles((prev: Record<string, string>) => ({ ...prev, ...data.meta_titles }));
          if (data.meta_descriptions) setMetaDescriptions((prev: Record<string, string>) => ({ ...prev, ...data.meta_descriptions }));
          if (data.meta_og_descriptions) setMetaOgDescriptions((prev: Record<string, string>) => ({ ...prev, ...data.meta_og_descriptions }));
          if (data.meta_keywords) {
            const kw: Record<string, string> = {};
            for (const [k, v] of Object.entries(data.meta_keywords)) {
              kw[k] = Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");
            }
            setMetaKeywords((prev: Record<string, string>) => ({ ...prev, ...kw }));
          }
          setLogoUrl(data.logo_url ?? "");
          setFaviconUrl(data.favicon_url ?? "");
          setAppleTouchIconUrl(data.apple_touch_icon_url ?? "");
          setOgImageUrl(data.og_image_url ?? "");
          if (data.page_meta) {
            setPageMeta((prev) => {
              const next = { ...prev };
              for (const page of PAGE_META_PAGES) {
                const pm = data.page_meta[page];
                if (pm) {
                  next[page] = {
                    titles: { ...prev[page].titles, ...(pm.titles ?? {}) },
                    descriptions: { ...prev[page].descriptions, ...(pm.descriptions ?? {}) },
                  };
                }
              }
              return next;
            });
          }
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }, []);

  // ─── Save ──────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const cleanLocaleMap = (m: Record<string, string>) => {
        const clean = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
        return Object.keys(clean).length ? clean : null;
      };
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName.trim(),
          description: descriptions.pt?.trim() || brandName.trim(),
          descriptions: cleanLocaleMap(descriptions),
          price_range: priceRange.trim(),
          facebook_url: facebookUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          google_reviews_url: googleReviewsUrl.trim() || null,
          tripadvisor_url: tripadvisorUrl.trim() || null,
          thefork_url: theforkUrl.trim() || null,
          zomato_url: zomatoUrl.trim() || null,
          google_maps_url: googleMapsUrl.trim() || null,
          gtm_id: gtmId.trim() || null,
          meta_titles: cleanLocaleMap(metaTitles),
          meta_descriptions: cleanLocaleMap(metaDescriptions),
          meta_og_descriptions: cleanLocaleMap(metaOgDescriptions),
          meta_keywords: Object.values(metaKeywords).some((v) => v.trim())
            ? Object.fromEntries(Object.entries(metaKeywords).map(([k, v]) => [k, v.trim().split(/,\s*/).filter(Boolean)]).filter(([, v]) => (v as string[]).length > 0))
            : null,
          logo_url: logoUrl.trim(),
          favicon_url: faviconUrl.trim(),
          apple_touch_icon_url: appleTouchIconUrl.trim(),
          og_image_url: ogImageUrl.trim(),
          page_meta: Object.fromEntries(
            PAGE_META_PAGES.map((page) => {
              const t = Object.fromEntries(Object.entries(pageMeta[page].titles).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
              const d = Object.fromEntries(Object.entries(pageMeta[page].descriptions).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
              return [page, { titles: Object.keys(t).length ? t : undefined, descriptions: Object.keys(d).length ? d : undefined }];
            }).filter(([, v]) => (v as { titles?: object; descriptions?: object }).titles || (v as { titles?: object; descriptions?: object }).descriptions),
          ) || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro");
      setMessage({ type: "success", text: "Definicoes guardadas com sucesso." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erro desconhecido" });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── AI Translation ────────────────────────────────────────────
  const handleTranslate = async (field: string, sourceLocale: string) => {
    setIsTranslating(field);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/translate-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, sourceLocale }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao traduzir");
      }
      const data = await res.json();

      if (field === "descriptions" && data.descriptions) {
        setDescriptions((prev) => ({ ...prev, ...data.descriptions }));
      } else if (field === "meta_titles" && data.meta_titles) {
        setMetaTitles((prev) => ({ ...prev, ...data.meta_titles }));
      } else if (field === "meta_descriptions" && data.meta_descriptions) {
        setMetaDescriptions((prev) => ({ ...prev, ...data.meta_descriptions }));
      } else if (field === "meta_og_descriptions" && data.meta_og_descriptions) {
        setMetaOgDescriptions((prev) => ({ ...prev, ...data.meta_og_descriptions }));
      } else if (field === "meta_keywords" && data.meta_keywords) {
        const kw: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.meta_keywords)) {
          kw[k] = Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");
        }
        setMetaKeywords((prev) => ({ ...prev, ...kw }));
      } else if (field === "page_meta" && data.page_meta) {
        setPageMeta((prev) => {
          const next = { ...prev };
          for (const page of PAGE_META_PAGES) {
            const pm = data.page_meta[page];
            if (pm) {
              next[page] = {
                titles: { ...prev[page].titles, ...(pm.titles ?? {}) },
                descriptions: { ...prev[page].descriptions, ...(pm.descriptions ?? {}) },
              };
            }
          }
          return next;
        });
      }
      setMessage({ type: "success", text: "Traducao AI concluida. Revisa e guarda." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao traduzir" });
    } finally {
      setIsTranslating(null);
    }
  };

  const handleGenerate = async (field: string) => {
    setIsGenerating(field);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/translate-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, mode: "generate" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao gerar");
      }
      const data = await res.json();

      if (field === "descriptions" && data.descriptions) {
        setDescriptions((prev) => ({ ...prev, ...data.descriptions }));
      } else if (field === "meta_titles" && data.meta_titles) {
        setMetaTitles((prev) => ({ ...prev, ...data.meta_titles }));
      } else if (field === "meta_descriptions" && data.meta_descriptions) {
        setMetaDescriptions((prev) => ({ ...prev, ...data.meta_descriptions }));
      } else if (field === "meta_og_descriptions" && data.meta_og_descriptions) {
        setMetaOgDescriptions((prev) => ({ ...prev, ...data.meta_og_descriptions }));
      } else if (field === "meta_keywords" && data.meta_keywords) {
        const kw: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.meta_keywords)) {
          kw[k] = Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");
        }
        setMetaKeywords((prev) => ({ ...prev, ...kw }));
      } else if (field === "page_meta" && data.page_meta) {
        setPageMeta((prev) => {
          const next = { ...prev };
          for (const page of PAGE_META_PAGES) {
            const pm = data.page_meta[page];
            if (pm) {
              next[page] = {
                titles: { ...prev[page].titles, ...(pm.titles ?? {}) },
                descriptions: { ...prev[page].descriptions, ...(pm.descriptions ?? {}) },
              };
            }
          }
          return next;
        });
      }
      setMessage({ type: "success", text: "Conteudo gerado com AI. Revisa e guarda." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erro ao gerar" });
    } finally {
      setIsGenerating(null);
    }
  };

  // ─── Render ────────────────────────────────────────────────────
  if (isLoading) return <div className="text-gray-500 text-sm p-4">A carregar...</div>;
  if (loadError) return <div className="text-red-600 text-sm p-4">Erro ao carregar. Tente recarregar a pagina.</div>;

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent";
  const smallInputClass = "w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent";
  const textareaClass = `${smallInputClass} resize-none`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">SEO & Marca</h2>
        <p className="mt-1 text-gray-600">Identidade da marca, metadata SEO, imagens e tracking</p>
      </div>

      {/* Horizontal Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-[#D4AF37] text-[#D4AF37]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* BRAND & SOCIAL TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "brand" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Identidade da Marca</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Marca *</label>
                <input type="text" required value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Sushi in Sushi" className={inputClass} />
                <p className="text-xs text-gray-500 mt-1">Schemas SEO, emails e toda a app</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gama de Precos *</label>
                <input type="text" required value={priceRange} onChange={(e) => setPriceRange(e.target.value)} placeholder="$$-$$$" className={inputClass} />
                <p className="text-xs text-gray-500 mt-1">schema.org priceRange</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Descricao Global *</label>
                  <div className="flex items-center gap-1.5">
                    <TranslateButton field="descriptions" sourceLocale={descLang} isTranslating={isTranslating} onTranslate={handleTranslate} />
                    <GenerateButton field="descriptions" isGenerating={isGenerating} onGenerate={handleGenerate} />
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={descriptions[descLang]}
                  onChange={(e) => setDescriptions((prev) => ({ ...prev, [descLang]: e.target.value }))}
                  placeholder={`Descricao em ${descLang.toUpperCase()}...`}
                  className={`${inputClass} resize-none`}
                />
                <LocalePills active={descLang} values={descriptions} onChange={setDescLang} />
                <p className="text-xs text-gray-500">schema.org, meta tags, emails, contexto AI</p>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-6 space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Redes Sociais</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                    <input type="url" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                    <input type="url" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." className={inputClass} />
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Reviews & Descoberta</h3>
                  <p className="text-xs text-gray-500 mt-1">schema.org sameAs</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Google Reviews</label>
                    <input type="url" value={googleReviewsUrl} onChange={(e) => setGoogleReviewsUrl(e.target.value)} placeholder="https://g.page/r/..." className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TripAdvisor</label>
                    <input type="url" value={tripadvisorUrl} onChange={(e) => setTripadvisorUrl(e.target.value)} placeholder="https://tripadvisor.com/..." className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TheFork</label>
                    <input type="url" value={theforkUrl} onChange={(e) => setTheforkUrl(e.target.value)} placeholder="https://thefork.pt/..." className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zomato</label>
                    <input type="url" value={zomatoUrl} onChange={(e) => setZomatoUrl(e.target.value)} placeholder="https://zomato.com/..." className={inputClass} />
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Localizacao</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps URL</label>
                  <input type="url" value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://google.com/maps/..." className={inputClass} />
                  <p className="text-xs text-gray-500 mt-1">URL global. Cada restaurante pode ter o seu em Gestao de Restaurantes.</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* METADATA SEO TAB (merged: home + pages) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "metadata" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ─── Home Page Metadata ─── */}
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Home Page</h3>
                <p className="text-xs text-gray-500 mt-1">Metadata SEO da pagina principal.</p>
              </div>

              {/* Titles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">Titulo</h4>
                  <div className="flex items-center gap-1.5">
                    <TranslateButton field="meta_titles" sourceLocale={titleLang} isTranslating={isTranslating} onTranslate={handleTranslate} />
                    <GenerateButton field="meta_titles" isGenerating={isGenerating} onGenerate={handleGenerate} />
                  </div>
                </div>
                <input
                  type="text"
                  value={metaTitles[titleLang]}
                  onChange={(e) => setMetaTitles((prev) => ({ ...prev, [titleLang]: e.target.value }))}
                  placeholder={`Titulo em ${titleLang.toUpperCase()}...`}
                  className={smallInputClass}
                />
                <LocalePills active={titleLang} values={metaTitles} onChange={setTitleLang} />
              </div>

              {/* Descriptions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">Meta Description</h4>
                  <div className="flex items-center gap-1.5">
                    <TranslateButton field="meta_descriptions" sourceLocale={metaDescLang} isTranslating={isTranslating} onTranslate={handleTranslate} />
                    <GenerateButton field="meta_descriptions" isGenerating={isGenerating} onGenerate={handleGenerate} />
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={metaDescriptions[metaDescLang]}
                  onChange={(e) => setMetaDescriptions((prev) => ({ ...prev, [metaDescLang]: e.target.value }))}
                  placeholder={`Descricao em ${metaDescLang.toUpperCase()}...`}
                  className={textareaClass}
                />
                <LocalePills active={metaDescLang} values={metaDescriptions} onChange={setMetaDescLang} />
              </div>

              {/* OG Descriptions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">Open Graph</h4>
                  <div className="flex items-center gap-1.5">
                    <TranslateButton field="meta_og_descriptions" sourceLocale={ogLang} isTranslating={isTranslating} onTranslate={handleTranslate} />
                    <GenerateButton field="meta_og_descriptions" isGenerating={isGenerating} onGenerate={handleGenerate} />
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={metaOgDescriptions[ogLang]}
                  onChange={(e) => setMetaOgDescriptions((prev) => ({ ...prev, [ogLang]: e.target.value }))}
                  placeholder={`OG em ${ogLang.toUpperCase()}...`}
                  className={textareaClass}
                />
                <LocalePills active={ogLang} values={metaOgDescriptions} onChange={setOgLang} />
                <p className="text-xs text-gray-400">Texto de partilha em redes sociais</p>
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">Keywords</h4>
                  <div className="flex items-center gap-1.5">
                    <TranslateButton field="meta_keywords" sourceLocale={kwLang} isTranslating={isTranslating} onTranslate={handleTranslate} />
                    <GenerateButton field="meta_keywords" isGenerating={isGenerating} onGenerate={handleGenerate} />
                  </div>
                </div>
                <input
                  type="text"
                  value={metaKeywords[kwLang]}
                  onChange={(e) => setMetaKeywords((prev) => ({ ...prev, [kwLang]: e.target.value }))}
                  placeholder={`Keywords em ${kwLang.toUpperCase()} (separadas por virgula)...`}
                  className={smallInputClass}
                />
                <LocalePills active={kwLang} values={metaKeywords} onChange={setKwLang} />
              </div>
            </Card>

            {/* ─── Sub-Page Metadata ─── */}
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Sub-Paginas</h3>
                  <p className="text-xs text-gray-500 mt-1">Campos vazios usam valores predefinidos.</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <TranslateButton field="page_meta" sourceLocale="pt" isTranslating={isTranslating} onTranslate={handleTranslate} label="Traduzir" />
                  <GenerateButton field="page_meta" isGenerating={isGenerating} onGenerate={handleGenerate} label="Gerar" />
                </div>
              </div>

              {PAGE_META_PAGES.map((page) => {
                const lang = pageMetaLangs[page];
                return (
                  <div key={page} className="space-y-3 border-t border-gray-100 pt-5 first:border-t-0 first:pt-0">
                    <h4 className="text-sm font-bold text-gray-800">/{page} — {PAGE_META_LABELS[page]}</h4>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">Titulo</p>
                      <input
                        type="text"
                        value={pageMeta[page].titles[lang]}
                        onChange={(e) => setPageMeta((prev) => ({
                          ...prev,
                          [page]: { ...prev[page], titles: { ...prev[page].titles, [lang]: e.target.value } },
                        }))}
                        placeholder={`${PAGE_META_LABELS[page]} em ${lang.toUpperCase()}...`}
                        className={smallInputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">Descricao</p>
                      <textarea
                        rows={2}
                        value={pageMeta[page].descriptions[lang]}
                        onChange={(e) => setPageMeta((prev) => ({
                          ...prev,
                          [page]: { ...prev[page], descriptions: { ...prev[page].descriptions, [lang]: e.target.value } },
                        }))}
                        placeholder={`Descricao ${PAGE_META_LABELS[page]} em ${lang.toUpperCase()}...`}
                        className={textareaClass}
                      />
                    </div>

                    <LocalePills
                      active={lang}
                      values={Object.fromEntries(LOCALES.map((l) => [l, pageMeta[page].titles[l] || pageMeta[page].descriptions[l]]))}
                      onChange={(l) => setPageMetaLangs((prev) => ({ ...prev, [page]: l }))}
                    />
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* IMAGES TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "images" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Logotipo</h3>
                <p className="text-xs text-gray-500 mt-1">Ao carregar o logo, favicon, Apple Touch Icon e OG sao gerados automaticamente.</p>
              </div>
              <ImageUploadField label="Logotipo" type="logo" url={logoUrl} onUrlChange={setLogoUrl} onUpload={handleImageUpload} isUploading={isUploading} spec="512 x 512 px" usage="Header, Footer, autenticacao, emails, Schema.org" />
            </Card>

            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Imagem Open Graph</h3>
                <p className="text-xs text-gray-500 mt-1">Preview de partilha em redes sociais.</p>
              </div>
              <ImageUploadField label="Imagem OG" type="og_image" url={ogImageUrl} onUrlChange={setOgImageUrl} onUpload={handleImageUpload} isUploading={isUploading} spec="1200 x 630 px" usage="Facebook, Twitter, LinkedIn, WhatsApp" />
            </Card>

            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Favicon</h3>
                <p className="text-xs text-gray-500 mt-1">Gerado automaticamente a partir do logo.</p>
              </div>
              <ImageUploadField label="Favicon" type="favicon" url={faviconUrl} onUrlChange={setFaviconUrl} onUpload={handleImageUpload} isUploading={isUploading} spec="32 x 32 px" usage="Icone do separador do browser" />
            </Card>

            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Apple Touch Icon</h3>
                <p className="text-xs text-gray-500 mt-1">Gerado automaticamente a partir do logo.</p>
              </div>
              <ImageUploadField label="Apple Touch Icon" type="apple_touch_icon" url={appleTouchIconUrl} onUrlChange={setAppleTouchIconUrl} onUpload={handleImageUpload} isUploading={isUploading} spec="180 x 180 px" usage="Icone iOS (ecra inicial)" />
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* GTM TAB */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "gtm" && (
          <div className="max-w-2xl">
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Google Tag Manager</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GTM Container ID</label>
                <input type="text" value={gtmId} onChange={(e) => setGtmId(e.target.value)} placeholder="GTM-XXXXXXX" pattern="GTM-[A-Z0-9]+" className={inputClass} />
                <p className="text-xs text-gray-500 mt-1">Carregado apenas nas paginas publicas. Deixar vazio para desativar.</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-800">Como configurar</h4>
                <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Acede ao <a href="https://tagmanager.google.com" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline hover:text-[#b8962f] cursor-pointer">Google Tag Manager</a> e cria uma conta/container (tipo: Web)</li>
                  <li>Copia o Container ID (formato GTM-XXXXXXX) e cola no campo acima</li>
                  <li>Guarda as definicoes e o script sera carregado automaticamente</li>
                </ol>

                <h4 className="text-sm font-semibold text-gray-800 pt-2">O que podes gerir no GTM</h4>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Google Analytics 4 (GA4) - metricas de trafego e comportamento</li>
                  <li>Meta Pixel (Facebook/Instagram) - tracking de conversoes e remarketing</li>
                  <li>Google Ads - conversoes e remarketing</li>
                  <li>Eventos personalizados - cliques, scroll, formularios</li>
                </ul>
              </div>
            </Card>
          </div>
        )}

        {/* Save */}
        {message && (
          <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
        )}
        <Button type="submit" disabled={isSaving} variant="primary">
          {isSaving ? "A guardar..." : "Guardar Definicoes"}
        </Button>
      </form>
    </div>
  );
}

// ─── Locale Pill Tabs (matches products pattern) ────────────────────────────

function LocalePills({
  active,
  values,
  onChange,
}: {
  active: string;
  values: Record<string, string>;
  onChange: (_locale: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {LOCALES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          className={`cursor-pointer px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
            active === lang
              ? "bg-purple-600 text-white"
              : values[lang]?.trim()
                ? "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ─── Image Upload Field Component ───────────────────────────────────────────

function ImageUploadField({
  label,
  type,
  url,
  onUrlChange,
  onUpload,
  isUploading,
  spec,
  usage,
}: {
  label: string;
  type: "logo" | "favicon" | "apple_touch_icon" | "og_image";
  url: string;
  onUrlChange: (_v: string) => void;
  onUpload: (_file: File, _type: "logo" | "favicon" | "apple_touch_icon" | "og_image") => void;
  isUploading: string | null;
  spec: string;
  usage: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const uploading = isUploading === type;

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    onUpload(file, type);
  };

  const previewSize = type === "og_image" ? { w: 240, h: 126 } : type === "logo" ? { w: 120, h: 120 } : { w: 80, h: 80 };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer ${
            dragOver ? "border-[#D4AF37] bg-yellow-50" : "border-gray-300 bg-gray-50"
          }`}
          style={{ width: previewSize.w, height: previewSize.h }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          {url ? (
            <Image src={url} alt={label} width={previewSize.w} height={previewSize.h} className="object-contain w-full h-full" unoptimized />
          ) : (
            <div className="text-center p-2">
              <svg className="w-6 h-6 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-[10px] text-gray-400 mt-1">Clica ou arrasta</p>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isUploading !== null}
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                  A carregar...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Carregar
                </>
              )}
            </button>
            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{spec}</span>
            {type === "logo" && (
              <span className="text-[10px] text-purple-600 font-medium">Auto-gera icones</span>
            )}
          </div>
          <p className="text-xs text-gray-400">{usage}</p>
          <input
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="URL da imagem"
            className="w-full px-3 py-1 text-xs border border-gray-200 rounded-lg text-gray-500 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent bg-gray-50"
          />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

// ─── AI Translate Button ────────────────────────────────────────────────────

function TranslateButton({
  field,
  sourceLocale,
  isTranslating,
  onTranslate,
  label = "Traduzir",
}: {
  field: string;
  sourceLocale: string;
  isTranslating: string | null;
  onTranslate: (_field: string, _sourceLocale: string) => void;
  label?: string;
}) {
  const active = isTranslating === field;
  return (
    <button
      type="button"
      disabled={isTranslating !== null}
      onClick={() => onTranslate(field, sourceLocale)}
      className={`cursor-pointer flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-colors ${
        active
          ? "bg-purple-100 text-purple-700 border-purple-200"
          : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {active ? (
        <>
          <span className="animate-spin inline-block w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full" />
          A traduzir...
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function GenerateButton({
  field,
  isGenerating,
  onGenerate,
  label = "Gerar",
}: {
  field: string;
  isGenerating: string | null;
  onGenerate: (_field: string) => void;
  label?: string;
}) {
  const active = isGenerating === field;
  return (
    <button
      type="button"
      disabled={isGenerating !== null}
      onClick={() => onGenerate(field)}
      className={`cursor-pointer flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-colors ${
        active
          ? "bg-amber-100 text-amber-700 border-amber-200"
          : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {active ? (
        <>
          <span className="animate-spin inline-block w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full" />
          A gerar...
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
