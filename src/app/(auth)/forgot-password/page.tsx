"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { authService } from "@/services/auth.service";
import { isValidEmail, isValidPhone } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier) {
      setError("Email atau nomor telepon wajib diisi.");
      return;
    }

    const isEmail = identifier.includes("@");
    if (isEmail && !isValidEmail(identifier)) {
      setError("Format email tidak valid.");
      return;
    }
    if (!isEmail && !isValidPhone(identifier)) {
      setError("Format nomor telepon tidak valid.");
      return;
    }

    setIsLoading(true);
    setError("");
    const result = await authService.forgotPassword(identifier);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || "Gagal mengirim kode.");
      return;
    }

    setSent(true);
    setTimeout(() => router.push("/otp?flow=reset"), 1500);
  };

  return (
    <AuthGuard>
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center">
          <Logo size="lg" className="items-center" />
        </div>

        <Card padding="lg" className="shadow-floating">
          <div className="space-y-1 mb-6">
            <h1 className="text-xl font-bold">Lupa kata sandi?</h1>
            <p className="text-sm text-muted">
              Masukkan email atau nomor telepon untuk menerima kode verifikasi.
            </p>
          </div>

          {sent ? (
            <Alert
              variant="success"
              title="Kode terkirim"
              message="Periksa email atau SMS kamu untuk kode verifikasi."
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert variant="error" message={error} />}
              <Input
                label="Email / Nomor Telepon"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="nama@email.com atau 081234567890"
              />
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Kirim Kode Verifikasi
              </Button>
            </form>
          )}
        </Card>

        <p className="text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Kembali ke Login
          </Link>
        </p>
      </div>
    </AuthGuard>
  );
}
