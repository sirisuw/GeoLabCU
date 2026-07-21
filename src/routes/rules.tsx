import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Clock, CalendarClock, UserX, PhoneCall, AlertTriangle, Mail } from "lucide-react";
import { useI18n, type DictKey } from "@/lib/i18n";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Lab Rules — Geo Labs" },
      { name: "description", content: "Rules and policies for reserving and using the laboratories at the Department of Geology, Chulalongkorn University." },
      { property: "og:title", content: "Lab Rules — Geo Labs" },
      { property: "og:description", content: "Read the lab safety, booking, cancellation, and external-user rules before requesting a lab." },
    ],
  }),
  component: RulesPage,
});

type Rule = { icon: React.ComponentType<{ className?: string }>; t: DictKey; d: DictKey };

const RULES: Rule[] = [
  { icon: GraduationCap, t: "rules_training_t", d: "rules_training_d" },
  { icon: Clock, t: "rules_hours_t", d: "rules_hours_d" },
  { icon: CalendarClock, t: "rules_advance_t", d: "rules_advance_d" },
  { icon: UserX, t: "rules_noshow_t", d: "rules_noshow_d" },
  { icon: PhoneCall, t: "rules_cancel_t", d: "rules_cancel_d" },
  { icon: AlertTriangle, t: "rules_damage_t", d: "rules_damage_d" },
  { icon: Mail, t: "rules_external_t", d: "rules_external_d" },
];

function RulesPage() {
  const { t } = useI18n();
  return (
    <div className="container-page py-14">
      <div className="mb-10 max-w-2xl">
        <p className="eyebrow">03 · Policies</p>
        <h1 className="mt-2 text-4xl font-semibold md:text-5xl">{t("rules_title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("rules_sub")}</p>
      </div>
      <ol className="grid gap-4 md:grid-cols-2">
        {RULES.map((r, i) => {
          const Icon = r.icon;
          return (
            <li
              key={r.t}
              className="flex gap-4 rounded-xl border border-border bg-card p-5 transition hover:border-chula-pink"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-chula-pink/10 text-chula-pink">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-display text-xs font-semibold uppercase tracking-widest text-chula-pink">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-semibold">{t(r.t)}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(r.d)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
