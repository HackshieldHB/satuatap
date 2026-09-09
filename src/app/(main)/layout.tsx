import { AppShell } from "@/components/layout/AppShell";
import { AppGuard } from "@/components/layout/AuthGuard";
import { NotificationProvider } from "@/hooks/useNotifications";
import { CartProvider } from "@/hooks/useCart";
import { OrdersProvider } from "@/hooks/useOrders";
import { RewardsProvider } from "@/hooks/useRewards";
import { CheckoutProvider } from "@/hooks/useCheckout";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppGuard>
      <NotificationProvider>
        <CartProvider>
          <OrdersProvider>
            <RewardsProvider>
              <CheckoutProvider>
                <AppShell>{children}</AppShell>
              </CheckoutProvider>
            </RewardsProvider>
          </OrdersProvider>
        </CartProvider>
      </NotificationProvider>
    </AppGuard>
  );
}
