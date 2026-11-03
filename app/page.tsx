import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { cookies } from "next/headers";
import { cacheLife } from "next/cache";
import { Fira_Sans } from "next/font/google";
import Biv, { type Passage } from "./Biv";
import Refresh from "./Refresh";
import AutoSelect from "./AutoSelect";
import { connection } from "next/server";

const fira = Fira_Sans({ subsets: ["latin"], weight: ["500", "600"] });
const ODS = "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets";

type Line = { id: string; name: string; mode: "metro" | "tram"; color: string; textColor: string };
type Stop = { name: string; ids: string[] };

const label = (l: Line) => `${l.mode === "metro" ? "Métro" : "Tram"} ${l.name}`;
const href = (l: Line, s: Stop) => `/?line=${l.id}&stop=${encodeURIComponent(s.name)}`;

// Référentiel des lignes (open data, rafraîchi 1x/jour)
async function getLines(): Promise<Line[]> {
  "use cache";
  cacheLife("days");
  const q = new URLSearchParams({
    where: 'transportmode="metro" or transportmode="tram"',
    select: "id_line,shortname_line,transportmode,colourweb_hexa,textcolourweb_hexa",
  });
  const rows: any[] = await (await fetch(`${ODS}/referentiel-des-lignes/exports/json?${q}`)).json();
  return rows
    .map((r) => ({
      id: r.id_line,
      name: r.shortname_line,
      mode: r.transportmode,
      color: "#" + r.colourweb_hexa,
      textColor: "#" + r.textcolourweb_hexa,
    }))
    .sort((a, b) => a.mode.localeCompare(b.mode) || a.name.localeCompare(b.name, "fr", { numeric: true }));
}

// Arrêts d'une ligne, regroupés par nom (une station peut avoir plusieurs quais)
async function getStops(lineId: string): Promise<Stop[]> {
  "use cache";
  cacheLife("days");
  const q = new URLSearchParams({ where: `id="IDFM:${lineId}"`, select: "stop_id,stop_name" });
  const rows: any[] = await (await fetch(`${ODS}/arrets-lignes/exports/json?${q}`)).json();
  const byName = new Map<string, string[]>();
  for (const r of rows) byName.set(r.stop_name, [...(byName.get(r.stop_name) ?? []), r.stop_id.replace("IDFM:", "")]);
  return [...byName].map(([name, ids]) => ({ name, ids })).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

// Temps réel PRIM : une BIV par destination
async function getBoards(line: Line, ids: string[]): Promise<Passage[]> {
  await connection();
  const visits = (
    await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(
          `https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=STIF:StopPoint:Q:${id}:&LineRef=STIF:Line::${line.id}:`,
          { headers: { apikey: process.env.PRIM_API_KEY! }, cache: "no-store" },
        );
        if (!res.ok) return [];
        return (await res.json()).Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit ?? [];
      }),
    )
  ).flat();

  const now = Date.now();
  const byDest = new Map<string, number[]>();
  for (const v of visits) {
    const j = v.MonitoredVehicleJourney;
    const dest = j.DestinationName?.[0]?.value ?? "?";
    const min = Math.floor((Date.parse(j.MonitoredCall.ExpectedDepartureTime ?? j.MonitoredCall.ExpectedArrivalTime) - now) / 60000);
    if (min >= 0) byDest.set(dest, [...(byDest.get(dest) ?? []), min]);
  }

  return [...byDest]
    .sort(([a], [b]) => a.localeCompare(b, "fr"))
    .map(([direction, mins]) => ({
      line: line.name,
      mode: line.mode,
      color: line.color,
      textColor: line.textColor,
      direction,
      next: [...new Set(mins)].sort((a, b) => a - b).slice(0, 2),
    }));
}

// Favoris : cookie "favs" = ["C01379|Porte de Saint-Cloud", ...]
async function getFavs(): Promise<string[]> {
  try {
    return JSON.parse((await cookies()).get("favs")?.value ?? "[]");
  } catch {
    return [];
  }
}

async function toggleFav(key: string) {
  "use server";
  const favs = await getFavs();
  const next = favs.includes(key) ? favs.filter((f) => f !== key) : [...favs, key];
  (await cookies()).set("favs", JSON.stringify(next), { maxAge: 60 * 60 * 24 * 365, path: "/" });
}

async function Favorites({ lines, favs }: { lines: Line[]; favs: string[] }) {
  const sections = await Promise.all(
    favs.map(async (key) => {
      const [lineId, stopName] = key.split("|");
      const line = lines.find((l) => l.id === lineId);
      const stop = line && (await getStops(line.id)).find((s) => s.name === stopName);
      return line && stop ? { key, line, stop, boards: await getBoards(line, stop.ids) } : null;
    }),
  );

  if (!favs.length) return <p>Pas encore de favori : choisis une ligne et un arrêt, puis ☆.</p>;

  return sections.map(
    (s) =>
      s && (
        <section key={s.key} style={{ display: "grid", gap: 10 }}>
          <Link href={href(s.line, s.stop)} style={{ color: "#1f1a24", fontWeight: 600, fontSize: 18 }}>
            {label(s.line)} · {s.stop.name}
          </Link>
          {s.boards.map((p) => <Biv key={p.direction} p={p} />)}
        </section>
      ),
  );
}

type Params = Promise<{ line?: string; stop?: string }>;

const btn = {
  font: "inherit",
  fontSize: 16,
  padding: "8px 14px",
  borderRadius: 10,
  border: "none",
  background: "#2b1424",
  color: "#e3cc2b",
  textDecoration: "none",
} as const;

async function Content({ searchParams }: { searchParams: Params }) {
  const { line: lineId, stop } = await searchParams;
  const [lines, favs] = await Promise.all([getLines(), getFavs()]);
  const line = lines.find((l) => l.id === lineId);
  const stops = line ? await getStops(line.id) : [];
  const current = stops.find((s) => s.name === stop);
  const key = line && current ? `${line.id}|${current.name}` : null;
  const boards = line && current ? await getBoards(line, current.ids) : [];

  return (
    <>
      <Form action="/" style={{ display: "grid", gap: 8 }}>
        <AutoSelect key={line?.id ?? "none"} name="line" defaultValue={line?.id ?? ""}>
          <option value="" disabled>Choisir une ligne</option>
          {lines.map((l) => <option key={l.id} value={l.id}>{label(l)}</option>)}
        </AutoSelect>
        {line && (
          <AutoSelect key={"stop" + line.id + (current?.name ?? "")} name="stop" defaultValue={current?.name ?? ""}>
            <option value="" disabled>Choisir un arrêt</option>
            {stops.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </AutoSelect>
        )}
      </Form>

      {line ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Link href="/" style={btn}>← Favoris</Link>
            {key && (
              <form action={toggleFav.bind(null, key)}>
                <button style={btn}>{favs.includes(key) ? "★ Retirer" : "☆ Favori"}</button>
              </form>
            )}
          </div>
          {boards.map((p) => <Biv key={p.direction} p={p} />)}
          {current && boards.length === 0 && <p>Aucun passage annoncé.</p>}
        </>
      ) : (
        <Favorites lines={lines} favs={favs} />
      )}
    </>
  );
}

export default function Home({ searchParams }: { searchParams: Params }) {
  return (
    <main
      className={fira.className}
      style={{ display: "grid", gap: 16, padding: 16, minHeight: "100dvh", background: "#d9dde2", alignContent: "start" }}
    >
      <Refresh />
      <Suspense>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
