import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#2b1424", color: "#e3cc2b", fontSize: 130, fontWeight: 700,
      }}
    >
      M
    </div>,
    size,
  );
}