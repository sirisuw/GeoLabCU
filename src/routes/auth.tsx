import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin sign in — Geo Labs" },
      { name: "description", content: "Sign in to manage reservations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message);
      navigate({ to: "/admin" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success(lang === "th" ? "สร้างบัญชีแล้ว กรุณาเข้าสู่ระบบ" : "Account created. Please sign in.");
      setMode("login");
    }
  };

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-14">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">{mode === "login" ? t("admin_login") : t("admin_signup")}</h1>
            <p className="text-xs text-muted-foreground">{lang === "th" ? "สำหรับเจ้าหน้าที่เท่านั้น" : "Staff access only"}</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "…" : mode === "login" ? t("admin_login") : t("admin_signup")}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "login"
            ? lang === "th" ? "ยังไม่มีบัญชี? สมัครที่นี่" : "No account? Create one"
            : lang === "th" ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : "Have an account? Sign in"}
        </button>
        <p className="mt-6 rounded-md bg-muted p-3 text-xs text-muted-foreground">
          {lang === "th"
            ? "ผู้ใช้คนแรกที่สมัครจะได้รับสิทธิ์ผู้ดูแลระบบโดยอัตโนมัติ"
            : "The first user to register is automatically granted admin access."}
        </p>
      </div>
    </div>
  );
}
