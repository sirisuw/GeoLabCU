## Demo mode: point notification recipients at sirisu@uw.edu

Update recipient data in the database so the live demo routes every email to your inbox.

### Changes

1. `notification_settings` — update all 3 staff rows (Wiyada, Sopit, Kunchalika) and the admin row: set `email = 'sirisu@uw.edu'`, `active = true`.
2. `advisors` — for อ.ดร.พงศ์เทพ ทองแสง (Dr. Pongthep Thongsang): set `email = 'sirisu@uw.edu'`, `active = true`. No other advisor rows touched.
3. Read back and display the full `notification_settings` table and Pongthep's row from `advisors` to confirm.

### Technical

- Use the insert tool (UPDATE statements) — no schema changes.
- Match staff rows by `role = 'staff'` and admin by `role = 'admin'`.
- Match Pongthep by `name_th ILIKE '%พงศ์เทพ%'` (fallback `name_en ILIKE '%pongthep%'`).
- Verify via read_query after the updates.
