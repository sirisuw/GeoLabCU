import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, LogOut, CalendarDays, Mail, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/ta")({
  head: () => ({ meta: [{ title: "TA queue — Geo Labs" }, { name: "robots", content: "noindex" }] }),
  component: TaPage,
});

type Row = {
  id: string;
  room_id: string;
  requester_name: string;
  requester_email: string;
  purpose: string;
  start_at: string;
  end_at: string;
  status: string;
  attendees: number;
  advisor_name: string | null;
  equipment: string | null;
  equipment_selected: { name: string }[] | null;
  sample_count: string | null;
  ta_note: string | null;
  professor_endorsement: string;
  professor_note: string | null;
  created_at: string;
  rooms: { code: string; name_en: string; officer_group: string; flow_type: string } | null;
};

function TaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth" });
      else { setEmail(data.session.user.email ?? ""); setReady(true); }
    });
  }, [navigate]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["ta_queue"],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, rooms(code, name_en, officer_group, flow_type)")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const decide = async (id: string, decision: "ta_approved" | "rejected") => {
    const note = notes[id] ?? null;
    const patch: Record<string, string | null> = { status: decision };
    if (note) patch.ta_note = note;
    const { error } = await supabase.from("reservations").update(patch as never).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(decision === "ta_approved" ? "Approved" : "Rejected");
    qc.invalidateQueries({ queryKey: ["ta_queue"] });
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };

  if (!ready) return <div className="container-page py-24 text-center">…</div>;

  return (
    <div className="container-page py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">TA · Stage 1</p>
          <h1 className="mt-2 text-4xl font-semibold">Pending Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/admin">Admin</Link></Button>
          <Button variant="ghost" onClick={signOut}><LogOut className="mr-1.5 h-4 w-4" />Sign out</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">Queue is empty.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <article key={r.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xs font-semibold uppercase tracking-widest text-gold">{r.rooms?.code}</span>
                    <span className="text-sm font-semibold">{r.rooms?.name_en}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{r.rooms?.flow_type}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{r.rooms?.officer_group}</span>
                    {r.professor_endorsement !== "none" && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${r.professor_endorsement === "endorsed" ? "bg-green-500/20 text-green-700" : "bg-destructive/15 text-destructive"}`}>
                        Prof: {r.professor_endorsement}
                      </span>
                    )}
                  </div>
                  <div className="grid gap-1 text-sm md:grid-cols-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 text-gold" />{new Date(r.start_at).toLocaleString()} → {new Date(r.end_at).toLocaleString()}</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5 text-gold" />{r.requester_name} · {r.requester_email}</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-3.5 w-3.5 text-gold" />{r.attendees} attendee(s)</span>
                    {r.advisor_name && <span className="text-muted-foreground">Advisor: {r.advisor_name}</span>}
                  </div>
                  {(r.equipment_selected?.length || r.equipment) && (
                    <p className="rounded bg-muted/60 p-2 text-xs"><b>Equipment:</b> {r.equipment_selected?.length ? r.equipment_selected.map(e => e.name).join(", ") : r.equipment}</p>
                  )}
                  {r.sample_count && <p className="text-xs text-muted-foreground">Samples: {r.sample_count}</p>}
                  <p className="rounded bg-muted p-2 text-sm">{r.purpose}</p>
                  {r.professor_note && <p className="rounded bg-gold/10 p-2 text-xs"><b>Advisor note:</b> {r.professor_note}</p>}
                  <Textarea
                    placeholder="Optional note to requester (shown on rejection)"
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" onClick={() => decide(r.id, "ta_approved")}><Check className="mr-1 h-4 w-4" />Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => decide(r.id, "rejected")}><X className="mr-1 h-4 w-4" />Reject</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
