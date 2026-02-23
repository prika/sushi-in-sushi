"use client";

import { useRef, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

interface CategoryTabsProps {
  categories: Category[];
  activeId: string | null;
  onSelect: (_categoryId: string) => void;
  variant?: "default" | "pills" | "underline";
}

export function CategoryTabs({
  categories,
  activeId,
  onSelect,
  variant = "default",
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const activeTab = activeRef.current;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeTab.getBoundingClientRect();

      if (activeRect.left < containerRect.left) {
        container.scrollLeft -= containerRect.left - activeRect.left + 20;
      } else if (activeRect.right > containerRect.right) {
        container.scrollLeft += activeRect.right - containerRect.right + 20;
      }
    }
  }, [activeId]);

  const getTabStyles = (isActive: boolean) => {
    switch (variant) {
      case "pills":
        return isActive
          ? "bg-[#D4AF37] text-black"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200";
      case "underline":
        return isActive
          ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
          : "text-gray-600 border-b-2 border-transparent hover:text-gray-900";
      default:
        return isActive
          ? "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]"
          : "bg-white text-gray-700 border-gray-200 hover:border-gray-300";
    }
  };

  return (
    <div className="relative">
      {/* Gradient Fade Left */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1 -mx-1"
        style={{ scrollBehavior: "smooth" }}
      >
        {categories.map((category) => {
          const isActive = activeId === category.id;

          return (
            <button
              key={category.id}
              ref={isActive ? activeRef : null}
              onClick={() => onSelect(category.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
                font-medium text-sm transition-all flex-shrink-0
                ${variant === "default" ? "border" : ""}
                ${getTabStyles(isActive)}
              `}
            >
              {category.icon && <span>{category.icon}</span>}
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>

      {/* Gradient Fade Right */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      {/* Hide scrollbar styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
