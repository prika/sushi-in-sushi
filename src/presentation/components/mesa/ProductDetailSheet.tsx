"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@/domain/entities";
import { ImageCarousel } from "./ImageCarousel";
import { getLocalized } from "@/lib/i18n/getLocalized";
import { ALL_ALLERGENS, ALLERGEN_EMOJI_MAP } from "@/lib/constants/allergens";

interface ProductIngredient {
  name: string;
  nameTranslations: Record<string, string> | null;
  allergens: string[];
}

interface ProductRating {
  avgRating: number;
  count: number;
}

interface ProductDetailSheetProps {
  product: Product | null;
  locale: string;
  orderType: "rodizio" | "carta" | null;
  cartQuantity: number;
  preparationTime: number | null;
  ingredients: ProductIngredient[];
  customerAllergens: string[];
  isWaiterOnly: boolean;
  onClose: () => void;
  onAddToCart: () => void;
  onUpdateQuantity: (_newQty: number) => void;
  t: (_key: string, _params?: Record<string, string | number>) => string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, rating - (star - 1)));
        return (
          <div key={star} className="relative w-4 h-4">
            {/* Empty star */}
            <svg
              className="absolute inset-0 w-4 h-4 text-gray-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {/* Filled star (clipped) */}
            {fill > 0 && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <svg
                  className="w-4 h-4 text-[#D4AF37]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProductDetailSheet({
  product,
  locale,
  orderType,
  cartQuantity,
  preparationTime,
  ingredients,
  customerAllergens,
  isWaiterOnly,
  onClose,
  onAddToCart,
  onUpdateQuantity,
  t,
}: ProductDetailSheetProps) {
  const [rating, setRating] = useState<ProductRating | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);

  // Fetch rating when product opens
  useEffect(() => {
    if (!product) {
      setRating(null);
      return;
    }

    let cancelled = false;
    setLoadingRating(true);

    fetch(`/api/mesa/product-ratings?productId=${product.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const r = data.ratings?.[String(product.id)];
        setRating(r ?? null);
      })
      .catch(() => {
        if (!cancelled) setRating(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product]);

  // Body scroll lock
  useEffect(() => {
    if (product) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [product]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose],
  );

  // Collect allergens from ingredients
  const allergenIds = product
    ? Array.from(new Set(ingredients.flatMap((ing) => ing.allergens)))
    : [];

  const description = product
    ? getLocalized(product.descriptions, product.description, locale)
    : null;

  const ingredientNames = ingredients
    .map((ing) => getLocalized(ing.nameTranslations, ing.name, locale))
    .filter(Boolean);

  const isIncludedInRodizio = orderType === "rodizio" && product?.isRodizio;

  return (
    <AnimatePresence>
      {product && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-sheet-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-2xl max-h-[90vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {/* Image carousel */}
              <ImageCarousel
                images={
                  product.imageUrls?.length
                    ? product.imageUrls
                    : product.imageUrl
                      ? [product.imageUrl]
                      : []
                }
                alt={product.name}
              />

              {/* Product info */}
              <div className="px-4 pt-4 pb-28">
                {/* Name + pieces */}
                <h2 id="product-sheet-title" className="text-xl font-bold text-white">{product.name}</h2>
                {product.quantity > 1 && (
                  <p className="text-sm text-gray-400 mt-0.5">
                    {t("mesa.productDetail.pieces", {
                      count: product.quantity,
                    })}
                  </p>
                )}

                {/* Rating */}
                {!loadingRating && rating && rating.count > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <StarRating rating={rating.avgRating} />
                    <span className="text-sm text-gray-400">
                      {rating.avgRating} · {rating.count}{" "}
                      {t("mesa.productDetail.reviews")}
                    </span>
                  </div>
                )}

                {/* Description */}
                {description && (
                  <div className="mt-4">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {description}
                    </p>
                  </div>
                )}

                {/* Preparation time */}
                {preparationTime && (
                  <div className="flex items-center gap-2 mt-4 text-gray-400">
                    <span>⏱️</span>
                    <span className="text-sm">
                      {t("mesa.productDetail.prepTime")}: ~{preparationTime} min
                    </span>
                  </div>
                )}

                {/* Ingredients */}
                {ingredientNames.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold text-white mb-2">
                      {t("mesa.productDetail.ingredients")}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {ingredientNames.join(", ")}
                    </p>
                  </div>
                )}

                {/* Allergens */}
                {allergenIds.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold text-white mb-2">
                      {t("mesa.productDetail.allergens")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {allergenIds.map((id) => {
                        const emoji = ALLERGEN_EMOJI_MAP[id] || "⚠️";
                        const label =
                          t(`mesa.productDetail.allergenNames.${id}`) ||
                          ALL_ALLERGENS.find((a) => a.id === id)?.label ||
                          id;
                        const isCustomerAllergen =
                          customerAllergens.includes(id);
                        return (
                          <span
                            key={id}
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border ${
                              isCustomerAllergen
                                ? "bg-red-900/50 text-red-200 border-red-500 font-semibold"
                                : "bg-gray-800 text-gray-300 border-gray-700"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{label}</span>
                            {isCustomerAllergen && <span>⚠️</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky bottom bar - Add to cart */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-3 flex items-center justify-between"
              style={{
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }}
            >
              <div>
                {isIncludedInRodizio ? (
                  <span className="inline-block bg-[#D4AF37] text-black text-sm font-bold px-3 py-1 rounded-full">
                    {t("mesa.productDetail.includedInRodizio")}
                  </span>
                ) : (
                  <span className="text-[#D4AF37] font-bold text-lg">
                    {orderType === "rodizio" && !product.isRodizio
                      ? `+€${product.price.toFixed(2)}`
                      : `€${product.price.toFixed(2)}`}
                  </span>
                )}
              </div>

              {cartQuantity > 0 ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onUpdateQuantity(cartQuantity - 1)}
                    disabled={isWaiterOnly}
                    aria-label={t("mesa.productDetail.decreaseQuantity")}
                    className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold text-lg text-white" role="status" aria-live="polite">
                    <span className="sr-only">{t("mesa.productDetail.quantity", { count: cartQuantity })}: </span>
                    {cartQuantity}
                  </span>
                  <button
                    onClick={onAddToCart}
                    disabled={isWaiterOnly}
                    aria-label={t("mesa.productDetail.increaseQuantity")}
                    className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold hover:bg-[#C4A030] transition-colors disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={onAddToCart}
                  disabled={isWaiterOnly}
                  className="px-6 py-2.5 bg-[#D4AF37] text-black font-semibold rounded-full hover:bg-[#C4A030] transition-colors disabled:opacity-50"
                >
                  {isWaiterOnly ? "🔒" : t("mesa.productDetail.addToCart")}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
