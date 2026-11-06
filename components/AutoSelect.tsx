"use client";
import type { ComponentProps } from "react";

// <select> qui soumet son formulaire dès qu'on change la valeur
export default function AutoSelect(props: ComponentProps<"select">) {
  return (
    <select
      {...props}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      style={{ font: "inherit", fontSize: 18, padding: 10, borderRadius: 10, border: "1px solid #aab", width: "100%", minWidth: 0, }}
    />
  );
}
