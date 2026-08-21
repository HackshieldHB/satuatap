"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/ui/LoadingSpinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <PageLoader />;

  return <>{children}</>;
}

export function AppGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!session?.onboardingCompleted) {
      router.replace("/onboarding/welcome");
    }
  }, [isAuthenticated, isLoading, session, router]);

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated || !session?.onboardingCompleted) return <PageLoader />;

  return <>{children}</>;
}
