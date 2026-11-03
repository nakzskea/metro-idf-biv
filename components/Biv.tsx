import type { CSSProperties, ReactNode } from "react";
import styles from "./Biv.module.css";

export type Passage = {
  line: string;
  mode: "metro" | "tram";
  color: string;
  textColor: string;
  direction: string;
  next: number[]; // minutes avant les 2 prochains passages
};

function Picto({ p }: { p: Passage }) {
  if (p.mode === "tram")
    return <span className={styles.tram} style={{ borderColor: p.color }}>{p.line}</span>;
  return <span className={styles.metro} style={{ background: p.color, color: p.textColor }}>{p.line}</span>;
}

function Time({ label, min }: { label: ReactNode; min?: number }) {
  return (
    <div className={styles.col}>
      <span className={styles.label}>{label}</span>
      {min === undefined ? (
        <span className={styles.big}>--</span>
      ) : min <= 0 ? (
        <span className={styles.quai}>À quai</span>
      ) : (
        <span className={styles.big}>{min}<small>min</small></span>
      )}
    </div>
  );
}

export default function Biv({ p }: { p: Passage }) {
  const v = p.mode === "tram" ? "tram" : "métro";
  return (
    <section className={styles.biv} style={{ "--line": p.color } as CSSProperties}>
      <header className={styles.head}>
        <Picto p={p} />
        {p.direction}
      </header>
      <div className={styles.body}>
        <Time label={<>1<sup>er</sup> {v}</>} min={p.next[0]} />
        <Time label={<>2<sup>e</sup> {v}</>} min={p.next[1]} />
      </div>
    </section>
  );
}
