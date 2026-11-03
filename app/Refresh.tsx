"use client";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

export default function Refresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const refresh = () => start(() => router.refresh());

  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

    return (
    <div
      style={{
        position: "sticky", top: 0, zIndex: 10,
        margin: "-16px -16px 0", padding: "12px 16px",
        background: "#d9dde2cc", backdropFilter: "blur(8px)",
        display: "flex", justifyContent: "flex-end",
      }}
    >
      <button
        onClick={refresh}
        disabled={pending}
        style={{ font: "inherit", fontSize: 16, padding: "8px 14px", borderRadius: 10, border: "none", background: "#2b1424", color: "#e3cc2b" }}
      >
        {pending ? "…" : "↻ Actualiser"}
      </button>
    </div>
  );
}