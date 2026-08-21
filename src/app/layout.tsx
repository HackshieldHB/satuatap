import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/hooks/useToast";
import { ThemeProvider } from "@/hooks/useTheme";
import { NotificationProvider } from "@/hooks/useNotifications";
import { CartProvider } from "@/hooks/useCart";
import { OrdersProvider } from "@/hooks/useOrders";
import { RewardsProvider } from "@/hooks/useRewards";
import { CheckoutProvider } from "@/hooks/useCheckout";
import { PWARegister } from "@/components/system/PWARegister";
import "./globals.css";

// Runs before hydration to set the theme class and avoid a flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('satu_atap_theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SATU ATAP — Rumahmu, Lebih Pintar",
  description:
    "Platform rumah pintar yang menghubungkan perangkat IoT, monitoring rumah, rekomendasi AI, pembayaran utilitas, dan layanan rumah.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SATU ATAP",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FF7A59",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <NotificationProvider>
                <CartProvider>
                  <OrdersProvider>
                    <RewardsProvider>
                      <CheckoutProvider>{children}</CheckoutProvider>
                    </RewardsProvider>
                  </OrdersProvider>
                </CartProvider>
              </NotificationProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
        <PWARegister />
      </body>
    </html>
  );
}
