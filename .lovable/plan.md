## Sequential Approval Chain + Student Tracking

### 1. Database migrations (2 separate migrations required)

**Migration A — enum values only** (must commit before functions can reference them):
- `ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'pending_advisor'`
- `ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'advisor_approved'` (transient, resolves to `pending_staff`)
- Reuse existing: `pending_staff`, `pending_admin`, `confirmed`, `rejected`, `cancelled`, `expired`, `ta_approved`

**Migration B — schema + logic** (runs after A commits):
- Add `tracking_token uuid NOT NULL DEFAULT gen_random_uuid()` to `reservations`, unique index
- Add `advisor_reminded_at`, `staff_reminded_at`, `admin_reminded_at timestamptz` for per-stage reminders
- Add `rejected_stage text`, `rejection_reason text`
- Rewrite `set_reservation_defaults()`:
  - If `advisor_id` present → status = `pending_advisor`
  - Else → status = `pending_staff`
  - Set `expires_at = now() + 48h` (per stage — updated on each transition)
- Rewrite `enqueue_reservation_emails()`:
  - On INSERT: if `pending_advisor` → email advisor only; if `pending_staff` → email all 3 staff
- Rewrite `decide_reservation_by_token(_role, _token, _decision, _note)`:
  - Validate token matches current stage (advisor token only valid while `pending_advisor`, staff token while `pending_staff`)
  - Return structured result: `{ok, error_code}` where `error_code` in `('wrong_stage','already_decided','not_found')` for i18n messages
  - On advisor approve → set `pending_staff`, reset `expires_at`, queue staff emails
  - On staff approve → set `pending_admin`, reset `expires_at`, queue admin email
  - On any reject → `rejected`, set `rejected_stage`, `rejection_reason`, queue student rejection email
- Update `check_reservation_approvals()` for new templates showing prior approvals
- Add `get_reservation_by_tracking_token(_token uuid)` SECURITY DEFINER → returns single-row public status (no other bookings, no PII of approvers beyond names)
- Update `run_reservation_maintenance()`:
  - Send 24h reminder per stage (using `*_reminded_at`)
  - Expire at 48h per stage → status `expired`, notify student
- RLS: no direct anon SELECT on `reservations`; tracking uses RPC only

### 2. Approval page (`/approve/$role/$token`)
- Update `get_reservation_by_token` RPC to also return `current_stage`
- Show clear bilingual error when acting at wrong stage:
  - Advisor token but status = `pending_staff` → "คำขอนี้ถูกดำเนินการไปแล้ว / Already processed"
  - Staff token but status = `pending_advisor` → "คำขอนี้ยังรอการอนุมัติจากอาจารย์ที่ปรึกษา / Still awaiting advisor"
- Rejection UI: text field for reason (required), sent to RPC

### 3. Student tracking page (`/status/$token`)
- New route `src/routes/status.$token.tsx`
- Vertical timeline component: 4 steps (or 3 when advisor skipped)
  - ส่งคำขอแล้ว (always green, submitted_at)
  - อาจารย์ที่ปรึกษาอนุมัติ (skip if no advisor)
  - เจ้าหน้าที่อนุมัติ
  - ผู้ดูแลยืนยัน
- Completed → green + timestamp; current → Chula pink pulse + "กำลังรอ..."; future → muted
- Rejected → red state at the failing step with reason
- Booking summary card below (room, equipment, dates, Request ID)
- Query via `get_reservation_by_tracking_token` RPC only

### 4. Success screen + emails
- `/reserve` success screen: prominent CTA "ติดตามสถานะคำขอ / Track status" linking to `/status/{tracking_token}`
- All student-facing email templates include the tracking link
- Advisor email: "คุณเป็นผู้อนุมัติลำดับแรก / You are the first approver"
- Staff email: shows "อนุมัติโดยอาจารย์ {name} เมื่อ {ta}"
- Admin email/dashboard: shows advisor + staff approval trail with names and timestamps

### Files touched
- 2 migrations (enum, then schema+functions)
- `src/routes/approve.$role.$token.tsx` — wrong-stage messaging, rejection reason
- `src/routes/status.$token.tsx` — NEW
- `src/routes/reserve.tsx` — success screen tracking link, capture returned tracking_token
- `src/routeTree.gen.ts` — regenerated
- `src/lib/i18n.tsx` — new strings

### Technical notes
- Per-stage `expires_at` is reset on each transition, so pg_cron maintenance stays a single query
- Tokens remain single-use because stage-gate check rejects reuse after transition
- Tracking page is fully public but RPC returns only that one row's non-sensitive fields
