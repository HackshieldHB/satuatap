"use client";

import { useState } from "react";
import { ProductCard } from "@/components/store/ProductCard";
import { CartButton } from "@/components/store/CartButton";
import { Search } from "@/components/ui/Search";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { MARKETPLACE_PRODUCTS, MARKETPLACE_CATEGORIES } from "@/data/mock";
import { PackageSearch } from "lucide-react";

export default function MarketplacePage() {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");

  const products = MARKETPLACE_PRODUCTS.filter(
    (p) =>
      (cat === "all" || p.category === cat) &&
      (!q || p.name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Marketplace</h1>
          <p className="text-sm text-muted">
            Belanja perangkat pintar, langsung terhubung ke rumahmu.
          </p>
        </div>
        <CartButton />
      </div>

      <Search
        placeholder="Cari perangkat pintar..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        {MARKETPLACE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95",
              cat === c.id
                ? "bg-primary text-primary-foreground shadow-card"
                : "bg-surface border border-border text-muted hover:border-primary/40"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Produk tidak ditemukan"
          description="Coba kata kunci atau kategori lain."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
