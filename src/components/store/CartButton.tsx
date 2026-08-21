"use client";

import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { ShoppingCart } from "lucide-react";

export function CartButton() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:border-primary/40 transition-colors"
      aria-label="Keranjang"
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
