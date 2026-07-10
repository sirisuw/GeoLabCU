# GeoCU Lab Reserve — Full System Build Plan

## Scope

Turn the current reservation app into the full spec: 3 booking flows (equipment, computer, classroom), 5 roles, 2-stage approvals (TA → Admin, with optional Professor endorsement), automatic rules, maintenance lockouts, and no-show tracking. Rooms & equipment already seeded from the Excel — this plan builds the logic and UI on top.

---

## 1. Database changes (one migration)

### Extend `reservations`
- `flow_type` — `equipment` | `computer` | `classroom` (drives which rules apply)
- `sample_count` int null
- `student_status` — `undergrad` | `masters` | `phd` | `staff`
- `equipment_selected` jsonb (array of `{ name }` picked from room's equipment list)
- `ta_note` text, `admin_note` text, `professor_note` text
- `professor_endorsement` — `none` | `endorsed` | `concern` (advisor is optional, not blocking)
- `no_show` bool default false
- `completed_at` timestamptz
- `expires_at` timestamptz (set to `created_at + 48h` on insert)
- Status enum extended: `pending`, `ta_approved`, `confirmed`, `rejected`, `expired`, `completed`, `no_show`, `cancelled`
  (drops the old `pending_ta_advisor` / `pending_admin` split — professor is endorsement, not gate)

### New tables
- **`equipment_maintenance`** — `room_id`, `equipment_name`, `reason`, `started_at`, `ended_at` null. Active row = machine locked.
- **`no_show_counters`** — `student_id` (text), `count`, `last_no_show_at`. Auto-incremented when a reservation flips to `no_show`.
- **`profiles`** + **`user_roles`** — `user_roles` already exists (admin only). Extend `app_role` enum with `ta`, `lab_officer`, `professor`. Add `officer_group` (`sopit` | `kanchalika` | `wiyada` | null) on `user_roles` so TAs/officers are scoped to their rooms.
- **`room_officer_group`** — map each room to one of the 3 officer groups (or null). Seeded from the Excel table.

### Triggers / functions
- `validate_reservation_rules()` — enforces:
  - Equipment: ≥1 working day ahead (7AM cutoff for next working day), ≤5 working days span
  - Computer: ≤4 hours
  - Overlap check against `pending` + `ta_approved` + `confirmed` on same room + equipment name
  - Blocks if any selected equipment has an active maintenance row
- `expire_stale_reservations()` — sets `status='expired'` where `status='pending' AND now() > expires_at`; enqueues rebook email. Called by pg_cron every 15 min.
- `auto_complete_reservations()` — sets `status='completed'` where `status='confirmed' AND end_at < now() AND no_show=false`. pg_cron hourly.
- `bump_no_show_counter()` — trigger on `reservations` when status flips to `no_show`.
- Rewrite `enqueue_reservation_emails()` to route to **the room's officer group TAs** (not a single ta_email column) + advisor CC.
- Rewrite `check_reservation_approvals()` for the new 2-stage flow: TA approve → notify admin; admin approve → notify student; either reject → notify student.

---

## 2. Role permissions & RLS

- `has_role(user, role)` already exists — reuse.
- `is_officer_for_room(user, room_id)` new security-definer helper.
- Policies:
  - Student form insert stays public (as today, with server validation).
  - TAs SELECT/UPDATE reservations where their `officer_group` matches `room_officer_group`.
  - Lab officers SELECT their rooms' reservations + INSERT/UPDATE `equipment_maintenance` for their rooms.
  - Professors SELECT reservations where they're the `advisor_name`; UPDATE only `professor_endorsement` + `professor_note`.
  - Admin: full access.

---

## 3. Server functions (`createServerFn`)

- `createReservation` — validates working-day / 4-hour / overlap / maintenance rules before insert; picks recipient TAs from officer group.
- `decideAsTA(reservationId, decision, note)` — checks caller is TA for that room's group.
- `decideAsAdmin(reservationId, decision, note)` — admin only.
- `endorseAsProfessor(reservationId, endorsement, note)` — advisor only.
- `setMaintenance(roomId, equipmentName, reason)` / `clearMaintenance(id)` — lab officer.
- `markNoShow(reservationId)` — lab officer/admin.
- `listMyQueue()` — returns pending items scoped to caller's role.

All read via TanStack Query + `useSuspenseQuery` in loaders (per project stack rules).

---

## 4. UI

### Student-facing (public)
- **Room picker** — grid of all rooms grouped by flow type, maintenance badges visible.
- **Equipment picker** per room — colored tiles (green/red/yellow/grey) reflecting real-time status via query invalidation.
- **Reservation form** — 3 variants by flow_type:
  - Equipment: full form (name, student ID, @student.chula.ac.th email, phone, status, advisor dropdown from `ADVISORS`, equipment auto-filled, sample count, dates with 7AM/5-day/1-working-day rules, purpose, 2 checkboxes).
  - Computer: short form (name, email, student ID, PC pick, date, start, end ≤4h).
  - Classroom: whole-room booking, medium form.
- **Confirmation page** — request ID + status pipeline (`Pending → TA Approved → Admin Confirmed`).
- **Availability calendar** — already exists, extended to show maintenance blocks.

### TA dashboard (`/ta`)
- Pending queue scoped to their officer group, approve/reject with note, filter by room.

### Professor dashboard (`/professor`)
- List of reservations where they're the advisor; endorse/flag with note (non-blocking).

### Admin dashboard (`/admin`, exists)
- Add "Awaiting Final Approval" section (TA-approved items).
- Show TA name + timestamp + professor endorsement.
- Weekly usage stats panel.
- No-show flag indicator when a student's counter ≥ 3.

### Lab officer dashboard (`/officer`)
- Today's confirmed bookings for their rooms (read-mostly).
- Maintenance toggle per machine.
- End-of-day no-show marking.

### Auth
- Role assignment page in admin for granting TA/officer/professor roles + officer group.

---

## 5. Emails (queued to `pending_emails`, sent once domain is configured)

- New request → TAs of the room's officer group + advisor CC
- TA approved → admin
- Admin confirmed → student (with rules reminder, Request ID)
- Rejected (either stage) → student with reason
- Expired (48h) → student "please rebook"
- Professor endorsement recorded → admin (info only)

All templates bilingual (TH/EN) matching existing style.

---

## 6. Automatic rules — where each lives

| Rule | Enforced in |
| --- | --- |
| 1 working day advance + 7AM cutoff | `validate_reservation_rules()` trigger + client-side date picker limits |
| Max 5 working days (equipment) | trigger + form validation |
| Max 4 hours (computer) | trigger + form validation |
| Overlap blocking | trigger (authoritative) + live availability UI |
| 48h TA expiry | `expires_at` column + pg_cron `expire_stale_reservations()` |
| Maintenance lockout | trigger blocks insert + grey tile in UI |
| No-show ≥3 flag | `bump_no_show_counter` trigger + admin badge |

---

## 7. Order of implementation (so nothing breaks)

1. Migration: schema + roles + triggers + pg_cron jobs (single approval step).
2. Server functions + RLS.
3. TA dashboard + admin "Awaiting Final Approval" section (backend visible immediately).
4. Student flow: rewrite `/reserve` into the 3 form variants + room/equipment picker with live availability.
5. Lab officer dashboard + maintenance toggle.
6. Professor dashboard (smallest surface).
7. Email templates for the new events (still queued to `pending_emails` — no sending until domain).
8. Polish: no-show flag UI, weekly stats, calendar maintenance overlay.

---

## Open questions before I start

1. **Role bootstrapping** — you're the first admin. How do we assign TA / lab_officer / professor roles? Options:
   a) Admin UI page where you paste emails and pick role + officer group (recommended).
   b) I hardcode a seed list now (you give me names/emails).
2. **Professor accounts** — do professors sign in (need accounts), or is their involvement purely email + a public endorsement link like the current `/approve/advisor/:token`? The spec says "can log in", so I'll assume real accounts, but the token link is easier if they won't onboard.
3. **pg_cron** — OK to enable pg_cron for the 15-min expiry sweep and hourly auto-complete? Alternative is checking on every read (cheaper, slightly less precise).
4. **Working days** — Mon–Fri, no Thai public holiday calendar unless you want one wired in (I'd skip holidays for v1).
5. **No-show auto-restrict** — spec marks it optional. Flag-only for v1, or hard block on 3rd strike?
