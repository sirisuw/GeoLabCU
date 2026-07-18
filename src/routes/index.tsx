import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, ClipboardList, MousePointerClick, Microscope, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import heroImg from "@/assets/hero-lab.jpg";
import labImg from "@/assets/lab-room.jpg";
import pcImg from "@/assets/pc-room.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Geo Labs — Chula Geology Room Reservations" },
      { name: "description", content: "Book laboratory and computer rooms at the Department of Geology, Chulalongkorn University." },
    ],
  }),
  component: Home,
});

function Home() {
  const { t, lang } = useI18n();
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-primary text-primary-foreground">
        <img
          src={heroImg}
          alt=""
          width={1920}
          height={1280}
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-[color:var(--chula-pink)]/45" />
        <div className="container-page relative grid gap-10 py-20 md:grid-cols-[1.2fr_1fr] md:py-28">
          <div>
            <p className="eyebrow text-[color:var(--chula-pink)]">{t("hero_eyebrow")}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] md:text-6xl">{t("hero_title")}</h1>
            <p className="mt-5 max-w-xl text-base text-primary-foreground/80 md:text-lg">{t("hero_sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="btn-cta hover:opacity-95">
                <Link to="/reserve">{t("hero_cta_reserve")} <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/rooms">{t("hero_cta_browse")}</Link>
              </Button>
            </div>
          </div>
          <div className="hidden self-end md:block">
            <div className="rounded-xl border border-[color:var(--chula-pink)]/40 bg-primary-foreground/5 p-5 backdrop-blur">
              <p className="eyebrow text-[color:var(--chula-pink)]">{lang === "th" ? "ภาพรวมห้อง" : "Room Overview"}</p>
              <div className="mt-4 space-y-3">
                <RoomTypeRow icon={<Microscope className="h-5 w-5" />} title={lang === "th" ? "ห้องทั้งหมด" : "Total rooms"} count="20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-20">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow">01 · Process</p>
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl">{t("home_how_title")}</h2>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <StepCard n="01" icon={<MousePointerClick className="h-5 w-5" />} title={t("home_step1_t")} desc={t("home_step1_d")} />
          <StepCard n="02" icon={<ClipboardList className="h-5 w-5" />} title={t("home_step2_t")} desc={t("home_step2_d")} />
          <StepCard n="03" icon={<CalendarCheck className="h-5 w-5" />} title={t("home_step3_t")} desc={t("home_step3_d")} />
        </div>
      </section>

      {/* Feature blocks */}
      <section className="container-page grid gap-6 pb-24 md:grid-cols-2">
        <FeatureCard img={labImg} eyebrow={t("type_lab")} title={lang === "th" ? "อุปกรณ์ครบครัน พร้อมสำหรับงานวิจัย" : "Fully equipped for research work"} to="/rooms" />
        <FeatureCard img={pcImg} eyebrow={t("type_pc")} title={lang === "th" ? "GIS, การจำลอง และการนำเสนอ" : "GIS, modeling, and presentations"} to="/rooms" />
      </section>
    </div>
  );
}

function RoomTypeRow({ icon, title, count }: { icon: React.ReactNode; title: string; count: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-[color:var(--chula-pink)] text-white">{icon}</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <span className="font-display text-2xl font-semibold text-[color:var(--chula-pink)]">{count}</span>
    </div>
  );
}

function StepCard({ n, icon, title, desc }: { n: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 transition duration-150 hover:-translate-y-0.5 hover:border-[color:var(--chula-pink)] hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">{icon}</span>
        <span className="font-display text-sm font-semibold tracking-widest text-muted-foreground">{n}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function FeatureCard({ img, eyebrow, title, to }: { img: string; eyebrow: string; title: string; to: string }) {
  return (
    <Link to={to} className="group relative overflow-hidden rounded-xl border border-border bg-card">
      <img src={img} alt="" loading="lazy" width={1600} height={1000} className="h-64 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-primary-foreground">
        <p className="eyebrow text-[color:var(--chula-pink)]">{eyebrow}</p>
        <h3 className="mt-1 text-xl font-semibold">{title}</h3>
      </div>
    </Link>
  );
}
