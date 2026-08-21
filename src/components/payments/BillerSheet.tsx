"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCheckout } from "@/hooks/useCheckout";
import { formatCurrency, cn } from "@/lib/utils";
import type { Biller } from "@/types";

export function BillerSheet({
  biller,
  onClose,
  onSuccess,
}: {
  biller: Biller | null;
  onClose: () => void;
  onSuccess?: (biller: Biller, amount: number) => void;
}) {
  return (
    <BottomSheet isOpen={!!biller} onClose={onClose} title={biller?.label}>
      {biller && (
        <BillerForm
          key={biller.id}
          biller={biller}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </BottomSheet>
  );
}

function BillerForm({
  biller,
  onClose,
  onSuccess,
}: {
  biller: Biller;
  onClose: () => void;
  onSuccess?: (biller: Biller, amount: number) => void;
}) {
  const { openCheckout } = useCheckout();
  const [id, setId] = useState(biller.defaultId);
  const [sel, setSel] = useState<number | null>(
    biller.nominals.length === 1 ? 0 : null
  );

  const nominal = sel != null ? biller.nominals[sel] : null;
  const isBill = biller.nominals.length === 1 && biller.nominals[0].value;

  const pay = () => {
    if (!nominal) return;
    const order = {
      title: biller.label,
      subtitle: id,
      kind: "topup" as const,
      items: [
        {
          id: biller.id,
          name: biller.label + (nominal.value ? ` · ${nominal.value}` : ""),
          price: nominal.amount,
          qty: 1,
          meta: id,
        },
      ],
      fee: biller.adminFee,
      feeLabel: "Biaya admin",
      successNote:
        biller.id === "token-listrik"
          ? `Token ${nominal.value} masuk ke meter ${id}.`
          : undefined,
    };
    onClose();
    openCheckout(order, () => onSuccess?.(biller, nominal.amount));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted">{biller.idLabel}</label>
        <Input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder={biller.idPlaceholder}
          className="mt-1"
        />
      </div>

      {!isBill && (
        <div>
          <p className="text-xs font-medium text-muted mb-2">Pilih Nominal</p>
          <div className="grid grid-cols-2 gap-2">
            {biller.nominals.map((n, i) => {
              const active = sel === i;
              return (
                <button
                  key={i}
                  onClick={() => setSel(i)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <p className="text-sm font-bold">{formatCurrency(n.amount)}</p>
                  {n.value && (
                    <p className="text-[11px] text-muted mt-0.5">{n.value}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isBill && nominal && (
        <div className="rounded-lg bg-background p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Total Tagihan</p>
            {nominal.value && (
              <p className="text-xs text-muted">{nominal.value}</p>
            )}
          </div>
          <p className="text-lg font-bold">{formatCurrency(nominal.amount)}</p>
        </div>
      )}

      <Button className="w-full" onClick={pay} disabled={!nominal || !id.trim()}>
        {nominal ? `Lanjut Bayar ${formatCurrency(nominal.amount)}` : "Pilih nominal"}
      </Button>
    </div>
  );
}
