"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { useNotifications } from "@/hooks/useNotifications";
import { Siren, Phone, ShieldAlert, CheckCircle2 } from "lucide-react";

export function SosButton() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const { showToast } = useToast();
  const { addNotification } = useNotifications();

  const trigger = () => {
    setSent(true);
    addNotification({
      category: "alert",
      title: "SOS terkirim 🚨",
      message:
        "Security gedung & kontak daruratmu telah diberi tahu lokasimu (Tower A / Lt.12 / 08).",
      icon: "shield",
    });
    showToast("SOS terkirim ke security & keluarga.", "success");
    setTimeout(() => {
      setOpen(false);
      setSent(false);
    }, 2400);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Tombol darurat SOS"
        className="fixed left-4 bottom-24 lg:bottom-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-error text-white shadow-floating transition-transform active:scale-95 hover:scale-105"
      >
        <Siren className="h-6 w-6" />
      </button>

      <BottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        title={sent ? undefined : "Darurat"}
      >
        {sent ? (
          <div className="text-center space-y-3 py-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-9 w-9 text-success" />
            </div>
            <h2 className="text-lg font-bold">SOS Terkirim</h2>
            <p className="text-sm text-muted">
              Security gedung & kontak daruratmu sedang menuju lokasimu.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error/10 animate-pulse">
              <ShieldAlert className="h-9 w-9 text-error" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Kirim SOS?</h2>
              <p className="text-sm text-muted">
                Security gedung & kontak daruratmu akan langsung diberi tahu
                lokasimu.
              </p>
            </div>
            <Button variant="danger" className="w-full" onClick={trigger}>
              Kirim SOS Sekarang
            </Button>
            <a
              href="tel:112"
              className="flex items-center justify-center gap-2 text-sm text-muted hover:text-foreground"
            >
              <Phone className="h-4 w-4" />
              atau telepon 112
            </a>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
