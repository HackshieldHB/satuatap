import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center animate-fade-in">
      <p className="text-6xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        404
      </p>
      <h1 className="mt-2 text-lg font-bold">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Halaman yang kamu cari tidak ada atau sudah dipindahkan.
      </p>
      <Link href="/">
        <Button className="mt-6 gap-2">
          <Home className="h-4 w-4" />
          Ke Beranda
        </Button>
      </Link>
    </div>
  );
}
