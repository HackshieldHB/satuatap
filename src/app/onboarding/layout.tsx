import { AuthLayout } from "@/components/layout/AuthLayout";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}
