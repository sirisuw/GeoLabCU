## Automated reservation emails via Resend

### Flow
1. **User submits reservation** → immediately:
   - Confirmation email to the user ("We received your request, pending approval")
   - Notification email to TAs/Professors assigned to that room (with an Approve/Reject link)
2. **TA/Prof clicks Approve or Reject** (or admin uses the admin page) →
   - Result email sent back to the user ("Your reservation was approved/rejected")

### Recipients (per-room)
Add a `room_staff` table linking rooms → staff emails/roles:
```
room_staff(id, room_id, email, name, role: 'ta' | 'professor', notify)
```
Managed from the `/rooms` admin view (add/edit/remove staff per room). When a reservation is created, we look up all staff for the booked room and email them.

### Sender: Resend
- Add `RESEND_API_KEY` secret (I'll prompt you).
- Ask you for the "from" address (e.g. `noreply@geoculab.com`) and verify the sending domain in Resend (DNS records — I'll list them).
- Until the domain is verified, we fall back to Resend's `onboarding@resend.dev` sender so email works immediately for testing.

### Implementation

**DB migration**
- `room_staff` table + RLS + GRANTs (admin-only write, staff-readable).
- Optional `reservation_tokens` table for one-click approve/reject links (short-lived signed tokens), so TAs don't need to log in.

**Server functions / routes (TanStack Start)**
- `src/lib/email.server.ts` — Resend client + `sendEmail({to, subject, html})` helper.
- `src/lib/emails/*.tsx` — three templates: `reservation-received` (user), `reservation-pending-staff` (TA/Prof, with approve/reject buttons), `reservation-decision` (user).
- `src/lib/reservations.functions.ts` —
  - `createReservation` server fn: inserts rows, looks up room_staff, sends the two initial emails. Replaces the direct `supabase.from("reservations").insert()` call in `reserve.tsx`.
  - `decideReservation` server fn: called by admin page; updates status and sends the decision email.
- `src/routes/api/public/approve.$token.ts` — public GET endpoint used by the emailed approve/reject links; verifies token, updates status, sends decision email, shows a small confirmation page.

**UI**
- `reserve.tsx`: swap the insert for `createReservation`.
- `admin.tsx`: swap `updateStatus` for `decideReservation` so it also emails the user.
- `rooms.tsx` (admin section): add a "Staff for this room" editor.

### What I need from you before building
1. The **from address** (e.g. `noreply@yourdomain.com`) and confirmation you can add DNS records to that domain — or say "use Resend test sender for now".
2. Your **Resend API key** (I'll request it as a secret when you approve).
3. Whether TAs/Profs should be able to **approve via one-click email link** (no login), or must log in to the admin page.

### Technical notes (internal)
- Emails sent from inside `createServerFn` handlers via Resend REST API (`fetch`) — Worker-compatible, no Node SDK needed.
- Token links use HMAC(reservation_id + role + action) with `EMAIL_LINK_SECRET`; single-use via a `used_at` column.
- Emails are fire-and-forget with error logging; a failed email never blocks the reservation insert.
