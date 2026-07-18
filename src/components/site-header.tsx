import { Link } from "@tanstack/react-router";
import { Mountain } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { lang, setLang, t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2.5 text-primary">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Mountain className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold">Geo Labs</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Chula · Reservations</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { to: "/", k: "nav_home" as const },
            { to: "/rooms", k: "nav_rooms" as const },
            { to: "/reserve", k: "nav_reserve" as const },
            { to: "/rules", k: "nav_rules" as const },
            { to: "/admin", k: "nav_admin" as const },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="relative rounded-md px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--chula-pink)] focus-visible:ring-offset-2"
              activeProps={{ className: "text-foreground after:absolute after:left-3 after:right-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-[color:var(--chula-pink)]" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {t(l.k)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-border text-xs font-medium">
            <button
              onClick={() => setLang("th")}
              className={`px-2.5 py-1.5 transition ${lang === "th" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"}`}
              aria-pressed={lang === "th"}
            >
              ไทย
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-1.5 transition ${lang === "en" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"}`}
              aria-pressed={lang === "en"}
            >
              EN
            </button>
          </div>
          <Button asChild size="sm" className="btn-cta hidden sm:inline-flex">
            <Link to="/reserve">{t("nav_reserve")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t-2 border-[color:var(--chula-pink)] bg-surface">
      <div className="container-page grid gap-8 py-10 md:grid-cols-3">
        <div>
          <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">Geo Labs</p>
          <p className="mt-2 text-sm">{t("footer_dept")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("footer_hours")}</p>
        </div>
        <div>
          <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">{t("footer_contact_title")}</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>{t("footer_phone")}: <a href="tel:022185443" className="hover:text-primary">02-218-5443</a></li>
            <li>{t("footer_email")}: <a href="mailto:geoculab@gmail.com" className="hover:text-primary">geoculab@gmail.com</a></li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{t("footer_external_note")}</p>
        </div>
        <div className="md:text-right">
          <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
            © {new Date().getFullYear()}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Chulalongkorn University</p>
        </div>
      </div>
    </footer>
  );
}
