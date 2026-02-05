"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { menuCircunvalacao } from "@/data/menu-circunvalacao";
import { menuBoavista } from "@/data/menu-boavista";
import { cn } from "@/lib/utils";
import { ReservationForm } from "@/components/ReservationForm";
import type { Location } from "@/types/database";

// Map category names to images
const categoryImages: Record<string, string> = {
  "Entradas Quentes": "/product/sopa-miso.jpg",
  "Entradas Frias": "/product/ceviche.jpg",
  Entradas: "/product/camarao-empanado.jpg",
  Sashimi: "/product/sashimi-salmao.jpg",
  Nigiri: "/product/nigiri-salmao.jpg",
  Hossomaki: "/product/sashimi-salmao.jpg",
  Gunkan: "/product/gunkan.jpg",
  "Hot Rolls": "/product/hot-roll.jpg",
  Temaki: "/product/temaki.jpg",
  "Big Hot": "/product/big-hot.jpg",
  Poke: "/product/poke.jpg",
  "Combinados Individuais": "/product/combinado-su.jpg",
  "Combinados Frios": "/product/combinado-su.jpg",
  "Combinados Quentes + Frios": "/product/combinado-sesamo.jpg",
  "Combinados para Partilhar": "/product/salmon-fusion.jpg",
  Vegetariano: "/product/temaki-vegan.jpg",
  Sobremesas: "/product/sobremesa-banana.jpg",
  "Uramaki Premium": "/product/sashimi-salmao.jpg",
  Promoções: "/product/salmon-fusion.jpg",
  Bebidas: "/product/sopa-miso.jpg",
};

const restaurants = [
  {
    id: "circunvalacao",
    name: "Circunvalação",
    menu: menuCircunvalacao,
  },
  {
    id: "boavista",
    name: "Boavista",
    menu: menuBoavista,
  },
];

export default function MenuPage() {
  const t = useTranslations("menu");
  const tDesc = useTranslations("menuDescriptions");
  const [activeRestaurant, setActiveRestaurant] = useState(restaurants[0].id);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const currentRestaurant = restaurants.find((r) => r.id === activeRestaurant)!;

  // Open first category by default
  useEffect(() => {
    if (currentRestaurant.menu.length > 0) {
      setOpenCategories([currentRestaurant.menu[0].name]);
    }
  }, [activeRestaurant, currentRestaurant.menu]);

  const toggleCategory = (categoryName: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName],
    );
  };

  const expandAll = () => {
    setOpenCategories(currentRestaurant.menu.map((c) => c.name));
  };

  const collapseAll = () => {
    setOpenCategories([]);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium hidden sm:inline">
              {t("back")}
            </span>
          </Link>
          <div className="relative h-10 w-28">
            <Image
              src="/logo.png"
              alt="Sushi in Sushi"
              fill
              className="object-contain"
            />
          </div>
          {/* Restaurant Tabs */}
          <div className="flex gap-1">
            {restaurants.map((restaurant) => (
              <button
                key={restaurant.id}
                onClick={() => setActiveRestaurant(restaurant.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium tracking-wider uppercase transition-all duration-300 rounded",
                  activeRestaurant === restaurant.id
                    ? "text-background bg-gold"
                    : "text-gray-400 hover:text-white",
                )}
              >
                {restaurant.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="max-w-3xl mx-auto px-4 py-3 flex justify-end gap-2">
        <button
          onClick={expandAll}
          className="text-xs text-gray-400 hover:text-gold transition-colors"
        >
          {t("expandAll")}
        </button>
        <span className="text-gray-600">|</span>
        <button
          onClick={collapseAll}
          className="text-xs text-gray-400 hover:text-gold transition-colors"
        >
          {t("collapseAll")}
        </button>
      </div>

      {/* Menu Content - Accordion */}
      <main className="max-w-3xl mx-auto px-4">
        {currentRestaurant.menu.map((category) => {
          const isOpen = openCategories.includes(category.name);

          return (
            <div
              key={category.name}
              className="border-b border-white/5 last:border-0"
            >
              {/* Category Header - Accordion Trigger */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between py-4 group"
              >
                <h2 className="font-display text-xl font-semibold text-white group-hover:text-gold transition-colors">
                  {category.name}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {category.items.length} {t("items")}
                  </span>
                  <ChevronDown
                    size={20}
                    className={cn(
                      "text-gray-400 transition-transform duration-300",
                      isOpen && "rotate-180 text-gold",
                    )}
                  />
                </div>
              </button>

              {/* Category Content */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  isOpen
                    ? "max-h-[5000px] pb-4"
                    : "max-h-0 invisible",
                )}
              >
                <div className="grid grid-cols-1 gap-2">
                  {category.items.map((item) => (
                    <div
                      key={item.name}
                      className={cn(
                        "flex items-center gap-3 p-3 bg-card/30 rounded-lg",
                        item.outOfStock && "opacity-50",
                      )}
                    >
                      {/* Product Image */}
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white/5">
                        <Image
                          src={
                            categoryImages[category.name] ||
                            "/product/sashimi-salmao.jpg"
                          }
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-white text-sm">
                            {item.name}
                          </h3>
                          <p className="text-gold font-semibold text-sm whitespace-nowrap">
                            €{item.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.pieces && (
                            <span className="text-xs text-gray-400">
                              {item.pieces} {t("pieces")}
                            </span>
                          )}
                          {(item.description || tDesc.has(item.name)) && (
                            <>
                              {item.pieces && (
                                <span className="text-gray-500">•</span>
                              )}
                              <span className="text-xs text-gray-400 line-clamp-1">
                                {tDesc.has(item.name)
                                  ? tDesc(item.name)
                                  : item.description}
                              </span>
                            </>
                          )}
                          {item.outOfStock && (
                            <span className="text-xs text-accent ml-auto">
                              {t("outOfStock")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-white/5 py-3">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowReservationModal(true)}
              className="flex-1 px-6 py-2.5 bg-gold text-background text-sm font-medium tracking-wider uppercase text-center hover:bg-gold-light transition-all duration-300"
            >
              {t("book")}
            </button>
            <a
              href="https://delivery.eatseasyapp.com/sushinsushi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-6 py-2.5 border border-white/20 text-white text-sm font-medium tracking-wider uppercase text-center hover:border-gold hover:text-gold transition-all duration-300"
            >
              {t("order")}
            </a>
          </div>
        </div>
      </div>

      {/* Reservation Modal */}
      {showReservationModal && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowReservationModal(false)}
        >
          <div
            className="bg-background border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background flex items-center justify-between p-6 border-b border-white/10 z-10">
              <h2 className="text-xl font-semibold text-white">
                Reservar Mesa
              </h2>
              <button
                onClick={() => setShowReservationModal(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Fechar"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <ReservationForm defaultLocation={activeRestaurant as Location} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
