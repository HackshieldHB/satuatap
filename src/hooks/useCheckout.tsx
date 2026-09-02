"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { MockQr } from "@/components/payments/MockQr";
import { useToast } from "@/hooks/useToast";
import { useOrders } from "@/hooks/useOrders";
import { useRewards } from "@/hooks/useRewards";
import { useAuth } from "@/hooks/useAuth";
import { commerceService } from "@/services/commerce.service";
import { PROMOS } from "@/data/mock";
import { formatCurrency, delay, cn } from "@/lib/utils";
import {
  QrCode,
  Building2,
  Landmark,
  CreditCard,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  Ticket,
  Gift,
  type LucideIcon,
} from "lucide-react";
import type { CheckoutOrder, PaymentChannel, Promo } from "@/types";

interface CheckoutContextValue {
  openCheckout: (order: CheckoutOrder, onSuccess?: () => void) => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

const METHODS: { id: PaymentChannel; label: string; icon: LucideIcon }[] = [
  { id: "qris", label: "QRIS", icon: QrCode },
  { id: "cash", label: "Tunai (COD)", icon: Wallet },
  { id: "virtual_account", label: "Virtual Account", icon: Building2 },
  { id: "bank_transfer", label: "Transfer Bank", icon: Landmark },
  { id: "credit_card", label: "Kartu Kredit", icon: CreditCard },
];

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const { refresh: refreshOrders } = useOrders();
  const { addPoints } = useRewards();
  const { session } = useAuth();
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [method, setMethod] = useState<PaymentChannel>("qris");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoErr, setPromoErr] = useState("");
  const successRef = useRef<(() => void) | null>(null);

  const openCheckout = useCallback(
    (o: CheckoutOrder, onSuccess?: () => void) => {
      successRef.current = onSuccess ?? null;
      setOrder(o);
      setMethod("qris");
      setPaid(false);
      setPaying(false);
      setPromoInput("");
      setPromo(null);
      setPromoErr("");
    },
    []
  );

  const close = useCallback(() => setOrder(null), []);

  const subtotal = order
    ? order.items.reduce((s, i) => s + i.price * i.qty, 0)
    : 0;
  const fee = order?.fee ?? 0;
  const discount = promo
    ? promo.type === "percent"
      ? Math.min(
          Math.round((subtotal * promo.value) / 100),
          promo.maxDiscount ?? Number.MAX_SAFE_INTEGER
        )
      : promo.value
    : 0;
  const total = Math.max(0, subtotal + fee - discount);
  const pointsEarned = Math.max(1, Math.round(total / 1000));

  const applyPromo = () => {
    const found = PROMOS.find(
      (p) => p.code === promoInput.trim().toUpperCase()
    );
    if (found) {
      setPromo(found);
      setPromoErr("");
    } else {
      setPromo(null);
      setPromoErr("Kode promo tidak valid.");
    }
  };

  const handlePay = async () => {
    setPaying(true);
    await delay(1600);
    setPaying(false);
    setPaid(true);
    successRef.current?.();
    addPoints(pointsEarned);
    const homeId = session?.selectedHomeId;
    if (order && homeId && (order.kind === "marketplace" || order.kind === "service")) {
      // Route the cart to the kiosk(s) it came from — one order per vendor.
      const groups = new Map<string, { productId: string; qty: number }[]>();
      for (const it of order.items) {
        if (!it.vendorId) continue;
        const arr = groups.get(it.vendorId) ?? [];
        arr.push({ productId: it.id, qty: it.qty });
        groups.set(it.vendorId, arr);
      }
      for (const [vendorId, items] of groups) {
        await commerceService.createOrder(homeId, {
          vendorId,
          items,
          paymentChannel: method,
          note: order.subtitle,
        });
      }
      if (groups.size > 0) await refreshOrders();
    }
    showToast(`Pembayaran berhasil · +${pointsEarned} poin`, "success");
    setTimeout(() => setOrder(null), 2000);
  };

  return (
    <CheckoutContext.Provider value={{ openCheckout }}>
      {children}
      <BottomSheet
        isOpen={!!order}
        onClose={close}
        title={paid ? undefined : "Pembayaran"}
      >
        {order &&
          (paid ? (
            <div className="text-center space-y-4 py-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-9 w-9 text-success" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold">Pembayaran Berhasil</h2>
                <p className="text-sm text-muted">
                  {formatCurrency(total)} untuk {order.title} telah dibayar via{" "}
                  {METHODS.find((m) => m.id === method)?.label}.
                </p>
              </div>
              {order.successNote && (
                <p className="text-xs font-medium text-secondary">
                  {order.successNote}
                </p>
              )}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                <Gift className="h-3.5 w-3.5" />+{pointsEarned} poin
              </div>
              {(order.kind === "marketplace" || order.kind === "service") && (
                <p className="text-xs text-muted">
                  Lacak pesananmu di menu <b>Pesanan</b>.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Order summary */}
              <div className="rounded-lg bg-background p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{order.title}</p>
                  {order.subtitle && (
                    <span className="text-xs text-muted">{order.subtitle}</span>
                  )}
                </div>
                <div className="space-y-1">
                  {order.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between text-xs text-muted"
                    >
                      <span className="truncate pr-2">
                        {it.emoji ? `${it.emoji} ` : ""}
                        {it.name}
                        {it.qty > 1 ? ` ×${it.qty}` : ""}
                        {it.meta ? ` · ${it.meta}` : ""}
                      </span>
                      <span className="shrink-0">
                        {formatCurrency(it.price * it.qty)}
                      </span>
                    </div>
                  ))}
                  {fee > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{order.feeLabel ?? "Biaya admin"}</span>
                      <span>{formatCurrency(fee)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex items-center justify-between text-xs text-success">
                      <span>Promo {promo?.code}</span>
                      <span>−{formatCurrency(discount)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(total)}
                  </span>
                </div>
                <p className="flex items-center gap-1 text-[11px] text-secondary">
                  <Gift className="h-3 w-3" />
                  Dapat +{pointsEarned} poin dari transaksi ini
                </p>
              </div>

              {/* Promo code */}
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Kode promo (mis. HEMAT10)"
                      className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm uppercase placeholder:normal-case placeholder:text-muted focus:border-primary focus:outline-none"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={applyPromo}
                    className="h-10 px-4"
                  >
                    Pakai
                  </Button>
                </div>
                {promoErr && (
                  <p className="mt-1 text-xs text-error">{promoErr}</p>
                )}
                {promo && (
                  <p className="mt-1 text-xs text-success">
                    {promo.label} diterapkan 🎉
                  </p>
                )}
              </div>

              {/* Payment method picker */}
              <div>
                <p className="text-xs font-medium text-muted mb-2">
                  Metode Pembayaran
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {METHODS.map((m) => {
                    const Icon = m.icon;
                    const active = method === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMethod(m.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all",
                          active
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted hover:border-primary/40"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Method detail */}
              <MethodDetail method={method} order={order} total={total} />

              <Button className="w-full" onClick={handlePay} isLoading={paying}>
                Bayar {formatCurrency(total)}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="h-3.5 w-3.5" />
                Pembayaran simulasi — tidak ada transaksi nyata.
              </p>
            </div>
          ))}
      </BottomSheet>
    </CheckoutContext.Provider>
  );
}

function MethodDetail({
  method,
  order,
  total,
}: {
  method: PaymentChannel;
  order: CheckoutOrder;
  total: number;
}) {
  if (method === "qris") {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-xl border border-border bg-white p-3">
          <MockQr seed={`${order.title}-${total}`} className="h-44 w-44" />
        </div>
        <p className="text-xs text-muted text-center">
          Pindai dengan aplikasi e-wallet atau m-banking apa pun.
        </p>
      </div>
    );
  }
  if (method === "virtual_account") {
    return (
      <InfoBox
        rows={[
          ["Bank", "BCA Virtual Account"],
          ["Nomor VA", "8808 0812 3456 7890"],
          ["Atas Nama", "SATU ATAP"],
        ]}
        note="Bayar sebelum 24 jam. VA otomatis terverifikasi."
      />
    );
  }
  if (method === "bank_transfer") {
    return (
      <InfoBox
        rows={[
          ["Bank", "BCA"],
          ["No. Rekening", "088 6543 210"],
          ["Atas Nama", "PT Satu Atap Indonesia"],
        ]}
        note="Transfer tepat sampai 3 digit terakhir untuk verifikasi cepat."
      />
    );
  }
  if (method === "cash") {
    return (
      <InfoBox
        rows={[
          ["Bayar", "Tunai saat barang diantar"],
          ["Total disiapkan", formatCurrency(total)],
        ]}
        note="Pengantar dari kios lantai bawah menagih tunai saat sampai di unitmu."
      />
    );
  }
  return (
    <InfoBox
      rows={[
        ["Kartu", "Visa •••• 4471"],
        ["Pemegang", "KEVIN SANTOSO"],
      ]}
      note="Menggunakan kartu tersimpan. Tidak perlu memasukkan data kartu."
    />
  );
}

function InfoBox({
  rows,
  note,
}: {
  rows: [string, string][];
  note: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between text-sm">
          <span className="text-muted">{k}</span>
          <span className="font-medium">{v}</span>
        </div>
      ))}
      <p className="text-[11px] text-muted pt-1">{note}</p>
    </div>
  );
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
}
