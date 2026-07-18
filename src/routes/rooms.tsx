import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, UserRound, Wrench, Phone, CalendarDays } from "lucide-react";
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 [grid-auto-rows:1fr]">
          {filtered.map((r) => {
            const equipment = collapseNumberedEquipment(Array.isArray(r.equipment) ? r.equipment : []);
            const visibleChips = equipment.slice(0, 3);
            const overflow = equipment.length - visibleChips.length;
            const typeLabel = r.type === "pc" ? t("rooms_filter_pc") : t("rooms_filter_lab");
            return (
              <article
                key={r.id}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition duration-150 hover:-translate-y-0.5 hover:border-[color:var(--chula-pink)] hover:shadow-md"
              >
                <div className="flex h-full flex-col p-5">
                  <span className="font-display text-base font-bold uppercase tracking-widest text-[color:var(--chula-pink)]">
                    {r.code}
                  </span>

                  <h3 className="mt-1 line-clamp-2 min-h-[3.25rem] text-lg font-semibold leading-snug">
                    {lang === "th" ? r.name_th : r.name_en}
                  </h3>

                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      {typeLabel}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                    {lang === "th" ? r.description_th : r.description_en}
                  </p>

                  <p className="mt-2 flex min-h-[1.25rem] items-center gap-1 text-xs text-muted-foreground">
                    {r.location && (<><MapPin className="h-3.5 w-3.5" /> {r.location}</>)}
                  </p>

                  {(() => {
                    const roomHeads = headsByRoom[r.id] ?? [];
                    const showHeads = roomHeads.length > 0 || r.head_of_lab;
                    if (!showHeads && !r.contact_phone) return null;
                    return (
                      <dl className="mt-3 space-y-1 border-t border-border/60 pt-3 text-xs">
                        {showHeads && (
                          <div className="flex gap-2">
                            <dt className="flex w-28 shrink-0 items-center gap-1 text-muted-foreground">
                              <UserRound className="h-3.5 w-3.5" /> {t("room_head")}
                            </dt>
                            <dd className="flex-1">
                              {roomHeads.length > 0
                                ? roomHeads.map((h) => (lang === "th" ? h.name_th : h.name_en)).join(", ")
                                : r.head_of_lab}
                            </dd>
                          </div>
                        )}
                        {r.contact_phone && (
                          <div className="flex gap-2">
                            <dt className="flex w-28 shrink-0 items-center gap-1 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" /> {t("room_phone")}
                            </dt>
                            <dd className="flex-1">
                              <a href={`tel:${r.contact_phone.replace(/[^0-9+]/g, "")}`} className="hover:text-primary">
                                {r.contact_phone}
                              </a>
                            </dd>
                          </div>
                        )}
                      </dl>
                    );
                  })()}


                  <div className="mt-3 flex min-h-[2rem] flex-wrap gap-1.5 overflow-hidden">
                    {visibleChips.map((e, i) => (
                      <span
                        key={i}
                        className="inline-flex max-w-full items-center truncate rounded-full bg-[color:var(--chula-pink-soft)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--chula-pink)]"
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

                  <div className="mt-auto flex flex-col gap-2 pt-4">
                    <Button asChild className="btn-cta w-full">
                      <Link to="/reserve" search={{ room: r.id }}>{t("rooms_reserve")}</Link>
                    </Button>
                    {r.google_calendar_url && (
                      <a
                        href={r.google_calendar_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground/80 transition hover:border-gold hover:text-foreground"
                      >
                        <CalendarDays className="h-3.5 w-3.5" /> {t("room_calendar")}
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

