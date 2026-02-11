"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useProductsOptimized } from "@/presentation/hooks";
import type { Product, Category } from "@/domain/entities";

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
  } = useProductsOptimized();

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [productRatings, setProductRatings] = useState<ProductRatingsMap>({});

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
  });
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price,
        category_id: product.categoryId,
        image_urls: product.imageUrls?.length ? [...product.imageUrls] : product.imageUrl ? [product.imageUrl] : [],
        is_available: product.isAvailable,
        is_rodizio: product.isRodizio,
        sort_order: product.sortOrder,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        price: 0,
        category_id: categories[0]?.id || "",
        image_urls: [],
        is_available: true,
        is_rodizio: false,
        sort_order: products.length,
      });
    }
    setNewImageUrl("");
    setShowModal(true);
  };

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

    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: formData.price,
      categoryId: formData.category_id,
      imageUrls: formData.image_urls,
      isAvailable: formData.is_available,
      isRodizio: formData.is_rodizio,
      sortOrder: formData.sort_order,
    };

    if (editingProduct) {
      await updateProduct({ id: editingProduct.id, data: productData });
    } else {
      await createProduct(productData);
    }

    setShowModal(false);
    // No need to call fetchData - React Query auto-updates!
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Tem certeza que deseja eliminar "${product.name}"?`)) return;
    await deleteProduct(product.id);
    // No need to call fetchData - React Query auto-updates!
  };

  const handleToggleAvailable = async (product: Product) => {
    await updateProduct({ id: product.id, data: { isAvailable: !product.isAvailable } });
    // No need to call fetchData - React Query auto-updates!
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || "Sem categoria";
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    const matchesSearch = !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  const orderCount = (productId: string) =>
    stats?.orderCountByProductId?.[productId] ?? 0;

  return (
    <div className="space-y-6">
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
      <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
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
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-[#D4AF37] text-black"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
      </div>

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
                      <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100 shrink-0">
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
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500">{getCategoryName(product.categoryId)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-semibold text-[#D4AF37]">{product.price.toFixed(2)}€</td>
                  <td className="px-4 py-2">
                    <span className={product.isAvailable ? "text-green-600" : "text-red-600"}>
                      {product.isAvailable ? "Sim" : "Não"}
                    </span>
                  </td>
                  <td className="px-4 py-2">{product.isRodizio ? "Sim" : "Não"}</td>
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${
                !product.isAvailable ? "opacity-50" : ""
              }`}
            >
              {(product.imageUrl || (product.imageUrls?.length ?? 0) > 0) && (
                <div className="h-32 bg-gray-100 relative">
                  <Image
                    src={product.imageUrl ?? product.imageUrls?.[0] ?? ""}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {(product.imageUrls?.length ?? (product.imageUrl ? 1 : 0)) > 1 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs">
                      +{(product.imageUrls?.length ?? 1) - 1}
                    </span>
                  )}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-xs text-gray-500">{getCategoryName(product.categoryId)}</p>
                  </div>
                  <span className="text-lg font-bold text-[#D4AF37]">
                    {product.price.toFixed(2)}€
                  </span>
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
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {product.isRodizio && (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                        Rodízio
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.isAvailable
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {product.isAvailable ? "Disponível" : "Indisponível"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggleAvailable(product)}
                      className={`p-1.5 rounded ${
                        product.isAvailable
                          ? "text-green-600 hover:bg-green-50"
                          : "text-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                    required
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imagens do produto
                </label>
                {formData.image_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
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
                  <label className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {uploading ? "A enviar…" : "Upload"}
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                  />
                  <span className="text-sm text-gray-700">Disponível</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_rodizio}
                    onChange={(e) => setFormData({ ...formData, is_rodizio: e.target.checked })}
                    className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                  />
                  <span className="text-sm text-gray-700">Rodízio</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#C4A030]"
                >
                  {editingProduct ? "Guardar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
