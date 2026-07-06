import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "th" | "en";

type Dict = Record<string, { th: string; en: string }>;

export const dict = {
  nav_home: { th: "หน้าแรก", en: "Home" },
  nav_rooms: { th: "ห้อง", en: "Rooms" },
  nav_reserve: { th: "จอง", en: "Reserve" },
  nav_admin: { th: "ผู้ดูแล", en: "Admin" },
  nav_rules: { th: "กฎการใช้งาน", en: "Lab rules" },

  hero_eyebrow: { th: "ภาควิชาธรณีวิทยา จุฬาลงกรณ์มหาวิทยาลัย", en: "Department of Geology, Chulalongkorn University" },
  hero_title: { th: "จองห้องปฏิบัติการและห้องคอมพิวเตอร์", en: "Reserve a lab or computer room" },
  hero_sub: {
    th: "ระบบจองห้องออนไลน์สำหรับนิสิต อาจารย์ และเจ้าหน้าที่ ทดแทนแบบฟอร์ม Google เดิม รวดเร็ว โปร่งใส ตรวจสอบสถานะได้",
    en: "Online booking for students, faculty, and staff — a modern replacement for the old Google Form. Fast, transparent, trackable.",
  },
  hero_cta_reserve: { th: "จองห้องเลย", en: "Book a room" },
  hero_cta_browse: { th: "ดูห้องทั้งหมด", en: "Browse rooms" },

  home_how_title: { th: "ขั้นตอนการจอง", en: "How it works" },
  home_step1_t: { th: "เลือกห้อง", en: "Choose a room" },
  home_step1_d: { th: "เลือกห้องปฏิบัติการหรือห้องคอมพิวเตอร์ที่เหมาะกับงานของคุณ", en: "Pick the lab or PC room that fits your work." },
  home_step2_t: { th: "กรอกแบบฟอร์ม", en: "Submit request" },
  home_step2_d: { th: "ระบุวัน เวลา และวัตถุประสงค์การใช้งาน", en: "Provide date, time, and purpose of use." },
  home_step3_t: { th: "รอการอนุมัติ", en: "Await approval" },
  home_step3_d: { th: "เจ้าหน้าที่ตรวจสอบและยืนยันการจองทางอีเมล", en: "Staff review and confirm via email." },

  rooms_title: { th: "ห้องทั้งหมด", en: "All rooms" },
  rooms_sub: { th: "ห้องปฏิบัติการและห้องคอมพิวเตอร์ที่เปิดให้จอง", en: "Labs and computer rooms available for booking." },
  rooms_filter_all: { th: "ทั้งหมด", en: "All" },
  rooms_filter_lab: { th: "ห้องปฏิบัติการ", en: "Laboratories" },
  rooms_filter_pc: { th: "ห้องคอมพิวเตอร์", en: "PC rooms" },
  rooms_capacity: { th: "ความจุ", en: "Capacity" },
  rooms_seats: { th: "ที่นั่ง", en: "seats" },
  rooms_reserve: { th: "จองห้องนี้", en: "Reserve this room" },

  reserve_title: { th: "แบบฟอร์มจองห้อง", en: "Reservation request" },
  reserve_sub: { th: "กรอกข้อมูลให้ครบถ้วน ทีมงานจะติดต่อกลับทางอีเมล", en: "Fill out the form. We'll respond by email." },
  f_room: { th: "ห้อง", en: "Room" },
  f_room_ph: { th: "เลือกห้อง", en: "Select a room" },
  f_name: { th: "ชื่อ-นามสกุล", en: "Full name" },
  f_email: { th: "อีเมล", en: "Email" },
  f_phone: { th: "เบอร์โทรศัพท์", en: "Phone" },
  f_department: { th: "ภาควิชา / สังกัด", en: "Department / affiliation" },
  f_student_id: { th: "รหัสนิสิต (ถ้ามี)", en: "Student ID (optional)" },
  f_advisor: { th: "ชื่ออาจารย์ที่ปรึกษา (ถ้ามี)", en: "Advisor name (optional)" },
  f_purpose: { th: "วัตถุประสงค์การใช้", en: "Purpose of use" },
  f_attendees: { th: "จำนวนผู้ใช้", en: "Number of attendees" },
  f_start: { th: "เริ่มต้น", en: "Start" },
  f_end: { th: "สิ้นสุด", en: "End" },
  f_submit: { th: "ส่งคำขอจอง", en: "Submit reservation" },
  f_sending: { th: "กำลังส่ง…", en: "Sending…" },
  f_success: { th: "ส่งคำขอเรียบร้อย ทีมงานจะติดต่อกลับทางอีเมล", en: "Request submitted. We'll contact you by email." },
  f_error: { th: "ส่งไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง", en: "Could not submit. Please check your input." },
  f_conflict: { th: "ช่วงเวลานี้ถูกจองแล้ว กรุณาเลือกเวลาอื่น", en: "This time slot is already booked. Please choose another." },
  f_user_status: { th: "สถานะผู้ใช้งาน", en: "User status" },
  f_user_status_ph: { th: "เลือกสถานะ", en: "Select status" },
  f_us_bachelor: { th: "นิสิตปริญญาตรี", en: "Bachelor's student" },
  f_us_master: { th: "นิสิตปริญญาโท", en: "Master's student" },
  f_us_phd: { th: "นิสิตปริญญาเอก", en: "Ph.D. student" },
  f_us_staff: { th: "อาจารย์ / เจ้าหน้าที่", en: "Teacher / Staff" },
  f_advisor_ph: { th: "เลือกอาจารย์ที่ปรึกษา", en: "Select advisor" },
  f_equipment: { th: "เครื่องมือที่ต้องการใช้", en: "Equipment requested" },
  f_equipment_hint: { th: "หากเครื่องมืออยู่คนละห้อง กรุณาแยกฟอร์มจอง", en: "If tools are in different rooms, submit separate requests." },
  f_samples: { th: "จำนวนตัวอย่าง", en: "Number of samples" },
  f_samples_hint: { th: "โปรดระบุให้ละเอียด", en: "Please specify in detail." },
  f_confirm_title: { th: "ข้อกำหนดก่อนจองใช้ห้องปฏิบัติการ", en: "Pre-booking requirements" },
  f_confirm_contact: { th: "ข้าพเจ้าได้ติดต่อเจ้าหน้าที่และอาจารย์ที่ปรึกษาเรียบร้อยแล้ว", en: "I have contacted the officer and my advisor." },
  f_confirm_calendar: { th: "ข้าพเจ้าได้เช็คปฏิทินก่อนการจองใช้ห้องปฏิบัติการแล้ว", en: "I have checked the calendar before booking." },
  f_rules_title: { th: "กรุณาอ่านก่อนส่งคำขอ", en: "Please read before submitting" },
  f_rules_1: { th: "ระยะเวลาสูงสุดที่จองได้คือ 5 วันทำการติดต่อกันต่อครั้ง", en: "Maximum booking is 5 consecutive working days per request." },
  f_rules_2: { th: "หากต้องการยกเลิกหรือเปลี่ยนแปลง กรุณาแจ้งเจ้าหน้าที่ทางโทรศัพท์หรือด้วยวาจา มิฉะนั้นจะถูกระงับสิทธิ์ใช้ห้องปฏิบัติการทุกห้องเป็นเวลา 2 สัปดาห์", en: "To cancel or change, notify the operations officer by phone or in person. Otherwise, lab access will be suspended for 2 weeks." },
  f_rules_3: { th: "จองก่อน 7:00 น. ใช้ห้องได้ในวันเดียวกัน หลัง 7:00 น. ใช้ได้ในวันถัดไป", en: "Booking before 7:00 AM is valid same-day; after 7:00 AM, next working day only." },

  cal_title: { th: "ตารางว่างของห้อง", en: "Room availability" },
  cal_hint: { th: "เลือกห้องเพื่อดูช่วงเวลาที่ถูกจองแล้ว", en: "Select a room to see booked time slots." },
  cal_prev: { th: "สัปดาห์ก่อน", en: "Previous week" },
  cal_next: { th: "สัปดาห์ถัดไป", en: "Next week" },
  cal_today: { th: "วันนี้", en: "Today" },
  cal_booked: { th: "ถูกจอง", en: "Booked" },
  cal_pending: { th: "รออนุมัติ", en: "Pending" },
  cal_free: { th: "ว่าง", en: "Free" },
  cal_click_free: { th: "คลิกช่องว่างเพื่อเลือกเวลาเริ่มต้น", en: "Click a free slot to prefill start time." },

  admin_title: { th: "แดชบอร์ดผู้ดูแล", en: "Admin dashboard" },
  admin_sub: { th: "จัดการคำขอจองห้อง", en: "Manage reservation requests." },
  admin_login: { th: "เข้าสู่ระบบ", en: "Sign in" },
  admin_signup: { th: "สมัครบัญชี", en: "Create account" },
  admin_signout: { th: "ออกจากระบบ", en: "Sign out" },
  admin_pending: { th: "รอดำเนินการ", en: "Pending" },
  admin_approved: { th: "อนุมัติแล้ว", en: "Approved" },
  admin_rejected: { th: "ปฏิเสธ", en: "Rejected" },
  admin_all: { th: "ทั้งหมด", en: "All" },
  admin_approve: { th: "อนุมัติ", en: "Approve" },
  admin_reject: { th: "ปฏิเสธ", en: "Reject" },
  admin_no_reservations: { th: "ยังไม่มีคำขอจอง", en: "No reservations yet" },

  footer_dept: { th: "ภาควิชาธรณีวิทยา คณะวิทยาศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย", en: "Department of Geology, Faculty of Science, Chulalongkorn University" },
  footer_contact_title: { th: "ติดต่อ", en: "Contact" },
  footer_external_note: { th: "ผู้ใช้ภายนอก กรุณาติดต่อเจ้าหน้าที่ก่อนใช้บริการ", en: "External users: please contact staff before use." },
  footer_phone: { th: "โทรศัพท์", en: "Phone" },
  footer_email: { th: "อีเมล", en: "Email" },
  footer_hours: { th: "เวลาทำการ จ.–ศ. 09:00–16:00 น.", en: "Hours: Mon–Fri 09:00–16:00" },

  rules_title: { th: "กฎและระเบียบการใช้ห้องปฏิบัติการ", en: "Lab rules & policies" },
  rules_sub: { th: "กรุณาอ่านและปฏิบัติตามอย่างเคร่งครัดก่อนขอใช้ห้องปฏิบัติการ", en: "Please read and comply before requesting a lab." },
  rules_training_t: { th: "การอบรมประจำปี", en: "Annual lab training" },
  rules_training_d: { th: "ผู้ขอใช้ห้องปฏิบัติการต้องผ่านการอบรมด้านความปลอดภัยประจำปีจากภาควิชาก่อนจึงจะขอใช้ห้องได้", en: "Users must complete the department's annual lab safety training before requesting any lab." },
  rules_hours_t: { th: "เวลาทำการ", en: "Working hours" },
  rules_hours_d: { th: "จันทร์–ศุกร์ 09:00–16:00 น. หากต้องใช้งานนอกเวลาทำการ ต้องได้รับอนุญาตจากหัวหน้าห้องปฏิบัติการและหัวหน้าภาควิชา", en: "Mon–Fri 09:00–16:00. Use outside these hours requires approval from the head of lab and the head of department." },
  rules_advance_t: { th: "การจองล่วงหน้า", en: "Advance booking" },
  rules_advance_d: { th: "ต้องจองล่วงหน้าอย่างน้อย 1 วันทำการ", en: "Bookings must be made at least 1 working day in advance." },
  rules_noshow_t: { th: "การมาสาย / ไม่มาใช้งาน", en: "Late arrival / no-show" },
  rules_noshow_d: { th: "การมาสาย ไม่มาใช้งาน หรือใช้งานสั้นเกินไปจนเสียโอกาสของผู้อื่น จะถูกระงับสิทธิ์การใช้ห้องเป็นเวลา 2 สัปดาห์", en: "Late arrival, no-show, or unreasonably short use will result in a 2-week suspension of lab access." },
  rules_cancel_t: { th: "การยกเลิก", en: "Cancellation" },
  rules_cancel_d: { th: "หากต้องการยกเลิก กรุณาโทรแจ้งเจ้าหน้าที่ก่อนเวลา 12:00 น. ของวันก่อนวันใช้งานที่หมายเลข 02-218-5443 มิฉะนั้นจะถูกระงับสิทธิ์ 2 สัปดาห์", en: "To cancel, phone the staff at 02-218-5443 before 12:00 the day before use. Otherwise a 2-week suspension applies." },
  rules_damage_t: { th: "ความเสียหายจากการใช้งาน", en: "Damage & negligence" },
  rules_damage_d: { th: "หากเกิดความเสียหายจากความประมาทหรือการใช้งานที่ไม่ถูกต้อง ผู้ใช้ต้องรับผิดชอบค่าใช้จ่ายตามที่ภาควิชากำหนด", en: "Damage from negligence or misuse is charged to the user at the department's discretion." },
  rules_external_t: { th: "ผู้ใช้ภายนอก", en: "External users" },
  rules_external_d: { th: "ผู้ใช้ภายนอกภาควิชา กรุณาติดต่อเจ้าหน้าที่ประจำห้อง หรืออีเมล geoculab@gmail.com", en: "External users, please contact the lab staff or email geoculab@gmail.com." },

  room_head: { th: "หัวหน้าห้องปฏิบัติการ", en: "Head of lab" },
  room_staff: { th: "เจ้าหน้าที่ผู้ดูแล", en: "Staff in charge" },
  room_phone: { th: "โทรศัพท์", en: "Phone" },
  room_calendar: { th: "ปฏิทิน Google", en: "Google Calendar" },
  room_equipment: { th: "เครื่องมือประจำห้อง", en: "Equipment" },

  status_pending: { th: "รอดำเนินการ", en: "Pending" },
  status_approved: { th: "อนุมัติแล้ว", en: "Approved" },
  status_rejected: { th: "ปฏิเสธ", en: "Rejected" },
  status_cancelled: { th: "ยกเลิก", en: "Cancelled" },

  type_lab: { th: "ห้องปฏิบัติการ", en: "Laboratory" },
  type_pc: { th: "ห้องคอมพิวเตอร์", en: "Computer room" },
} satisfies Dict;

export type DictKey = keyof typeof dict;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: DictKey) => string };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("lang") : null;
    if (saved === "en" || saved === "th") setLangState(saved);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("lang", l);
  };
  const t = (k: DictKey) => dict[k][lang];
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
