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
};

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const equipment = collapseNumberedEquipment(Array.isArray(r.equipment) ? r.equipment : []);
            return (
              <article key={r.id} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition duration-150 hover:-translate-y-0.5 hover:border-[color:var(--chula-pink)] hover:shadow-md">
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-display text-base font-bold uppercase tracking-widest text-[color:var(--chula-pink)]">{r.code}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {r.capacity} {t("rooms_seats")}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold leading-snug">{lang === "th" ? r.name_th : r.name_en}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{lang === "th" ? r.description_th : r.description_en}</p>
                  {r.location && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {r.location}
                    </p>
                  )}

                  {(r.head_of_lab || r.staff_in_charge || r.contact_phone) && (
                    <dl className="mt-3 space-y-1 border-t border-border/60 pt-3 text-xs">
                      {r.head_of_lab && (
                        <div className="flex gap-2">
                          <dt className="flex w-28 shrink-0 items-center gap-1 text-muted-foreground">
                            <UserRound className="h-3.5 w-3.5" /> {t("room_head")}
                          </dt>
                          <dd className="flex-1">{r.head_of_lab}</dd>
                        </div>
                      )}
                      {r.staff_in_charge && (
                        <div className="flex gap-2">
                          <dt className="flex w-28 shrink-0 items-center gap-1 text-muted-foreground">
                            <Wrench className="h-3.5 w-3.5" /> {t("room_staff")}
                          </dt>
                          <dd className="flex-1">{r.staff_in_charge}</dd>
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
                  )}

                  {equipment.length > 0 && (
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Beaker className="h-3.5 w-3.5" /> {t("room_equipment")}
                      </p>
                      <ul className="space-y-0.5 text-xs">
                        {equipment.map((e, i) => (
                          <li key={i} className="flex gap-1">
                            <span className="text-gold">•</span>
                            <span>
                              <span className="font-medium">{e.name}</span>
                              {e.model && <span className="text-muted-foreground"> — {e.model}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-2">
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

