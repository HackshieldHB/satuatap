import { cn } from "@/lib/utils";
import { Leaf, Zap, Users } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const lightVars = {
  "--color-background": "248 247 242",
  "--color-surface": "252 252 249",
  "--color-foreground": "38 59 57",
  "--color-muted": "107 123 120",
  "--color-border": "216 226 222",
  colorScheme: "light",
  background:
    "radial-gradient(50rem 38rem at 100% 0%, #e6f1ea 0%, transparent 58%), radial-gradient(46rem 38rem at 0% 100%, #edf5f1 0%, transparent 58%), #fcfcf9",
} as React.CSSProperties;

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#16302E] lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* LEFT — immersive warm residential hero (desktop only) */}
      <aside className="relative hidden overflow-hidden lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/03-living-room-portrait.png')" }}
          aria-hidden
        />
        {/* warm gradient overlay for readable text */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(16,40,38,0.4) 0%, rgba(16,40,38,0.1) 34%, rgba(18,52,49,0.8) 100%)",
          }}
          aria-hidden
        />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white xl:p-14">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Leaf className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight">SATU ATAP</p>
              <p className="text-[11px] font-medium text-white/75">Smart Living Ecosystem</p>
            </div>
          </div>

          <div className="space-y-5">
            <h2 className="text-3xl font-bold leading-[1.15] drop-shadow-sm xl:text-[2.15rem]">
              Hunian yang Lebih Baik,
              <br />
              Dimulai dari Kita.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-white/85">
              Kelola perangkat IoT, listrik, air, dan komunitas hunianmu — hemat,
              aman, dan terhubung dalam satu aplikasi.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { icon: Leaf, label: "IoT terintegrasi" },
                { icon: Zap, label: "Hemat energi" },
                { icon: Users, label: "Komunitas hunian" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT — clean form panel (forced light so it never goes dark) */}
      <main
        className={cn(
          "relative flex min-h-screen flex-col items-center justify-center px-4 py-10 text-foreground sm:px-6",
          className
        )}
        style={lightVars}
      >
        {/* mobile-only warm accent bar */}
        <div
          className="absolute inset-x-0 top-0 h-1.5 lg:hidden"
          style={{ background: "linear-gradient(90deg,#1F5F5B,#4F9690,#A8C9BE)" }}
          aria-hidden
        />
        {children}
      </main>
    </div>
  );
}
