export function AnalyticsEmptyState() {
  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-8 text-center">
      <p className="text-3xl">📊</p>
      <p className="mt-3 text-base font-semibold">ยังไม่มีข้อมูลให้วิเคราะห์</p>
      <p className="mt-1 text-sm text-fg-muted">
        เริ่มบันทึกรายรับ รายจ่าย และเงินออมก่อน แล้วระบบจะแสดงภาพรวมให้คุณ
      </p>
      <p className="mt-4 text-xs text-fg-muted">แตะปุ่ม + ด้านล่างเพื่อเริ่มบันทึก</p>
    </div>
  );
}
