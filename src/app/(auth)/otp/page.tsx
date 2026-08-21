"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { Alert } from "@/components/ui/Alert";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";

function OtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = searchParams.get("flow") || "register";
  const { refreshSession } = useAuth();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Masukkan 6 digit kode verifikasi.");
      return;
    }

    setIsLoading(true);
    setError("");

    if (flow === "reset") {
      setIsLoading(false);
      router.push("/reset-password");
      return;
    }

    const result = await authService.verifyOtp(otp);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || "Verifikasi gagal.");
      return;
    }

    refreshSession();
    router.push("/onboarding/welcome");
  };

  const handleResend = async () => {
    if (!canResend) return;
    await authService.resendOtp();
    setCountdown(60);
    setCanResend(false);
    setOtp("");
    setError("");
  };

  return (
    <div className="w-full max-w-md space-y-6 animate-fade-in">
      <div className="text-center">
        <Logo size="lg" className="items-center" />
      </div>

      <Card padding="lg" className="shadow-floating">
        <div className="space-y-1 mb-6 text-center">
          <h1 className="text-xl font-bold">Verifikasi akun</h1>
          <p className="text-sm text-muted">
            Kami mengirim kode verifikasi ke nomor teleponmu.
          </p>
        </div>

        {flow === "register" && (
          <Alert
            variant="info"
            message="Demo: gunakan kode 123456"
            className="mb-4"
          />
        )}

        <div className="space-y-6">
          <OtpInput
            value={otp}
            onChange={setOtp}
            error={error}
            disabled={isLoading}
          />

          <Button
            className="w-full"
            onClick={handleVerify}
            isLoading={isLoading}
            disabled={otp.length !== 6}
          >
            Verifikasi
          </Button>

          <div className="text-center text-sm text-muted">
            <p>Tidak menerima kode?</p>
            {canResend ? (
              <button
                onClick={handleResend}
                className="font-medium text-primary hover:underline mt-1"
              >
                Kirim Ulang
              </button>
            ) : (
              <p className="mt-1">Kirim ulang dalam {countdown}s</p>
            )}
          </div>
        </div>
      </Card>

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Kembali ke Login
        </Link>
      </p>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted">Memuat...</div>}>
      <OtpContent />
    </Suspense>
  );
}
