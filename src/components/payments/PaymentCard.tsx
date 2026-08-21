"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { useCheckout } from "@/hooks/useCheckout";
import { Zap, Droplets, Wifi, Receipt } from "lucide-react";
import type { Bill } from "@/types";

const billIcons = {
  electricity: Zap,
  water: Droplets,
  internet: Wifi,
  other: Receipt,
};

const billLabels = {
  electricity: "Listrik",
  water: "Air",
  internet: "Internet",
  other: "Lainnya",
};

interface PaymentCardProps {
  bill: Bill;
  onPaid?: (id: string) => void;
}

export function PaymentCard({ bill, onPaid }: PaymentCardProps) {
  const { openCheckout } = useCheckout();
  const Icon = billIcons[bill.type];
  const statusVariant =
    bill.status === "overdue"
      ? "error"
      : bill.status === "paid"
        ? "success"
        : "warning";

  const pay = () =>
    openCheckout(
      {
        title: `${billLabels[bill.type]} · ${bill.provider}`,
        subtitle: bill.period,
        kind: "bill",
        items: [
          {
            id: bill.id,
            name: `Tagihan ${billLabels[bill.type]}`,
            price: bill.amount,
            qty: 1,
            meta: bill.provider,
          },
        ],
        fee: 2500,
        feeLabel: "Biaya admin",
      },
      () => onPaid?.(bill.id)
    );

  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{billLabels[bill.type]}</p>
          <Badge variant={statusVariant}>
            {bill.status === "unpaid"
              ? "Belum bayar"
              : bill.status === "paid"
                ? "Lunas"
                : "Terlambat"}
          </Badge>
        </div>
        <p className="text-xs text-muted">
          {bill.provider} · {bill.period}
        </p>
        <p className="text-sm font-bold mt-1">{formatCurrency(bill.amount)}</p>
        <p className="text-xs text-muted">Jatuh tempo: {bill.dueDate}</p>
      </div>
      {bill.status !== "paid" && (
        <Button size="sm" onClick={pay}>
          Bayar
        </Button>
      )}
    </Card>
  );
}

interface BillListProps {
  bills: Bill[];
  onPaid?: (id: string) => void;
}

export function BillList({ bills, onPaid }: BillListProps) {
  if (bills.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-base font-semibold">Kamu sudah up to date 🎉</p>
        <p className="text-sm text-muted mt-1">
          Tidak ada tagihan yang perlu dibayar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bills.map((bill) => (
        <PaymentCard key={bill.id} bill={bill} onPaid={onPaid} />
      ))}
    </div>
  );
}
