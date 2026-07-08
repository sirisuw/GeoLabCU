## What the file contains

A master list of every lab/computer room in your department with three pieces of info per room:

1. **Room number + name** (e.g. `121 — ห้องปฏิบัติการ EPMA`, `130 — ห้องปฏิบัติการ Crushing`, …)
2. **Instruments that must be reserved individually** (e.g. Crushing has `เครื่องบด 1..5`; Cutting/Grinding has 12 machines; XRD/XRF has `XRD` and `XRF`; 325A has `Computer 1..15`)
3. **Approving officer per room** — the person who approves reservations:
   - **คุณโศภิต** — 121, 225 (Microwave), 226C (shared), 228, 232, 234, 235, 237
   - **คุณกัญชลิกา** — 131, 223A, 224, 225 (Fused bead), 226C (shared), 241, 242
   - **คุณวิยดา** — 130
   - Rooms 225 (hood), 325, 326, 325A, 424 have no approver listed
4. A few **notes/questions** from the author (e.g. "check how many crushers actually work", "add XRF handheld?", "label benches 1–4 in room 241").

## What I'll do

### 1. Update the rooms table with this real data
- Insert/upsert every room from the sheet (code, Thai name, English name where obvious, type = `lab` or `pc`).
- Fill each room's `equipment` list with the exact per-instrument options from column 3, so the reservation form shows the correct checkboxes per room (Crusher 1..5, Cutting machines 1..4, XRD/XRF, Computer 1..15, etc.).
- Rooms with no listed instruments (223A, 232, 234, 235 outer, 325, 326, 424) get an empty equipment list — the form already falls back to a free-text field.

### 2. Wire the approvers into the email flow
This is the exact "TA/Prof recipients per room" piece from the plan we already agreed on. I'll:
- Add a `room_staff` table (room_id, name, email, role).
- Seed it with the three officers mapped to their rooms as above.
- Leave rooms without an approver empty for now (you'll tell me who to add later).
- I still need the **email addresses** for คุณโศภิต, คุณกัญชลิกา, and คุณวิยดา — the sheet only has names.

### 3. Small UI follow-ups from the sheet's notes (optional, ask before doing)
- Room 130: confirm actual working crusher count + max concurrent users.
- Room 131: confirm working count of cutters / grinders / jaw crushers.
- Room 241: bench labels 1–4, max 4 concurrent reservers.
- Room 242: add "XRF handheld" as an option?

I'll skip these unless you confirm — the sheet marks them as open questions, not decisions.

## What I need from you before building
1. **Emails** for คุณโศภิต, คุณกัญชลิกา, คุณวิยดา (and anyone for the currently-blank rooms: 225 hood, 325, 326, 325A, 424).
2. Confirm English names for the rooms are okay to auto-translate (e.g. "EPMA Laboratory", "Crushing Laboratory", "Computer Classroom"), or you'll provide them.
3. Should I also action the four spreadsheet notes above, or park them?

## Technical notes (internal)

- One migration: upsert `rooms` by `code`, replace `equipment` JSON per row; create `room_staff` (id, room_id fk, name, email, role default 'officer', notify bool) + RLS + GRANTs (admin write, staff readable) + seed rows.
- Equipment JSON shape stays `{ name, model? }[]` to match `reserve.tsx` — I'll only fill `name`.
- The already-planned `createReservation` server fn will look up `room_staff` for the booked room to build the notify list, so no extra code beyond the earlier email plan.
