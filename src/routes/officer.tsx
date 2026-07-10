import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wrench, X, LogOut, CalendarDays, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/officer")({
  head: () => ({ meta: [{ title: "Lab officer — Geo Labs" }, { name: "robots", content: "noindex" }] }),
  component: OfficerPage,
});

type Room = { id: string; code: string; name_en: string; equipment: { name: string }[] | null; officer_group: string };
type Maint = { id: string; room_id: string; equipment_name: string; reason: string | null; started_at: string; ended_at: string | null };
type Booking = { id: string; requester_name: string; requester_email: string; start_at: string; end_at: string; equipment_selected: { name: string }[] | null; status: string; rooms: { code: string; name_en: string } | null; student_id: string | null };

function OfficerPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [roomId, setRoomId] = useState("");
  const [equip, setEquip] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth" });
      else { setEmail(data.session.user.email ?? ""); setReady(true); }
    });
  }, [navigate]);

  const { data: rooms = [] } = useQuery({
    queryKey: ["officer_rooms"],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, code, name_en, equipment, officer_group").eq("active", true).order("code");
      if (error) throw error;
      return (data ?? []) as unknown as Room[];
    },
  });

  const { data: maint = [] } = useQuery({
    queryKey: ["officer_maint"],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment_maintenance").select("*").is("ended_at", null).order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Maint[];
    },
  });

  const { data: today = [] } = useQuery({
    queryKey: ["officer_today"],
    enabled: ready,
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const { data, error } = await supabase.from("reservations")
        .select("id, requester_name, requester_email, start_at, end_at, equipment_selected, status, student_id, rooms(code, name_en)")
        .eq("status", "confirmed")
        .gte("start_at", start.toISOString())
        .lt("start_at", end.toISOString())
        .order("start_at");
      if (error) throw error;
      return (data ?? []) as unknown as Booking[];
    },
  });

  const roomEquip = rooms.find((r) => r.id === roomId)?.equipment ?? [];

  const addMaint = async () => {
    if (!roomId || !equip) return toast.error("Pick a room and equipment");
    const { error } = await supabase.from("equipment_maintenance").insert({ room_id: roomId, equipment_name: equip, reason: reason || null } as never);
    if (error) return toast.error(error.message);
    toast.success("Maintenance flag added");
    setEquip(""); setReason("");
    qc.invalidateQueries({ queryKey: ["officer_maint"] });
  };

  const clearMaint = async (id: string) => {
    const { error } = await supabase.from("equipment_maintenance").update({ ended_at: new Date().toISOString() } as never).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["officer_maint"] });
  };

  const markNoShow = async (id: string) => {
    const { error } = await supabase.from("reservations").update({ status: "no_show", no_show: true } as never).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked as no-show");
    qc.invalidateQueries({ queryKey: ["officer_today"] });
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };

  if (!ready) return <div className="container-page py-24 text-center">…</div>;

  return (
    <div className="container-page py-14 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Lab Officer</p>
          <h1 className="mt-2 text-4xl font-semibold">Officer Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/admin">Admin</Link></Button>
          <Button variant="ghost" onClick={signOut}><LogOut className="mr-1.5 h-4 w-4" />Sign out</Button>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2"><Wrench className="h-4 w-4 text-gold" />Equipment Maintenance</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.code} — {r.name_en}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={equip} onValueChange={setEquip}>
            <SelectTrigger><SelectValue placeholder="Equipment" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {roomEquip.map((e) => <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>)}
              {roomEquip.length === 0 && <div className="p-2 text-xs text-muted-foreground">Select a room first</div>}
            </SelectContent>
          </Select>
          <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button onClick={addMaint}>Flag as under maintenance</Button>
        </div>

        <div className="mt-5 space-y-2">
          {maint.length === 0 && <p className="text-sm text-muted-foreground">No active maintenance flags.</p>}
          {maint.map((m) => {
            const room = rooms.find((r) => r.id === m.room_id);
            return (
              <div key={m.id} className="flex items-center justify-between rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
                <div>
                  <b>{room?.code}</b> · {m.equipment_name}
                  {m.reason && <span className="ml-2 text-muted-foreground">— {m.reason}</span>}
                  <span className="ml-2 text-xs text-muted-foreground">since {new Date(m.started_at).toLocaleString()}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => clearMaint(m.id)}><X className="mr-1 h-3 w-3" />Clear</Button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold" />Today's Confirmed Bookings</h2>
        {today.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing today.</p>
        ) : (
          <div className="space-y-2">
            {today.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-border p-3 text-sm">
                <div>
                  <b>{b.rooms?.code}</b> — {b.requester_name} <span className="text-muted-foreground">({b.requester_email})</span>
                  <div className="text-xs text-muted-foreground">{new Date(b.start_at).toLocaleTimeString()} → {new Date(b.end_at).toLocaleTimeString()}</div>
                  {b.equipment_selected?.length ? <div className="text-xs">{b.equipment_selected.map(e => e.name).join(", ")}</div> : null}
                </div>
                <Button size="sm" variant="outline" onClick={() => markNoShow(b.id)}><AlertTriangle className="mr-1 h-3 w-3" />No-show</Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
