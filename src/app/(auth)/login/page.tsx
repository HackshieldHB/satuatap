"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo, HomeIllustration } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Alert } from "@/components/ui/Alert";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { isValidEmail } from "@/lib/utils";

const REMEMBER_KEY = "satu_atap_remember_email";

export default function LoginPage() {
  const router = useRouter();
  const { login, refreshSession } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  // Restore a remembered email on mount.
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email) newErrors.email = "Email wajib diisi.";
    else if (!isValidEmail(email)) newErrors.email = "Format email tidak valid.";
    if (!password) newErrors.password = "Kata sandi wajib diisi.";
    else if (password.length < 8) newErrors.password = "Kata sandi minimal 8 karakter.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    const result = await login({ email, password });
    setIsLoading(false);

    if (!result.success) {
      setErrors({ form: result.error });
      return;
    }

    // Persist or clear the remembered email.
    if (remember) localStorage.setItem(REMEMBER_KEY, email);
    else localStorage.removeItem(REMEMBER_KEY);

    setIsSuccess(true);
    refreshSession();
    setTimeout(() => {
      if (result.data?.onboardingCompleted) {
        router.push("/");
      } else {
        router.push("/onboarding/welcome");
      }
    }, 600);
  };

  return (
    <AuthGuard>
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-4">
          <Logo size="lg" showTagline className="items-center" />
          <HomeIllustration className="mx-auto" />
        </div>

        <Card padding="lg" className="shadow-floating">
          <div className="space-y-1 mb-6">
            <h1 className="text-xl font-bold">Selamat datang kembali 👋</h1>
            <p className="text-sm text-muted">Masuk untuk mengelola rumahmu.</p>
          </div>

          {errors.form && (
            <Alert variant="error" message={errors.form} className="mb-4" />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email / Nomor Telepon"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Kata Sandi"
              type="password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <Checkbox
                label="Ingat saya"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Lupa Kata Sandi?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              isSuccess={isSuccess}
            >
              Masuk
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-2 text-muted">atau</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              showToast(
                "Login dengan Google akan tersedia di fase berikutnya.",
                "info"
              )
            }
          >
            Lanjutkan dengan Google
          </Button>
        </Card>

        <p className="text-center text-sm text-muted">
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Buat Akun
          </Link>
        </p>
      </div>
    </AuthGuard>
  );
}
