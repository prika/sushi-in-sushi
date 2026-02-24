"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAdminProducts, useIngredients, useProductIngredients } from "@/presentation/hooks";
import type { Product } from "@/domain/entities";
import type {
  IngredientWithProductCount,
} from "@/domain/entities/Ingredient";
import { AlertModal, ConfirmDialog } from "@/components/ui";

type ProductStats = { orderCountByProductId: Record<string, number> };
type ProductRatingsMap = Record<string, { avgRating: number; count: number }>;

export default function ProdutosPage() {
  const {
    products,
    categories,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useAdminProducts();

  const { ingredients: catalogIngredients, refresh: _refreshCatalog } = useIngredients();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const {
    productIngredients: currentProductIngredients,
    setIngredients: saveProductIngredients,
  } = useProductIngredients(editingProductId);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [productRatings, setProductRatings] = useState<ProductRatingsMap>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filterAvailability, setFilterAvailability] = useState<"all" | "available" | "unavailable">("all");
  const [filterServiceModes, setFilterServiceModes] = useState<string[]>([]);
  const [filterRodizio, setFilterRodizio] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "orders_asc" | "orders_desc" | "rating_asc" | "rating_desc">("default");
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [modalTab, setModalTab] = useState<"geral" | "imagens" | "precos" | "ingredientes">("geral");
  const [pageTab, setPageTab] = useState<"produtos" | "ingredientes">("produtos");

  useEffect(() => {
    fetch("/api/admin/products/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ProductStats | null) => data && setStats(data))
      .catch(() => {});

    // Fetch product ratings from game stats
    fetch("/api/admin/game-stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.ratings) return;
        const map: ProductRatingsMap = {};
        for (const p of data.ratings.allProductRatings ?? []) {
          map[p.productId] = { avgRating: p.avgRating, count: p.voteCount };
        }
        setProductRatings(map);
      })
      .catch(() => {});
  }, []);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    category_id: "",
    image_urls: [] as string[],
    is_available: true,
    is_rodizio: false,
    sort_order: 0,
    service_modes: [] as string[],
    service_prices: {} as Record<string, number>,
    ingredients: [] as { ingredientId: string; quantity: number; ingredientName: string; ingredientUnit: string }[],
  });
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleOpenModal = (product?: Product, tab?: "geral" | "imagens" | "precos" | "ingredientes") => {
    if (product) {
      setEditingProduct(product);
      setEditingProductId(product.id);
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price,
        category_id: product.categoryId,
        image_urls: product.imageUrls?.length ? [...product.imageUrls] : product.imageUrl ? [product.imageUrl] : [],
        is_available: product.isAvailable,
        is_rodizio: product.isRodizio,
        sort_order: product.sortOrder,
        service_modes: product.serviceModes?.length ? [...product.serviceModes] : [],
        service_prices: product.servicePrices ? { ...product.servicePrices } : {},
        ingredients: [],  // Loaded async via useProductIngredients
      });
    } else {
      setEditingProduct(null);
      setEditingProductId(null);
      setFormData({
        name: "",
        description: "",
        price: 0,
        category_id: categories[0]?.id || "",
        image_urls: [],
        is_available: true,
        is_rodizio: false,
        sort_order: products.length,
        service_modes: [],
        service_prices: {},
        ingredients: [],
      });
    }
    setNewImageUrl("");
    setModalTab(tab ?? "geral");
    setShowModal(true);
  };

  // Sync product ingredients from hook into formData when they load
  useEffect(() => {
    if (currentProductIngredients.length > 0 && editingProductId) {
      setFormData((prev) => ({
        ...prev,
        ingredients: currentProductIngredients.map((pi) => ({
          ingredientId: pi.ingredientId,
          quantity: pi.quantity,
          ingredientName: pi.ingredientName,
          ingredientUnit: pi.ingredientUnit,
        })),
      }));
    }
  }, [currentProductIngredients, editingProductId]);

  const addImageUrl = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    setFormData((prev) => ({ ...prev, image_urls: [...prev.image_urls, url] }));
    setNewImageUrl("");
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index),
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/products/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.url) {
        setFormData((prev) => ({ ...prev, image_urls: [...prev.image_urls, data.url] }));
      } else {
        alert(data.error || "Erro no upload");
      }
    } catch {
      alert("Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.service_modes.length === 0) {
      alert("Selecione pelo menos um modo de serviço.");
      return;
    }

    const priceValues = Object.values(formData.service_prices).filter((v) => v > 0);
    const basePrice = priceValues.length > 0 ? Math.min(...priceValues) : 0;

    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: basePrice,
      categoryId: formData.category_id,
      imageUrls: formData.image_urls,
      isAvailable: formData.is_available,
      isRodizio: formData.is_rodizio,
      sortOrder: formData.sort_order,
      serviceModes: formData.service_modes,
      servicePrices: formData.service_prices,
    };

    let savedProductId: string | null = null;

    if (editingProduct) {
      await updateProduct({ id: editingProduct.id, data: productData });
      savedProductId = editingProduct.id;
    } else {
      const created = await createProduct(productData);
      savedProductId = created?.id ?? null;
    }

    // Save product ingredients if we have a product ID
    if (savedProductId && formData.ingredients.length > 0) {
      await saveProductIngredients({
        productId: savedProductId,
        ingredients: formData.ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
        })),
      });
    } else if (savedProductId && formData.ingredients.length === 0 && editingProduct) {
      // Clear ingredients if all were removed
      await saveProductIngredients({
        productId: savedProductId,
        ingredients: [],
      });
    }

    setShowModal(false);
    // No need to call fetchData - React Query auto-updates!
  };

  const handleDelete = (product: Product) => {
    setDeletingProduct(product);
  };

  const confirmDelete = async () => {
    if (!deletingProduct) return;
    await deleteProduct(deletingProduct.id);
    setDeletingProduct(null);
  };

  const handleToggleAvailable = async (product: Product) => {
    await updateProduct({ id: product.id, data: { isAvailable: !product.isAvailable } });
    // No need to call fetchData - React Query auto-updates!
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || "Sem categoria";
  };

  const orderCount = (productId: string) =>
    stats?.orderCountByProductId?.[productId] ?? 0;

  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    const matchesSearch = !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability = filterAvailability === "all" ||
      (filterAvailability === "available" && product.isAvailable) ||
      (filterAvailability === "unavailable" && !product.isAvailable);
    const matchesServiceMode = filterServiceModes.length === 0 ||
      filterServiceModes.some((m) => product.serviceModes?.includes(m));
    const matchesRodizio = !filterRodizio || product.isRodizio;
    return matchesCategory && matchesSearch && matchesAvailability && matchesServiceMode && matchesRodizio;
  }).sort((a, b) => {
    if (sortBy === "orders_desc") return orderCount(b.id) - orderCount(a.id);
    if (sortBy === "orders_asc") return orderCount(a.id) - orderCount(b.id);
    if (sortBy === "rating_desc") return (productRatings[String(b.id)]?.avgRating ?? 0) - (productRatings[String(a.id)]?.avgRating ?? 0);
    if (sortBy === "rating_asc") return (productRatings[String(a.id)]?.avgRating ?? 0) - (productRatings[String(b.id)]?.avgRating ?? 0);
    return 0;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page-level tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: "produtos" as const, label: "Produtos" },
          { id: "ingredientes" as const, label: "Ingredientes" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPageTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              pageTab === tab.id
                ? "border-[#D4AF37] text-[#D4AF37]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ingredients Catalog Tab */}
      {pageTab === "ingredientes" && (
        <IngredientsCatalogTab />
      )}

      {/* Products Tab */}
      {pageTab === "produtos" && (<>
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Produtos</h1>
          <input
            type="text"
            placeholder="Pesquisar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sm:max-w-xs w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-gray-500 hidden sm:inline">Vista:</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-[#D4AF37] text-black" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              title="Grelha"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-2 ${viewMode === "table" ? "bg-[#D4AF37] text-black" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              title="Tabela"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Produto
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap transition-colors ${
              !selectedCategory
                ? "bg-[#D4AF37] text-black"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-[#D4AF37] text-black"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
      </div>

      {/* Filters toggle + count */}
      {(() => {
        const activeCount = (filterAvailability !== "all" ? 1 : 0) + filterServiceModes.length + (filterRodizio ? 1 : 0) + (sortBy !== "default" ? 1 : 0);
        return (
          <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                showFilters ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros
              {activeCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-[#D4AF37] text-black">{activeCount}</span>
              )}
            </button>
            <span className="text-sm text-gray-400">{filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-3">
              {/* Availability toggle */}
              <div className="inline-flex items-center gap-2">
                <span className={`text-sm transition-colors ${filterAvailability === "unavailable" ? "text-red-600 font-medium" : "text-gray-400"}`}>Indisponivel</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={filterAvailability !== "all"}
                  onClick={() => setFilterAvailability((v) => v === "all" ? "available" : v === "available" ? "unavailable" : "all")}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    filterAvailability === "available" ? "bg-green-500"
                      : filterAvailability === "unavailable" ? "bg-red-500"
                      : "bg-gray-300"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    filterAvailability === "available" ? "translate-x-[26px]"
                      : filterAvailability === "unavailable" ? "translate-x-[3px]"
                      : "translate-x-[14px]"
                  }`} />
                </button>
                <span className={`text-sm transition-colors ${filterAvailability === "available" ? "text-green-600 font-medium" : "text-gray-400"}`}>Disponivel</span>
              </div>

              <span className="hidden sm:block w-px h-5 bg-gray-200" />

              {/* Service Modes */}
              <div className="flex items-center gap-3 flex-wrap">
                {([
                  { value: "dine_in", label: "Sala", color: "text-blue-600 focus:ring-blue-500" },
                  { value: "takeaway", label: "Take Away", color: "text-teal-600 focus:ring-teal-500" },
                  { value: "delivery", label: "Delivery", color: "text-orange-600 focus:ring-orange-500" },
                ] as const).map((m) => (
                  <label key={m.value} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterServiceModes.includes(m.value)}
                      onChange={() => setFilterServiceModes((prev) =>
                        prev.includes(m.value) ? prev.filter((v) => v !== m.value) : [...prev, m.value]
                      )}
                      className={`w-4 h-4 border-gray-300 rounded ${m.color}`}
                    />
                    <span className="text-sm text-gray-700">{m.label}</span>
                  </label>
                ))}
              </div>

              <span className="hidden sm:block w-px h-5 bg-gray-200" />

              {/* Rodízio */}
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterRodizio}
                  onChange={() => setFilterRodizio((v) => !v)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Rodizio</span>
              </label>

              <span className="hidden sm:block w-px h-5 bg-gray-200" />

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full sm:w-auto px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 bg-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
              >
                <option value="default">Ordenar: Predefinido</option>
                <option value="orders_desc">Pedidos (mais primeiro)</option>
                <option value="orders_asc">Pedidos (menos primeiro)</option>
                <option value="rating_desc">Avaliacao (melhor primeiro)</option>
                <option value="rating_asc">Avaliacao (pior primeiro)</option>
              </select>

              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setFilterAvailability("all"); setFilterServiceModes([]); setFilterRodizio(false); setSortBy("default"); }}
                  className="w-full sm:w-auto px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-center"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
          </>
        );
      })()}

      {/* Products + Side Panel */}
      <div className="flex gap-6">
      <div className={showModal ? "flex-1 min-w-0" : "w-full"}>
      {/* Products: Grid or Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <p className="text-gray-500">Nenhum produto encontrado</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-900">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-medium">Imagem</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Disponível</th>
                <th className="px-4 py-3 font-medium">Rodízio</th>
                <th className="px-4 py-3 font-medium">Modo Servico</th>
                <th className="px-4 py-3 font-medium">Imagens</th>
                <th className="px-4 py-3 font-medium">Avaliações</th>
                <th className="px-4 py-3 font-medium">Vezes pedido</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className={`border-b border-gray-100 hover:bg-gray-50/50 ${!product.isAvailable ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-2">
                    {(product.imageUrl || (product.imageUrls?.length ?? 0) > 0) ? (
                      <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100 shrink-0 cursor-pointer" onClick={() => handleOpenModal(product, "imagens")}>
                        <Image
                          src={product.imageUrl ?? product.imageUrls?.[0] ?? ""}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                          sizes="40px"
                        />
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div>
                      <div className="font-medium cursor-pointer hover:text-[#D4AF37] transition-colors" onClick={() => handleOpenModal(product)}>{product.name}</div>
                      <div className="text-xs text-gray-500">{getCategoryName(product.categoryId)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-2 cursor-pointer" onClick={() => handleOpenModal(product, "precos")}>
                    <div className="font-semibold text-[#D4AF37] tabular-nums">{product.price.toFixed(2)}€</div>
                    {Object.keys(product.servicePrices ?? {}).length > 0 && (
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {Object.entries(product.servicePrices).map(([mode, price]) => (
                          <div key={mode} className="flex justify-between text-xs text-gray-500 gap-2">
                            <span>{mode === "delivery" ? "Del" : mode === "takeaway" ? "TA" : mode === "dine_in" ? "Sala" : mode}</span>
                            <span className="tabular-nums">{price.toFixed(2)}€</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={product.isAvailable ? "text-green-600" : "text-red-600"}>
                      {product.isAvailable ? "Sim" : "Não"}
                    </span>
                  </td>
                  <td className="px-4 py-2">{product.isRodizio ? "Sim" : "Não"}</td>
                  <td className="px-4 py-2 cursor-pointer" onClick={() => handleOpenModal(product, "precos")}>
                    {product.serviceModes?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.serviceModes.map((m) => (
                          <span key={m} className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                            {m === "delivery" ? "Delivery" : m === "takeaway" ? "Take Away" : m === "dine_in" ? "Sala" : m}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {product.imageUrls?.length ?? (product.imageUrl ? 1 : 0)}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    <span className="inline-flex items-center gap-1" title="Avaliação dos clientes">
                      <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {productRatings[String(product.id)]
                        ? `${productRatings[String(product.id)].avgRating} (${productRatings[String(product.id)].count})`
                        : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900">{orderCount(product.id)}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleToggleAvailable(product)}
                        className={`p-1.5 rounded ${product.isAvailable ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}
                        title={product.isAvailable ? "Marcar indisponível" : "Marcar disponível"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`grid gap-4 ${showModal ? "sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col"
            >
              {(product.imageUrl || (product.imageUrls?.length ?? 0) > 0) ? (
                <div className="h-32 bg-gray-100 relative cursor-pointer" onClick={() => handleOpenModal(product, "imagens")}>
                  <Image
                    src={product.imageUrl ?? product.imageUrls?.[0] ?? ""}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full shadow-sm ${
                      product.isAvailable
                        ? "bg-white/90 text-gray-700 border border-gray-200"
                        : "bg-red-500 text-white"
                    }`}>
                      {product.isAvailable ? "Disponivel" : "Indisponivel"}
                    </span>
                    {product.isRodizio && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full shadow-sm bg-purple-500 text-white">
                        Rodizio
                      </span>
                    )}
                  </div>
                  {(product.imageUrls?.length ?? (product.imageUrl ? 1 : 0)) > 1 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs">
                      +{(product.imageUrls?.length ?? 1) - 1}
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-32 bg-gray-100 relative flex items-center justify-center cursor-pointer" onClick={() => handleOpenModal(product, "imagens")}>
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full shadow-sm ${
                      product.isAvailable
                        ? "bg-white/90 text-gray-700 border border-gray-200"
                        : "bg-red-500 text-white"
                    }`}>
                      {product.isAvailable ? "Disponivel" : "Indisponivel"}
                    </span>
                    {product.isRodizio && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full shadow-sm bg-purple-500 text-white">
                        Rodizio
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="p-4 flex flex-col flex-1">
                <div className="mb-2">
                  <h3 className="font-semibold text-gray-900 cursor-pointer hover:text-[#D4AF37] transition-colors" onClick={() => handleOpenModal(product)}>{product.name}</h3>
                  <p className="text-xs text-gray-500">{getCategoryName(product.categoryId)}</p>
                </div>
                {product.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">{product.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                  <span className="flex items-center gap-1" title="Avaliação dos clientes">
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {productRatings[String(product.id)]
                      ? `${productRatings[String(product.id)].avgRating} (${productRatings[String(product.id)].count})`
                      : "—"}
                  </span>
                  <span className="flex items-center gap-1" title="Vezes escolhido">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {orderCount(product.id)}× pedido
                  </span>
                </div>
                {(product.serviceModes?.length ?? 0) > 0 && (
                  <div className="flex flex-col gap-1 mb-3 mt-auto cursor-pointer" onClick={() => handleOpenModal(product, "precos")}>
                    {product.serviceModes?.map((m) => (
                      <div key={m} className={`flex items-center justify-between px-3 py-1.5 text-sm font-medium rounded-lg ${
                        m === "delivery"
                          ? "bg-orange-100 text-orange-700"
                          : m === "takeaway"
                            ? "bg-teal-100 text-teal-700"
                            : m === "dine_in"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                      }`}>
                        <span>{m === "delivery" ? "Delivery" : m === "takeaway" ? "Take Away" : m === "dine_in" ? "Sala" : m}</span>
                        {product.servicePrices?.[m] !== undefined && (
                          <span className="font-bold tabular-nums min-w-[4rem] text-right">{product.servicePrices[m].toFixed(2)}€</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => handleDelete(product)}
                    className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remover
                  </button>
                  <button
                    onClick={() => handleOpenModal(product)}
                    className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>
      {/* Side Panel */}
      {showModal && (
        <div className="w-96 shrink-0">
          <div className="sticky top-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900">
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {([
                { key: "geral" as const, label: "Geral" },
                { key: "imagens" as const, label: "Imagens", badge: formData.image_urls.length },
                { key: "precos" as const, label: "Precos", badge: formData.service_modes.length },
                { key: "ingredientes" as const, label: "Ingredientes", badge: formData.ingredients.length },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setModalTab(tab.key)}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${
                    modalTab === tab.key
                      ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                  {"badge" in tab && (tab.badge ?? 0) > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">

              {/* Tab: Geral */}
              {modalTab === "geral" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descricao
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                      required
                    >
                      <option value="">Selecionar...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_available}
                        onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                        className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                      />
                      <span className="text-sm text-gray-700">Disponivel</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_rodizio}
                        onChange={(e) => setFormData({ ...formData, is_rodizio: e.target.checked })}
                        className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                      />
                      <span className="text-sm text-gray-700">Rodizio</span>
                    </label>
                  </div>
                </>
              )}

              {/* Tab: Imagens */}
              {modalTab === "imagens" && (
                <div className="space-y-4">
                  {formData.image_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.image_urls.map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          className="relative group inline-block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                        >
                          <Image
                            src={url}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.image_urls.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      Nenhuma imagem adicionada
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImageUrl())}
                      className="flex-1 min-w-[180px] px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={addImageUrl}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Adicionar URL
                    </button>
                  </div>
                  <label className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer text-center text-sm">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {uploading ? "A enviar…" : "Upload de ficheiro"}
                  </label>
                </div>
              )}

              {/* Tab: Precos */}
              {modalTab === "precos" && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Modos de servico e precos
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "dine_in", label: "Sala", bg: "bg-blue-50 border-blue-200", text: "text-blue-700", check: "text-blue-600 focus:ring-blue-500" },
                      { value: "delivery", label: "Delivery", bg: "bg-orange-50 border-orange-200", text: "text-orange-700", check: "text-orange-600 focus:ring-orange-500" },
                      { value: "takeaway", label: "Take Away", bg: "bg-teal-50 border-teal-200", text: "text-teal-700", check: "text-teal-600 focus:ring-teal-500" },
                    ].map((mode) => {
                      const isActive = formData.service_modes.includes(mode.value);
                      return (
                        <div
                          key={mode.value}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                            isActive ? mode.bg : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={(e) => {
                                setFormData((prev) => {
                                  const newModes = e.target.checked
                                    ? [...prev.service_modes, mode.value]
                                    : prev.service_modes.filter((m) => m !== mode.value);
                                  const newPrices = { ...prev.service_prices };
                                  if (!e.target.checked) {
                                    delete newPrices[mode.value];
                                  }
                                  return { ...prev, service_modes: newModes, service_prices: newPrices };
                                });
                              }}
                              className={`w-4 h-4 border-gray-300 rounded ${mode.check}`}
                            />
                            <span className={`text-sm font-medium ${isActive ? mode.text : "text-gray-500"}`}>
                              {mode.label}
                            </span>
                          </label>
                          {isActive && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.service_prices[mode.value] ?? ""}
                                placeholder="0.00"
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    service_prices: {
                                      ...prev.service_prices,
                                      [mode.value]: parseFloat(e.target.value) || 0,
                                    },
                                  }))
                                }
                                className={`w-24 px-2 py-1 border rounded-md text-sm font-semibold text-right focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent ${mode.text} bg-white border-gray-300`}
                                required
                              />
                              <span className={`text-sm font-medium ${mode.text}`}>€</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab: Ingredientes (catalog-based) */}
              {modalTab === "ingredientes" && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Selecione ingredientes do catálogo e defina a quantidade por dose.
                  </p>

                  {formData.ingredients.map((ing, idx) => {
                    const availableIngredients = catalogIngredients.filter(
                      (ci) => ci.id === ing.ingredientId || !formData.ingredients.some((fi) => fi.ingredientId === ci.id)
                    );
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={ing.ingredientId}
                          onChange={(e) => {
                            const selected = catalogIngredients.find((ci) => ci.id === e.target.value);
                            setFormData((prev) => {
                              const updated = [...prev.ingredients];
                              updated[idx] = {
                                ...updated[idx],
                                ingredientId: e.target.value,
                                ingredientName: selected?.name ?? "",
                                ingredientUnit: selected?.unit ?? "",
                              };
                              return { ...prev, ingredients: updated };
                            });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                        >
                          <option value="">Selecionar ingrediente...</option>
                          {availableIngredients.map((ci) => (
                            <option key={ci.id} value={ci.id}>
                              {ci.name} ({ci.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={ing.quantity || ""}
                          onChange={(e) =>
                            setFormData((prev) => {
                              const updated = [...prev.ingredients];
                              updated[idx] = { ...updated[idx], quantity: parseFloat(e.target.value) || 0 };
                              return { ...prev, ingredients: updated };
                            })
                          }
                          placeholder="Qtd"
                          min="0"
                          step="0.1"
                          className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 text-right focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                        />
                        <span className="text-sm text-gray-500 w-8">{ing.ingredientUnit || ""}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              ingredients: prev.ingredients.filter((_, i) => i !== idx),
                            }))
                          }
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}

                  {catalogIngredients.length > formData.ingredients.length && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          ingredients: [...prev.ingredients, { ingredientId: "", quantity: 0, ingredientName: "", ingredientUnit: "" }],
                        }))
                      }
                      className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
                    >
                      + Adicionar ingrediente
                    </button>
                  )}

                  {formData.ingredients.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      Nenhum ingrediente adicionado.
                      {catalogIngredients.length === 0 && (
                        <span className="block mt-1">
                          Crie ingredientes primeiro na tab &ldquo;Ingredientes&rdquo;.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] text-sm"
                >
                  {editingProduct ? "Guardar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar produto</h3>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja eliminar <span className="font-medium text-gray-900">&ldquo;{deletingProduct.name}&rdquo;</span>? Esta ação não pode ser revertida.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}

// =============================================
// INGREDIENTS CATALOG TAB
// =============================================

const UNIT_OPTIONS = [
  { value: "g", label: "g (gramas)" },
  { value: "kg", label: "kg (quilogramas)" },
  { value: "ml", label: "ml (mililitros)" },
  { value: "L", label: "L (litros)" },
  { value: "un", label: "un (unidades)" },
];

function IngredientsCatalogTab() {
  const { ingredients, isLoading, error, create, update, remove } = useIngredients();
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<IngredientWithProductCount | null>(null);
  const [formData, setFormData] = useState({ name: "", unit: "g" });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; variant: "success" | "error" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; ingredient: IngredientWithProductCount } | null>(null);

  const handleOpenModal = (ingredient?: IngredientWithProductCount) => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setFormData({ name: ingredient.name, unit: ingredient.unit });
    } else {
      setEditingIngredient(null);
      setFormData({ name: "", unit: "g" });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIngredient) {
      const result = await update(editingIngredient.id, formData);
      if (result) {
        setAlertModal({ isOpen: true, title: "Sucesso", message: "Ingrediente atualizado", variant: "success" });
        setShowModal(false);
      }
    } else {
      const result = await create(formData);
      if (result) {
        setAlertModal({ isOpen: true, title: "Sucesso", message: "Ingrediente criado", variant: "success" });
        setShowModal(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirmDialog?.ingredient) return;
    const success = await remove(confirmDialog.ingredient.id);
    if (success) {
      setAlertModal({ isOpen: true, title: "Sucesso", message: "Ingrediente eliminado", variant: "success" });
    }
    setConfirmDialog(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin h-6 w-6 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Catálogo de Ingredientes</h2>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] text-sm"
        >
          + Novo Ingrediente
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Nome</th>
              <th className="text-left px-4 py-3 font-medium">Unidade</th>
              <th className="text-center px-4 py-3 font-medium">Produtos</th>
              <th className="text-right px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ingredients.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  Nenhum ingrediente. Clique em &ldquo;+ Novo Ingrediente&rdquo; para começar.
                </td>
              </tr>
            )}
            {ingredients.map((ing) => (
              <tr key={ing.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{ing.name}</td>
                <td className="px-4 py-3 text-gray-600">{ing.unit}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    ing.productCount > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {ing.productCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(ing)}
                    className="text-gray-400 hover:text-[#D4AF37] mr-2"
                    title="Editar"
                  >
                    <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (ing.productCount > 0) {
                        setAlertModal({ isOpen: true, title: "Ingrediente em uso", message: `Este ingrediente está associado a ${ing.productCount} produto(s). Remova-o dos produtos primeiro.`, variant: "error" });
                      } else {
                        setConfirmDialog({ isOpen: true, ingredient: ing });
                      }
                    }}
                    className="text-gray-400 hover:text-red-500"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingIngredient ? "Editar Ingrediente" : "Novo Ingrediente"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Salmão, Arroz, Molho de soja"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade de Medida</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030] text-sm"
                >
                  {editingIngredient ? "Guardar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal(null)}
          title={alertModal.title}
          message={alertModal.message}
          variant={alertModal.variant}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="Eliminar ingrediente"
          message={`Tem certeza que deseja eliminar "${confirmDialog.ingredient.name}"?`}
          confirmText="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
