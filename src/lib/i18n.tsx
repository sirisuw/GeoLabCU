import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "th" | "en";

type Dict = Record<string, { th: string; en: string }>;

export const dict = {
  nav_home: { th: "หน้าแรก", en: "Home" },
  nav_rooms: { th: "ห้อง", en: "Rooms" },
  nav_reserve: { th: "จอง", en: "Reserve" },
  nav_admin: { th: "ผู้ดูแล", en: "Admin" },

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
