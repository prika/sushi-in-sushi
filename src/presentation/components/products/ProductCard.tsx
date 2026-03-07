"use client";

import Image from "next/image";
import { getOptimizedImageUrl, IMAGE_SIZES } from "@/lib/image";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    image_url?: string | null;
    is_available: boolean;
  };
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  isRodizio?: boolean;
  showPrice?: boolean;
  disabled?: boolean;
}

export function ProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
  isRodizio = false,
  showPrice = true,
  disabled = false,
}: ProductCardProps) {
  const isOutOfStock = !product.is_available;

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 transition-all ${
        isOutOfStock ? "opacity-60" : "hover:shadow-md"
      }`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {product.image_url ? (
          <Image
            src={getOptimizedImageUrl(product.image_url, IMAGE_SIZES.thumbnail)}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">🍣</span>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-medium px-3 py-1 bg-red-500 rounded-full text-sm">
              Esgotado
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-3">
          {/* Price */}
          {showPrice && (
            <div className="text-sm">
              {isRodizio ? (
                <span className="text-green-600 font-medium">Incluído</span>
              ) : (
                <span className="font-semibold text-gray-900">
                  {product.price.toFixed(2)}€
                </span>
              )}
            </div>
          )}

          {/* Quantity Controls */}
          {!isOutOfStock && (
            <div className="flex items-center gap-2">
              {quantity > 0 ? (
                <>
                  <button
                    onClick={onRemove}
                    disabled={disabled}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="w-6 text-center font-medium text-gray-900">
                    {quantity}
                  </span>
                  <button
                    onClick={onAdd}
                    disabled={disabled}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#D4AF37] text-black hover:bg-[#C4A030] disabled:opacity-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </>
              ) : (
                <button
                  onClick={onAdd}
                  disabled={disabled}
                  className="px-3 py-1.5 bg-[#D4AF37] text-black text-sm font-medium rounded-full hover:bg-[#C4A030] disabled:opacity-50 transition-colors"
                >
                  Adicionar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
