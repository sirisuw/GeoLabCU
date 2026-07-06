import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, MapPin, Microscope, MonitorSmartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import labImg from "@/assets/lab-room.jpg";
import pcImg from "@/assets/pc-room.jpg";

export const Route = createFileRoute("/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms — Geo Labs" },
      { name: "description", content: "Browse laboratory and computer rooms available for reservation." },
    ],
  }),
  component: RoomsPage,
});

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
      return data as Room[];
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
              className={`rounded px-3 py-1.5 transition ${filter === f ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"}`}
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
          {filtered.map((r) => (
            <article key={r.id} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-gold hover:shadow-md">
              <div className="relative h-40 overflow-hidden">
                <img
                  src={r.type === "lab" ? labImg : pcImg}
                  alt=""
                  loading="lazy"
                  width={1600}
                  height={1000}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
                  {r.type === "lab" ? <Microscope className="h-3 w-3" /> : <MonitorSmartphone className="h-3 w-3" />}
                  {r.type === "lab" ? t("type_lab") : t("type_pc")}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-xs font-semibold uppercase tracking-widest text-gold">{r.code}</span>
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
                <Button asChild className="mt-4 w-full">
                  <Link to="/reserve" search={{ room: r.id }}>{t("rooms_reserve")}</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
