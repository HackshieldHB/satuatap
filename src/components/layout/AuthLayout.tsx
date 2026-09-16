import { cn } from "@/lib/utils";
import { Leaf, Zap, Users } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const lightVars = {
  "--color-background": "245 239 231",
  "--color-surface": "251 248 243",
  "--color-foreground": "51 47 40",
  "--color-muted": "138 129 117",
  "--color-border": "231 224 214",
  colorScheme: "light",
  background:
    "radial-gradient(50rem 38rem at 100% 0%, #f4ece1 0%, transparent 58%), radial-gradient(46rem 38rem at 0% 100%, #eef0ec 0%, transparent 58%), #fbf8f3",
} as React.CSSProperties;

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#2E2822] lg:grid lg:grid-cols-[1.05fr_1fr]">
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
              "linear-gradient(180deg, rgba(46,40,34,0.42) 0%, rgba(46,40,34,0.12) 34%, rgba(38,32,26,0.78) 100%)",
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
          style={{ background: "linear-gradient(90deg,#7E6C57,#C9A87F,#E4B48C)" }}
          aria-hidden
        />
        {children}
      </main>
    </div>
  );
}
