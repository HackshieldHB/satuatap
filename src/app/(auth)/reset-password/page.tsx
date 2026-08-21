"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { authService } from "@/services/auth.service";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!password) newErrors.password = "Kata sandi wajib diisi.";
    else if (password.length < 8) newErrors.password = "Kata sandi minimal 8 karakter.";
    if (password !== confirmPassword)
      newErrors.confirmPassword = "Kata sandi tidak cocok.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    const result = await authService.resetPassword(password);
    setIsLoading(false);

    if (!result.success) {
      setErrors({ form: result.error || "Gagal memperbarui kata sandi." });
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center">
          <Logo size="lg" className="items-center" />
        </div>
        <Card padding="lg" className="shadow-floating text-center space-y-4">
          <div className="text-4xl" aria-hidden>✅</div>
          <h1 className="text-xl font-bold">Kata sandi berhasil diperbarui</h1>
          <p className="text-sm text-muted">
            Kata sandimu telah diperbarui. Silakan masuk dengan kata sandi baru.
          </p>
          <Link href="/login">
            <Button className="w-full">Kembali ke Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6 animate-fade-in">
      <div className="text-center">
        <Logo size="lg" className="items-center" />
      </div>

      <Card padding="lg" className="shadow-floating">
        <div className="space-y-1 mb-6">
          <h1 className="text-xl font-bold">Buat kata sandi baru</h1>
          <p className="text-sm text-muted">Masukkan kata sandi baru untuk akunmu.</p>
        </div>

        {errors.form && <Alert variant="error" message={errors.form} className="mb-4" />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Kata Sandi Baru"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            placeholder="Minimal 8 karakter"
          />
          <Input
            label="Konfirmasi Kata Sandi"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Perbarui Kata Sandi
          </Button>
        </form>
      </Card>
    </div>
  );
}
