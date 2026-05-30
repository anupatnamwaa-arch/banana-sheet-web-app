// Best-effort emoji for a Thai category name. Falls back to a neutral icon.
const RULES: [RegExp, string][] = [
  [/อาหาร|กิน|ข้าว|ร้าน/, "🍜"],
  [/กาแฟ|เครื่องดื่ม|ชา/, "☕"],
  [/เดินทาง|รถ|ขนส่ง|น้ำมัน|แท็กซี่|รถไฟ/, "🚆"],
  [/ช้อป|ซื้อของ|เสื้อผ้า|แฟชั่น/, "🛍️"],
  [/บ้าน|เช่า|บิล|ค่าน้ำ|ค่าไฟ|ที่พัก/, "🏠"],
  [/สุขภาพ|ยา|หมอ|โรงพยาบาล/, "💊"],
  [/บันเทิง|หนัง|เกม|เที่ยว/, "🎬"],
  [/การศึกษา|เรียน|หนังสือ/, "📚"],
  [/ลงทุน|หุ้น|ออม/, "📈"],
  [/ของใช้|ในบ้าน|ทำความสะอาด/, "🧴"],
];

export function categoryIcon(name: string): string {
  for (const [re, icon] of RULES) if (re.test(name)) return icon;
  return "💸";
}

export const CATEGORY_BAR_COLORS = [
  "#f87171",
  "#fb923c",
  "#facc15",
  "#34d399",
  "#38bdf8",
];
