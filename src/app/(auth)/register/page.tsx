"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Alert } from "@/components/ui/Alert";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { authService } from "@/services/auth.service";
import { isValidEmail, isValidPhone } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.fullName) newErrors.fullName = "Nama lengkap wajib diisi.";
    if (!form.email) newErrors.email = "Email wajib diisi.";
    else if (!isValidEmail(form.email)) newErrors.email = "Format email tidak valid.";
    if (!form.phone) newErrors.phone = "Nomor telepon wajib diisi.";
    else if (!isValidPhone(form.phone)) newErrors.phone = "Format nomor telepon tidak valid.";
    if (!form.password) newErrors.password = "Kata sandi wajib diisi.";
    else if (form.password.length < 8) newErrors.password = "Kata sandi minimal 8 karakter.";
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Kata sandi tidak cocok.";
    if (!form.terms) newErrors.terms = "Kamu harus menyetujui syarat & ketentuan.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    const result = await authService.register(form);
    setIsLoading(false);

    if (!result.success) {
      setErrors({ form: result.error || "Gagal mendaftar." });
      return;
    }

    router.push("/otp?flow=register");
  };

  return (
    <AuthGuard>
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center">
          <Logo size="lg" className="items-center" />
        </div>

        <Card padding="lg" className="shadow-floating">
          <div className="space-y-1 mb-6">
            <h1 className="text-xl font-bold">Buat akun SATU ATAP</h1>
            <p className="text-sm text-muted">Mulai kelola rumah pintarmu.</p>
          </div>

          {errors.form && <Alert variant="error" message={errors.form} className="mb-4" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nama Lengkap"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              error={errors.fullName}
              placeholder="Kevin Santoso"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              error={errors.email}
              placeholder="nama@email.com"
            />
            <Input
              label="Nomor Telepon"
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              error={errors.phone}
              placeholder="081234567890"
            />
            <Input
              label="Kata Sandi"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              error={errors.password}
              placeholder="Minimal 8 karakter"
            />
            <Input
              label="Konfirmasi Kata Sandi"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              error={errors.confirmPassword}
            />
            <Checkbox
              label="Saya setuju dengan Syarat & Ketentuan SATU ATAP"
              checked={form.terms}
              onChange={(e) => update("terms", e.target.checked)}
            />
            {errors.terms && <p className="text-xs text-error">{errors.terms}</p>}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Buat Akun
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </AuthGuard>
  );
}
