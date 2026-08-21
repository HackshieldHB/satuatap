"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#F8FAFC",
          color: "#1F2937",
        }}
      >
        <div style={{ textAlign: "center", padding: 24, maxWidth: 360 }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>
            Terjadi kesalahan
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 8 }}>
            Muat ulang aplikasi untuk melanjutkan.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 24,
              height: 44,
              padding: "0 20px",
              borderRadius: 12,
              border: "none",
              background: "#FF7A59",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
