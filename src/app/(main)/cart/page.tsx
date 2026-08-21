"use client";

import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { useCheckout } from "@/hooks/useCheckout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { STORE_DELIVERY_FEE } from "@/data/mock";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";

export default function CartPage() {
  const { lines, subtotal, count, setQty, remove, clear } = useCart();
  const { openCheckout } = useCheckout();

  const hasGoods = lines.some((l) => l.product.kind === "goods");
  const fee = lines.length ? STORE_DELIVERY_FEE : 0;
  const total = subtotal + fee;

  const checkout = () =>
    openCheckout(
      {
        title: "Keranjang Belanja",
        subtitle: `${count} item`,
        kind: hasGoods ? "service" : "marketplace",
        items: lines.map((l) => ({
          id: l.product.id,
          name: l.product.name,
          price: l.product.price,
          qty: l.qty,
          emoji: l.product.emoji,
          meta: l.product.vendor,
        })),
        fee,
        feeLabel: hasGoods ? "Ongkir" : "Ongkir kirim",
        successNote: hasGoods
          ? "Pesananmu diantar ±20 menit dari kios lantai bawah."
          : "Perangkat dikirim 1–3 hari kerja.",
      },
      () => clear()
    );

  if (lines.length === 0) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <h1 className="text-xl font-bold mb-4">Keranjang</h1>
        <EmptyState
          icon={ShoppingCart}
          title="Keranjangmu kosong"
          description="Yuk isi dengan perangkat pintar atau kebutuhan harian."
        />
        <div className="flex justify-center gap-2">
          <Link href="/marketplace">
            <Button variant="outline" size="sm">
              Marketplace
            </Button>
          </Link>
          <Link href="/store">
            <Button variant="outline" size="sm">
              Warung Rumah
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-xl font-bold">Keranjang ({count})</h1>

      <div className="space-y-3">
        {lines.map((l) => (
          <Card key={l.product.id} className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-background text-2xl">
              <span aria-hidden>{l.product.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight line-clamp-1">
                {l.product.name}
              </p>
              {l.product.vendor && (
                <p className="text-[11px] text-muted truncate">
                  {l.product.vendor}
                </p>
              )}
              <p className="text-sm font-bold text-primary mt-0.5">
                {formatCurrency(l.product.price)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                onClick={() => remove(l.product.id)}
                className="text-muted hover:text-error"
                aria-label="Hapus"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty(l.product.id, l.qty - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-background"
                  aria-label="Kurangi"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-medium">
                  {l.qty}
                </span>
                <button
                  onClick={() => setQty(l.product.id, l.qty + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-background"
                  aria-label="Tambah"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Ongkir</span>
          <span>{formatCurrency(fee)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-sm font-medium">Total</span>
          <span className="text-lg font-bold">{formatCurrency(total)}</span>
        </div>
      </Card>

      <Button className="w-full" onClick={checkout}>
        Checkout · {formatCurrency(total)}
      </Button>
    </div>
  );
}
