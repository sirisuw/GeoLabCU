import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserRound, Phone, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms — Geo Labs" },
      { name: "description", content: "Browse laboratory and computer rooms available for reservation." },
    ],
  }),
  component: RoomsPage,
});

type EquipmentItem = { name: string; model?: string };

function collapseNumberedEquipment(equipment: EquipmentItem[]): EquipmentItem[] {
  if (!equipment.length) return equipment;

  const byPrefix = new Map<string, { num: number; model?: string }[]>();
  const prefixOrder: string[] = [];

  for (const item of equipment) {
    const match = item.name.match(/^(.*?)\s+(\d+)$/);
    if (!match) return equipment;
    const prefix = match[1].trim();
    const num = parseInt(match[2], 10);
    if (!byPrefix.has(prefix)) {
      byPrefix.set(prefix, []);
      prefixOrder.push(prefix);
    }
    byPrefix.get(prefix)!.push({ num, model: item.model });
  }

  const collapsed: EquipmentItem[] = [];
  for (const prefix of prefixOrder) {
    const items = byPrefix.get(prefix)!.sort((a, b) => a.num - b.num);
    let start = items[0].num;
    let prev = items[0].num;
    let startModel = items[0].model;

    const flush = (end: number, endModel?: string) => {
      const model = startModel || endModel;
      collapsed.push(
        start === end
          ? { name: `${prefix} ${start}`, model }
          : { name: `${prefix} ${start} - ${end}`, model }
      );
    };

    for (let i = 1; i < items.length; i++) {
      if (items[i].num !== prev + 1) {
        flush(prev, items[i - 1].model);
        start = items[i].num;
        startModel = items[i].model;
      }
      prev = items[i].num;
    }
    flush(prev, items[items.length - 1].model);
  }

  return collapsed;
}

type Room = {
  id: string;
  code: string;
  name_en: string;
  name_th: string;
  type: "lab" | "pc";
  capacity: number;
  description_en: string | null;
  description_th: string | null;
  location: string | null;
  head_of_lab: string | null;
  staff_in_charge: string | null;
  contact_phone: string | null;
  google_calendar_url: string | null;
  equipment: EquipmentItem[] | null;
  lab_head_ids: string[] | null;
};

type RoomHead = { room_id: string; advisor_id: string; name_th: string; name_en: string };

function floorOf(code: string): number {
  const m = code.match(/\d/);
  return m ? parseInt(m[0], 10) : 0;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function RoomsPage() {
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<"all" | "lab" | "pc">("all");

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("active", true)
        .order("code");
      if (error) throw error;
      return (data as unknown as Room[]);
    },
  });

  const { data: heads = [] } = useQuery({
    queryKey: ["room-heads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms_public_heads" as never)
        .select("room_id, advisor_id, name_th, name_en");
      if (error) throw error;
      return (data as unknown as RoomHead[]);
    },
  });

  const headsByRoom = heads.reduce<Record<string, RoomHead[]>>((acc, h) => {
    (acc[h.room_id] ||= []).push(h);
    return acc;
  }, {});

  const filtered = rooms.filter((r) => filter === "all" || r.type === filter);

  const grouped = useMemo(() => {
    const byFloor = new Map<number, Room[]>();
    for (const r of filtered) {
      const f = floorOf(r.code);
      if (!byFloor.has(f)) byFloor.set(f, []);
      byFloor.get(f)!.push(r);
    }
    return Array.from(byFloor.entries())
      .sort(([a], [b]) => a - b)
      .map(([floor, list]) => ({
        floor,
        rooms: list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
      }));
  }, [filtered]);

  return (
    <div className="container-page py-14">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">02 · Facilities</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">{t("rooms_title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("rooms_sub")}</p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-card p-1 text-sm font-medium">
          {(["all", "lab", "pc"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1.5 transition ${filter === f ? "bg-[color:var(--chula-pink)] text-white" : "text-foreground/70 hover:bg-secondary"}`}
            >
              {f === "all" ? t("rooms_filter_all") : f === "lab" ? t("rooms_filter_lab") : t("rooms_filter_pc")}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          —
        </div>
      ) : (
        <div className="space-y-16">
          {grouped.map(({ floor, rooms: floorRooms }) => (
            <section key={floor}>
              <div className="sticky top-16 z-10 -mx-4 mb-6 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-4">
                      <span className="font-display text-4xl font-bold leading-none md:text-5xl">
                        {lang === "th" ? `${t("floor_label")} ${floor}` : ordinal(floor)}
                      </span>
                      {lang !== "th" && (
                        <span className="text-sm uppercase tracking-widest text-muted-foreground">{t("floor_label")}</span>
                      )}
                    </div>
                    <div className="mt-2 h-px w-16 bg-[color:var(--chula-pink)]" />
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {floorRooms.length} {t("floor_count")}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {floorRooms.map((r) => (
                  <RoomCard
                    key={r.id}
                    room={r}
                    heads={headsByRoom[r.id] ?? []}
                    lang={lang}
                    t={t}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function RoomCard({
  room: r,
  heads: roomHeads,
  lang,
  t,
}: {
  room: Room;
  heads: RoomHead[];
  lang: "th" | "en";
  t: (k: never) => string;
}) {
  const equipment = collapseNumberedEquipment(Array.isArray(r.equipment) ? r.equipment : []);
  const visibleChips = equipment.slice(0, 5);
  const overflow = equipment.length - visibleChips.length;
  const typeLabel = r.type === "pc" ? (t as (k: string) => string)("rooms_filter_pc") : (t as (k: string) => string)("rooms_filter_lab");
  const _t = t as (k: string) => string;

  const headText = roomHeads.length > 0
    ? roomHeads.map((h) => (lang === "th" ? h.name_th : h.name_en)).join(", ")
    : r.head_of_lab;

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-card transition duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <span className="absolute inset-y-0 left-0 w-0 bg-[color:var(--chula-pink)] transition-all duration-150 group-hover:w-1" />

      <div className="flex flex-col gap-5 p-5 md:grid md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center md:gap-6 md:p-6">
        {/* LEFT: code + type */}
        <div className="flex items-center justify-between md:block">
          <div className="font-display text-4xl font-bold leading-none text-[color:var(--chula-pink)] md:text-5xl">
            {r.code}
          </div>
          <div className="md:mt-3">
            <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              {typeLabel}
            </span>
          </div>
        </div>

        {/* MIDDLE: name + meta + chips */}
        <div className="min-w-0 md:border-l md:border-border/60 md:pl-6">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug">
            {lang === "th" ? r.name_th : r.name_en}
          </h3>

          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {headText && (
              <div className="flex min-w-0 items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{headText}</span>
              </div>
            )}
            {r.contact_phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <a href={`tel:${r.contact_phone.replace(/[^0-9+]/g, "")}`} className="hover:text-primary">
                  {r.contact_phone}
                </a>
              </div>
            )}
          </dl>

          {equipment.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {visibleChips.map((e, i) => (
                <span
                  key={i}
                  className="inline-flex max-w-[16rem] items-center truncate rounded-full bg-[color:var(--chula-pink-soft)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--chula-pink)] md:max-w-none"
                >
                  {e.name}
                </span>
              ))}
              {overflow > 0 && (
                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  +{overflow}
                </span>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: actions */}
        <div className="flex flex-col gap-2 md:w-44 md:items-stretch md:border-l md:border-border/60 md:pl-6">
          <Button asChild className="btn-cta w-full">
            <Link to="/reserve" search={{ room: r.id }}>{_t("rooms_reserve")}</Link>
          </Button>
          {r.google_calendar_url && (
            <a
              href={r.google_calendar_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground/80 transition hover:border-gold hover:text-foreground"
            >
              <CalendarDays className="h-3.5 w-3.5" /> {_t("room_calendar")}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
