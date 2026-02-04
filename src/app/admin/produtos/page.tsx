"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Product, Category } from "@/types/database";

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    category_id: "",
    image_url: "",
    is_available: true,
    is_rodizio: false,
    sort_order: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();

    const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
    ]);

    setProducts(productsData || []);
    setCategories(categoriesData || []);
    setIsLoading(false);
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price,
        category_id: product.category_id,
        image_url: product.image_url || "",
        is_available: product.is_available,
        is_rodizio: product.is_rodizio,
        sort_order: product.sort_order,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        price: 0,
        category_id: categories[0]?.id || "",
        image_url: "",
        is_available: true,
        is_rodizio: false,
        sort_order: products.length,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    const productData = {
      ...formData,
      description: formData.description || null,
      image_url: formData.image_url || null,
    };

    if (editingProduct) {
      await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);
    } else {
      await supabase.from("products").insert(productData);
    }

    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Tem certeza que deseja eliminar "${product.name}"?`)) return;

    const supabase = createClient();
    await supabase.from("products").delete().eq("id", product.id);
    fetchData();
  };

  const handleToggleAvailable = async (product: Product) => {
    const supabase = createClient();
    await supabase
      .from("products")
      .update({ is_available: !product.is_available })
      .eq("id", product.id);
    fetchData();
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || "Sem categoria";
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Produtos</h1>
          <p className="text-gray-500">Configurar menu e preços</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Produtos</p>
          <p className="text-2xl font-bold text-gray-900">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Disponíveis</p>
          <p className="text-2xl font-bold text-green-600">{products.filter(p => p.is_available).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Rodízio</p>
          <p className="text-2xl font-bold text-purple-600">{products.filter(p => p.is_rodizio).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Categorias</p>
          <p className="text-2xl font-bold text-blue-600">{categories.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Pesquisar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
          />
        </div>
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
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <p className="text-gray-500">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${
                !product.is_available ? "opacity-50" : ""
              }`}
            >
              {product.image_url && (
                <div className="h-32 bg-gray-100 relative">
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-xs text-gray-500">{getCategoryName(product.category_id)}</p>
                  </div>
                  <span className="text-lg font-bold text-[#D4AF37]">
                    {product.price.toFixed(2)}€
                  </span>
                </div>
                {product.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{product.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {product.is_rodizio && (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                        Rodízio
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.is_available
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {product.is_available ? "Disponível" : "Indisponível"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggleAvailable(product)}
                      className={`p-1.5 rounded ${
                        product.is_available
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
                  URL da Imagem
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  placeholder="https://..."
                />
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
