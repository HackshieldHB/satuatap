"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/store/ProductCard";
import { CartButton } from "@/components/store/CartButton";
import { Search } from "@/components/ui/Search";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { STORE_PRODUCTS, STORE_CATEGORIES } from "@/data/mock";
import { useAuth } from "@/hooks/useAuth";
import { commerceService } from "@/services/commerce.service";
import type { Product } from "@/types";
import { PackageSearch, Store, Bike } from "lucide-react";

export default function StorePage() {
  const { session } = useAuth();
  const homeId = session?.selectedHomeId ?? null;
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<Product[]>(STORE_PRODUCTS);
  const [categories, setCategories] =
    useState<{ id: string; label: string }[]>(STORE_CATEGORIES);

  // Load this building's kiosk catalog; fall back to the local sample if the
  // API is unreachable so the page still renders something to browse.
  useEffect(() => {
    if (!homeId) return;
    let alive = true;
    void commerceService.getMarketplace(homeId).then((res) => {
      if (!alive || !res.success || !res.data) return;
      if (res.data.products.length > 0) {
        setProducts(res.data.products);
        setCategories(res.data.categories);
        setCat("all");
      }
    });
    return () => {
      alive = false;
    };
  }, [homeId]);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (cat === "all" || p.category === cat) &&
          (!q || p.name.toLowerCase().includes(q.toLowerCase()))
      ),
    [products, cat, q]
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Warung Rumah</h1>
          <p className="text-sm text-muted">
            Galon, sembako, makanan &amp; kebutuhan harian.
          </p>
        </div>
        <CartButton />
      </div>

      {/* Seamless local delivery banner */}
      <div className="flex items-center gap-3 rounded-lg border border-secondary/20 bg-secondary/5 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
          <Bike className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-secondary" />
            Diantar dari kios lantai bawah
          </p>
          <p className="text-xs text-muted">
            Kerja sama dengan warung &amp; kios di gedungmu — pesan, antar, beres.
          </p>
        </div>
      </div>

      <Search
        placeholder="Cari galon, beras, odol..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95",
              cat === c.id
                ? "bg-secondary text-secondary-foreground shadow-card"
                : "bg-surface border border-border text-muted hover:border-secondary/40"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Barang tidak ditemukan"
          description="Coba kata kunci atau kategori lain."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
