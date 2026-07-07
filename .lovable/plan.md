## What to change

### 1. Calendar — enforce the 7:00 AM booking rule
On `src/components/availability-calendar.tsx`, disable and grey-out any slot that violates the rule:
- If it is currently **before 7:00 AM**, allow same-day slots and any future date.
- If it is currently **7:00 AM or later**, disable all of today's remaining slots — earliest bookable day = tomorrow.
- All past slots stay disabled (they already are visually via booked, but past-time slots on today should also be blocked).

Add a short helper `isBeforeCutoff(slotStart)` returning true when the slot's date is earlier than the earliest allowed booking date. Disabled cells use a distinct style (`bg-muted/30 cursor-not-allowed`, no hover, no click).

Add a small note above the grid restating the rule in TH/EN (pull from `i18n`), so users see why past days are locked.

### 2. Equipment field — checklist per room, free text fallback
On `src/routes/reserve.tsx`:
- Extend the rooms query to also select `equipment` (JSON array of `{ name, model? }`).
- Replace the single `equipment` textarea with a dynamic block that renders **per selected room**:
  - If that room has a non-empty `equipment` array → render a checkbox list of its items. User ticks what they need.
  - If the room has no equipment defined → render a small textarea for that room so the user can type what they need.
- Store the result as `equipment_by_room: Record<roomId, { checked: string[]; note: string }>`.
- On submit, flatten each room's selection into the existing `equipment` text column (e.g. `"Microscope, Sieve shaker"` or the typed note) so the DB schema and admin view do not change.
- Update validation: require at least one checked item OR non-empty note per selected room.

i18n strings added: `f_equipment_pick` ("Select equipment for this room" / "เลือกอุปกรณ์สำหรับห้องนี้"), `f_equipment_none` ("No preset equipment — please describe what you need" / "ห้องนี้ไม่มีรายการอุปกรณ์ โปรดระบุอุปกรณ์ที่ต้องการ"), and the calendar rule notice.

### Files touched
- `src/components/availability-calendar.tsx` — 7 AM cutoff logic + disabled styling + rule notice.
- `src/routes/reserve.tsx` — per-room equipment UI, state, validation, submit flattening.
- `src/lib/i18n.tsx` — new TH/EN strings.

### Out of scope
- No DB schema changes; `reservations.equipment` stays a text column.
- No admin page changes.
