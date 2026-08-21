"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import { Plus, Star, MapPin, Clock } from "lucide-react";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { showToast } = useToast();

  const onAdd = () => {
    add(product);
    showToast(`${product.name} masuk keranjang`, "success");
  };

  return (
    <Card
      padding="sm"
      className="flex flex-col group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-floating"
    >
      <div className="flex h-24 items-center justify-center rounded-lg bg-background text-4xl mb-2 transition-transform duration-300 group-hover:scale-105">
        <span aria-hidden>{product.emoji}</span>
      </div>
      <p className="text-sm font-semibold leading-tight line-clamp-2">
        {product.name}
      </p>

      {product.kind === "goods" ? (
        <div className="mt-1 space-y-0.5">
          <p className="text-[11px] text-muted flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{product.vendor}</span>
          </p>
          <p className="text-[11px] text-muted flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            {product.eta} · {product.unit}
          </p>
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-muted flex items-center gap-1">
          <Star className="h-3 w-3 text-accent fill-accent" />
          {product.rating} · {product.sold} terjual
        </p>
      )}

      <div className="mt-auto pt-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-primary">
          {formatCurrency(product.price)}
        </p>
        <Button
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onAdd}
          aria-label={`Tambah ${product.name}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
