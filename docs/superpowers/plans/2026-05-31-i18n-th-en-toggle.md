# TH/EN Language Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Thai/English language toggle to Settings, backed by a `bs-locale` cookie, with full UI translation across all app areas except Roast.

**Architecture:** A `bs-locale` cookie (default `th`) is read by `getLocale()` (server-only) so server components can render translated text on first paint. Client components consume the same dictionary through `LanguageProvider` context (`useT()` hook). The Settings toggle writes the cookie via a server action and calls `router.refresh()` to swap all text in-place without a hard reload. Functions are **not** stored in the dictionary (breaks React Server Component prop serialisation); parameterised strings use a `format(template, params)` helper instead.

**Tech Stack:** Next.js 16 `cookies()` (async), React context, TypeScript `as const` + `typeof` for typed dictionaries, no third-party i18n library.

---

## File map

**New files**
```
lib/i18n/dictionaries/th.ts        ← Thai dict, source-of-truth type
lib/i18n/dictionaries/en.ts        ← English dict, typed as `typeof th`
lib/i18n/index.ts                   ← getDictionary, type Dictionary, type Locale, format()
lib/i18n/locale.ts                  ← server-only getLocale()
lib/i18n/LanguageProvider.tsx       ← "use client" context + useT() + useLocale()
app/actions/locale.ts               ← setLocale server action
app/(dashboard)/settings/_components/LanguageSection.tsx
```

**Modified files (infrastructure)**
```
app/layout.tsx                      ← async, lang={locale}
app/(dashboard)/layout.tsx          ← wrap children with LanguageProvider
```

**Modified files (settings)**
```
app/(dashboard)/settings/page.tsx
app/(dashboard)/settings/_components/SettingsRow.tsx     ← comingSoonLabel prop
app/(dashboard)/settings/_components/AppearanceSection.tsx
app/(dashboard)/settings/_components/NotificationSection.tsx
app/(dashboard)/settings/_components/SavingsTargetSection.tsx
app/(dashboard)/settings/_components/DangerZone.tsx
app/(dashboard)/settings/_components/ProfileHeader.tsx
app/(dashboard)/settings/_components/EditProfileSheet.tsx
app/(dashboard)/settings/_components/BudgetList.tsx
app/(dashboard)/settings/_components/ApiKeySection.tsx
app/(dashboard)/settings/_components/ShortcutGuide.tsx
app/(dashboard)/settings/_components/CsvExportButton.tsx
app/(dashboard)/settings/_components/CsvImportDrawer.tsx
```

**Modified files (per-area translation)**
```
app/(dashboard)/_components/BottomNav.tsx
app/(dashboard)/_components/UniversalFabDrawer.tsx
app/(dashboard)/overview/page.tsx
app/(dashboard)/overview/_components/HomeHeader.tsx
app/(dashboard)/overview/_components/HomeBalanceCard.tsx
app/(dashboard)/overview/_components/HomeSummaryCards.tsx
app/(dashboard)/overview/_components/HomeBudgetProgress.tsx
app/(dashboard)/overview/_components/HomeTodayCard.tsx
app/(dashboard)/overview/_components/HomeRecentTransactions.tsx
app/(dashboard)/overview/_components/EmergencyRunwayCard.tsx
app/(dashboard)/overview/_components/DailyPaceCard.tsx
app/(dashboard)/overview/_components/HeroMetrics.tsx
app/(dashboard)/overview/_components/PeriodSelector.tsx
app/(dashboard)/transactions/page.tsx
app/(dashboard)/transactions/_components/TransactionsView.tsx
app/(dashboard)/transactions/_components/AdvancedFilterSheet.tsx
app/(dashboard)/analytics/page.tsx
app/(dashboard)/analytics/_components/PeriodPills.tsx
app/(dashboard)/analytics/_components/KeyMetrics.tsx
app/(dashboard)/analytics/_components/CategoryBars.tsx
app/(dashboard)/analytics/_components/IncomeExpenseTrend.tsx
app/(dashboard)/analytics/_components/SavingsRate.tsx
app/(dashboard)/analytics/_components/DailyPattern.tsx
app/(dashboard)/analytics/_components/TopSpendingInsight.tsx
app/(dashboard)/analytics/_components/ComparisonInsight.tsx
app/(dashboard)/analytics/_components/SmartInsights.tsx
app/(dashboard)/analytics/_components/AnalyticsEmptyState.tsx
app/(dashboard)/wealth/page.tsx
app/(dashboard)/wealth/_components/WealthView.tsx
app/(dashboard)/wealth/_components/WealthFormDrawer.tsx
app/(dashboard)/wealth/_components/GoalFormDrawer.tsx
app/(dashboard)/wealth/_components/WealthImportDrawer.tsx
app/(dashboard)/wealth/_components/WealthTrendChart.tsx
app/(dashboard)/wealth/_components/AssetGrowthChart.tsx
app/(auth)/login/page.tsx
app/(auth)/login/_components/LoginForm.tsx
app/(auth)/forgot-password/page.tsx
app/(auth)/reset-password/page.tsx
app/actions/home.ts                 ← add locale param; locale-aware monthLabel + insight strings
app/actions/analytics.ts            ← add locale param; locale-aware weekday labels + insights
app/actions/analytics-utils.ts     ← remove Thai labels from ANALYTICS_PERIODS (move to dict)
```

**Not translated (Roast stays Thai)**
```
app/(dashboard)/roast/           ← entire directory untouched
app/(dashboard)/analytics/_components/RoastEntryCard.tsx ← untouched
```

---

## Task 1: i18n infrastructure — dictionaries, locale, provider, format helper

**Files:**
- Create: `lib/i18n/dictionaries/th.ts`
- Create: `lib/i18n/dictionaries/en.ts`
- Create: `lib/i18n/index.ts`
- Create: `lib/i18n/locale.ts`
- Create: `lib/i18n/LanguageProvider.tsx`

- [ ] **Step 1: Create Thai dictionary**

```ts
// lib/i18n/dictionaries/th.ts
export const th = {
  common: {
    save: "บันทึก",
    cancel: "ยกเลิก",
    delete: "ลบ",
    close: "ปิด",
    edit: "แก้ไข",
    back: "กลับ",
    loading: "กำลังโหลด...",
    error: "เกิดข้อผิดพลาด",
    comingSoon: "เร็ว ๆ นี้",
    income: "รายรับ",
    expense: "รายจ่าย",
    savings: "เงินออม",
    all: "ทั้งหมด",
    transactions: "รายการ",
    unlockWithPro: "🔒 ปลดล็อกด้วย Pro",
  },
  calendar: {
    months: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
    yearOffset: 543,
    weekdayPrefix: "วัน",
  },
  nav: {
    home: "หน้าแรก",
    analytics: "วิเคราะห์",
    transactions: "รายการ",
    wealth: "ความมั่งคั่ง",
    addEntry: "เพิ่มรายการ",
  },
  fab: {
    title: "เพิ่มรายการ",
    amountPlaceholder: "จำนวนเงิน (฿)",
    categoryOptional: "— หมวดหมู่ (ไม่บังคับ) —",
    notePlaceholder: "หมายเหตุ (ไม่บังคับ)",
    submit: "บันทึก",
    submitting: "กำลังบันทึก...",
    typeExpense: "รายจ่าย",
    typeIncome: "รายรับ",
    typeSavings: "ออมเงิน",
    errorAmount: "กรุณากรอกจำนวนเงินที่ถูกต้อง",
  },
  overview: {
    greeting: "สวัสดี",
    monthSummary: "ภาพรวมการเงินเดือนนี้",
    balanceTitle: "เงินคงเหลือใช้เดือนนี้",
    balanceDailyAvg: "เฉลี่ยใช้ได้วันละ",
    statusOverBudget: "เกินแผนแล้ว ควรระวัง ⚠️",
    statusExact: "ใช้ครบแผนพอดี",
    statusEndOfMonth: "สิ้นเดือนแล้ว ทำได้ดี 🎉",
    statusOnTrack: "ยังอยู่ในแผน ใช้จ่ายได้สบาย ๆ",
    income: "รายรับ",
    expense: "รายจ่าย",
    cashFlow: "กระแสเงินสด",
    savingsAmount: "เงินออม",
    savingRate: "อัตราออม",
    budgetTitle: "งบใช้จ่ายเดือนนี้",
    budgetSpent: "ใช้ไปแล้ว",
    budgetOf: "จาก",
    budgetOverMsg: "เกินงบแล้ว",
    budgetWarnMsg: "ใกล้ถึงงบแล้ว ระวังนิดนึง",
    budgetLeftMsg: "เหลืองบอีก",
    todaySpent: "วันนี้ใช้ไป",
    todayBelowAvg: "น้อยกว่าค่าเฉลี่ยรายวัน",
    todayAboveAvg: "มากกว่าค่าเฉลี่ยรายวัน",
    recentTransactions: "รายการล่าสุด",
    viewAll: "ดูทั้งหมด",
    dateToday: "วันนี้",
    typeIncome: "รายรับ",
    typeExpense: "รายจ่าย",
    typeSavings: "เงินออม",
    emergencyRunway: "Emergency Runway",
    months: "เดือน",
    liquidAssets: "สินทรัพย์สภาพคล่อง",
    avgMonthlyExpense: "ค่าใช้จ่ายเฉลี่ย/เดือน",
    dailyPace: "Daily Pace",
    setupBudgetPrompt: "ตั้งงบประมาณเพื่อดู Daily Pace",
    setupNow: "ตั้งค่าเลย",
    budgetTarget: "เป้า",
    dayOf: "วันที่",
    pace: "Pace",
    noBudgetNote: "* ใช้ค่าใช้จ่ายเฉลี่ยเนื่องจากยังไม่ได้ตั้งงบ",
    setBudget: "ตั้งงบ",
  },
  transactions: {
    title: "รายการ",
    search: "ค้นหา",
    all: "ทั้งหมด",
    income: "รายรับ",
    expense: "รายจ่าย",
    savings: "เงินออม",
    today: "วันนี้",
    thisWeek: "สัปดาห์นี้",
    thisMonth: "เดือนนี้",
    noTransactions: "ยังไม่มีรายการ",
    noResults: "ไม่พบรายการที่ค้นหา",
    deleteConfirm: "ลบรายการนี้?",
    duplicate: "ทำซ้ำ",
    lt100: "น้อยกว่า ฿100",
    from100to500: "฿100–500",
    from501to1000: "฿501–1,000",
    gt1000: "มากกว่า ฿1,000",
    advancedFilter: "กรองขั้นสูง",
    filterType: "ประเภท",
    filterDate: "ช่วงเวลา",
    filterAmount: "ยอดเงิน",
    filterCategory: "หมวดหมู่",
    applyFilter: "ดูผลลัพธ์",
    clearFilter: "ล้างตัวกรอง",
    anyAmount: "ทุกจำนวน",
    anyCategory: "ทุกหมวด",
  },
  analytics: {
    title: "วิเคราะห์การเงิน",
    subtitle: "ดูพฤติกรรมรายรับ รายจ่าย และการออมของคุณ",
    periodThisMonth: "เดือนนี้",
    periodPrevMonth: "เดือนก่อน",
    periodThisYear: "ปีนี้",
    customRange: "เลือกช่วงเอง",
    rangeStart: "เริ่ม",
    rangeEnd: "ถึง",
    rangeInvalid: "เดือนเริ่มต้องไม่เกินเดือนสิ้นสุด",
    viewRange: "ดูข้อมูลช่วงนี้",
    totalExpense: "รายจ่ายรวม",
    totalIncome: "รายรับรวม",
    totalSavings: "เงินออมรวม",
    avgPerDay: "เฉลี่ยใช้ต่อวัน",
    avgPerDaySub: "ค่าใช้จ่ายเฉลี่ยรายวัน",
    noDataYet: "ยังไม่มีข้อมูล",
    newDataPeriod: "เริ่มมีข้อมูลช่วงนี้",
    nearlyFlat: "ใกล้เคียงช่วงก่อน",
    increased: "เพิ่มขึ้น",
    decreased: "ลดลง",
    fromPrev: "จากช่วงก่อน",
    savingPctTemplate: "ออมได้ {pct}% ของรายรับ",
    noIncome: "ยังไม่มีรายรับ",
    expenseByCategory: "รายจ่ายตามหมวดหมู่",
    incomeTrendTitle: "รายรับเทียบรายจ่าย",
    legendIncome: "รายรับ",
    legendExpense: "รายจ่าย",
    legendSavings: "เงินออม",
    monthRemainingTemplate: "เดือนนี้เหลือเงินหลังหักรายจ่ายและเงินออม",
    savingRateTitle: "อัตราการออม",
    savingRateTarget: "เป้าหมาย",
    savingRateSavedTemplate: "คุณออมได้ {amount} จากรายรับ {income}",
    savingRateReached: "ถึงเป้าหมายแล้ว เยี่ยมมาก 🎉",
    savingRateNearTemplate: "ใกล้ถึงเป้าหมายแล้ว อีกเพียง {gap}%",
    savingRateFarTemplate: "ยังห่างเป้าหมายอีก {gap}%",
    dailyPatternTitle: "พฤติกรรมการใช้เงินรายวัน",
    dailyPatternSub: "ค่าเฉลี่ยต่อวัน แยกตามวันในสัปดาห์",
    dailyPatternPeakLabel: "วันที่ใช้จ่ายเฉลี่ยสูงสุด:",
    dailyPatternAvgLabel: "ค่าเฉลี่ยต่อวัน:",
    tooltipAvg: "เฉลี่ย",
    topCategoryTitle: "หมวดที่ใช้เยอะที่สุด",
    topCategoryPctTemplate: "คิดเป็น {pct}% ของรายจ่ายทั้งหมด",
    topCategorySuggestTemplate: "💡 ลองตั้งงบ{name}ไว้ที่ {amount} ในเดือนหน้า",
    comparisonTitle: "เทียบกับช่วงก่อน",
    comparisonUp: "เพิ่มขึ้น",
    comparisonDown: "ลดลง",
    smartInsightsTitle: "ข้อสังเกต",
    emptyTitle: "ยังไม่มีข้อมูลให้วิเคราะห์",
    emptyDesc: "เริ่มบันทึกรายรับ รายจ่าย และเงินออมก่อน แล้วระบบจะแสดงภาพรวมให้คุณ",
    emptyHint: "แตะปุ่ม + ด้านล่างเพื่อเริ่มบันทึก",
  },
  wealth: {
    title: "ความมั่งคั่ง",
    subtitle: "ติดตามสินทรัพย์และหนี้สินของคุณ",
    netWorth: "มูลค่าสุทธิ",
    totalAssets: "สินทรัพย์รวม",
    totalLiabilities: "หนี้สินรวม",
    debtRatio: "สัดส่วนหนี้",
    assets: "สินทรัพย์",
    liabilities: "หนี้สิน",
    goals: "เป้าหมาย",
    emergencyFund: "เงินสำรองฉุกเฉิน",
    months: "เดือน",
    addAsset: "เพิ่มสินทรัพย์",
    addDebt: "เพิ่มหนี้สิน",
    addGoal: "เพิ่มเป้าหมาย",
    noAssets: "ยังไม่มีสินทรัพย์",
    noDebts: "ยังไม่มีหนี้สิน",
    noGoals: "ยังไม่มีเป้าหมาย",
    showAll: "ดูทั้งหมด",
    showLess: "แสดงน้อยลง",
    lastUpdated: "อัปเดตล่าสุด",
    importData: "นำเข้าข้อมูล",
    due: "ครบกำหนด",
    liquidAssets: "สินทรัพย์สภาพคล่อง",
    avgMonthlyExpense: "ค่าใช้จ่ายเฉลี่ย/เดือน",
    noWealthData: "ยังไม่มีข้อมูล",
    startTracking: "เริ่มบันทึกสินทรัพย์และหนี้สินของคุณ",
    unlockPro: "🔒 ปลดล็อกด้วย Pro",
    netWorthVsPrev: "เทียบเดือนก่อน",
  },
  settings: {
    title: "ตั้งค่า",
    subtitle: "จัดการข้อมูลส่วนตัวและการตั้งค่าแอป",
    sectionAccount: "บัญชี",
    sectionFinance: "ตั้งค่าการเงิน",
    sectionData: "ข้อมูล",
    sectionSecurity: "ความปลอดภัยและความเป็นส่วนตัว",
    sectionHelp: "ช่วยเหลือ",
    sectionDeveloper: "นักพัฒนา",
    sectionDanger: "โซนอันตราย",
    sectionAppearance: "หน้าตาแอป",
    sectionNotifications: "การแจ้งเตือน",
    sectionCategories: "หมวดหมู่และงบ",
    languageCurrency: "ภาษาและสกุลเงิน",
    language: "ภาษา",
    currencyLabel: "สกุลเงิน",
    plan: "แผนการใช้งาน",
    planFree: "ฟรี",
    billingCycle: "วันเริ่มรอบเดือน",
    billingCycleValue: "วันที่ 1",
    monthlyBudget: "งบใช้จ่ายรายเดือน",
    monthlyBudgetSub: "ตั้งงบแยกตามหมวด",
    emergencyGoal: "เป้าหมายเงินสำรองฉุกเฉิน",
    balanceMethod: "วิธีคำนวณเงินคงเหลือ",
    savingsTargetLabel: "เป้าหมายการออม",
    savingsTargetHint: "ตั้งเป้าว่าอยากออมกี่ % ของรายรับ ระบบจะใช้ค่านี้ในหน้าวิเคราะห์",
    savingsTargetSave: "บันทึกเป้าหมาย",
    savingsTargetSaving: "กำลังบันทึก…",
    savingsTargetSaved: "บันทึกแล้ว",
    savingsTargetError: "บันทึกไม่สำเร็จ",
    wallets: "บัญชีและกระเป๋าเงิน",
    themeTitle: "ธีมแอป",
    themeDark: "กล้วยกลางคืน",
    themeLight: "กล้วยครีม",
    themeSystem: "ตามระบบ",
    accentColor: "สีหลัก",
    accentColorValue: "กล้วยเหลือง (Banana)",
    hideBalance: "โหมดซ่อนยอดเงิน",
    hideBalanceDesc: "ปิดบังตัวเลขทุกรายการ",
    notificationToggle: "เปิดการแจ้งเตือน",
    notificationDesc: "รับการแจ้งเตือนประจำวัน",
    backup: "สำรองข้อมูล",
    lockApp: "ล็อกแอป",
    faceId: "Face ID / Touch ID",
    privacyPolicy: "นโยบายความเป็นส่วนตัว",
    downloadGuide: "ดาวน์โหลดคู่มือใช้งาน",
    downloadGuideDesc: "PDF — วิธีตั้งค่าและใช้งานครบทุกฟีเจอร์",
    downloadGuideBadge: "PDF",
    faq: "คำถามที่พบบ่อย",
    feedback: "ส่งความคิดเห็น",
    contact: "ติดต่อเรา",
    about: "เกี่ยวกับแอป",
    version: "เวอร์ชัน",
    freePlan: "แผนฟรี",
    editCue: "แก้ไข",
    displayNameLabel: "ชื่อที่แสดง",
    uploadPhoto: "เลือกรูปภาพ",
    saveProfile: "บันทึก",
    savingProfile: "กำลังบันทึก…",
    clearAllData: "ล้างข้อมูลทั้งหมด",
    clearAllDataSub: "ลบรายการ สินทรัพย์ หนี้สิน และเป้าหมายทั้งหมด",
    clearConfirmTitle: "ล้างข้อมูลทั้งหมด?",
    clearConfirmDesc: "รายการ สินทรัพย์ หนี้สิน เป้าหมาย และประวัติทั้งหมดจะถูกลบถาวร ไม่สามารถกู้คืนได้",
    clearCancel: "ยกเลิก",
    clearConfirmBtn: "ลบทั้งหมด",
    clearDeleting: "กำลังลบ…",
    clearError: "เกิดข้อผิดพลาด กรุณาลองใหม่",
    apiKeyTitle: "API Key",
    apiKeyDesc: "ใช้ Key นี้ใน iOS Shortcut เพื่อเพิ่มรายการผ่านแอปแชท",
    apiKeyGenerate: "สร้าง API Key",
    apiKeyGenerating: "กำลังสร้าง…",
    apiKeyCopied: "คัดลอกแล้ว!",
    apiKeyCopy: "แตะเพื่อคัดลอก",
    shortcutGuide: "วิธีตั้ง iOS Shortcut",
    csvExportTitle: "ส่งออกข้อมูล (CSV)",
    csvExportDesc: "รายการทั้งหมดเป็นไฟล์ CSV",
    csvExportBtn: "ส่งออก CSV",
    csvExporting: "กำลังส่งออก...",
    csvImportTitle: "นำเข้าข้อมูล (CSV)",
    csvImportBtn: "เลือกไฟล์ CSV",
    csvImporting: "กำลังนำเข้า...",
  },
  auth: {
    emailPlaceholder: "อีเมล",
    passwordPlaceholder: "รหัสผ่าน",
    loginButton: "เข้าสู่ระบบ",
    loginLoading: "กำลังเข้าสู่ระบบ…",
    signUp: "สมัครใหม่",
    forgotPassword: "ลืมรหัสผ่าน?",
    errorRequiredFields: "กรุณากรอกอีเมลและรหัสผ่าน",
    signUpSuccess: "ส่งอีเมลยืนยันแล้ว — หรือเข้าสู่ระบบได้เลยถ้าปิด email confirmation",
    forgotTitle: "ลืมรหัสผ่าน",
    forgotDesc: "กรอกอีเมลของคุณ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้",
    forgotSubmit: "ส่งลิงก์รีเซ็ต",
    forgotSuccess: "ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลแล้ว",
    backToLogin: "กลับไปหน้าล็อกอิน",
    resetTitle: "ตั้งรหัสผ่านใหม่",
    newPasswordPlaceholder: "รหัสผ่านใหม่",
    resetSubmit: "ตั้งรหัสผ่านใหม่",
    resetSuccess: "รีเซ็ตรหัสผ่านสำเร็จ",
    resetError: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน",
  },
} as const;

export type Dictionary = typeof th;
```

- [ ] **Step 2: Create English dictionary**

```ts
// lib/i18n/dictionaries/en.ts
import type { Dictionary } from "./th";

export const en: Dictionary = {
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    close: "Close",
    edit: "Edit",
    back: "Back",
    loading: "Loading...",
    error: "Something went wrong",
    comingSoon: "Coming soon",
    income: "Income",
    expense: "Expense",
    savings: "Savings",
    all: "All",
    transactions: "transactions",
    unlockWithPro: "🔒 Unlock with Pro",
  },
  calendar: {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    yearOffset: 0,
    weekdayPrefix: "",
  },
  nav: {
    home: "Home",
    analytics: "Analytics",
    transactions: "Transactions",
    wealth: "Wealth",
    addEntry: "Add entry",
  },
  fab: {
    title: "Add entry",
    amountPlaceholder: "Amount (฿)",
    categoryOptional: "— Category (optional) —",
    notePlaceholder: "Note (optional)",
    submit: "Save",
    submitting: "Saving...",
    typeExpense: "Expense",
    typeIncome: "Income",
    typeSavings: "Save",
    errorAmount: "Please enter a valid amount",
  },
  overview: {
    greeting: "Hello",
    monthSummary: "This month's financial overview",
    balanceTitle: "Spendable balance this month",
    balanceDailyAvg: "Daily budget left",
    statusOverBudget: "Over budget — watch out ⚠️",
    statusExact: "Exactly on budget",
    statusEndOfMonth: "End of month — great job 🎉",
    statusOnTrack: "On track — spend freely",
    income: "Income",
    expense: "Expense",
    cashFlow: "Cash flow",
    savingsAmount: "Savings",
    savingRate: "Saving rate",
    budgetTitle: "Monthly budget",
    budgetSpent: "Spent",
    budgetOf: "of",
    budgetOverMsg: "Over budget",
    budgetWarnMsg: "Almost at budget limit",
    budgetLeftMsg: "Budget left",
    todaySpent: "Spent today",
    todayBelowAvg: "below daily average",
    todayAboveAvg: "above daily average",
    recentTransactions: "Recent transactions",
    viewAll: "View all",
    dateToday: "Today",
    typeIncome: "Income",
    typeExpense: "Expense",
    typeSavings: "Savings",
    emergencyRunway: "Emergency Runway",
    months: "months",
    liquidAssets: "Liquid assets",
    avgMonthlyExpense: "Avg monthly expense",
    dailyPace: "Daily Pace",
    setupBudgetPrompt: "Set a budget to see Daily Pace",
    setupNow: "Set up now",
    budgetTarget: "Target",
    dayOf: "Day",
    pace: "Pace",
    noBudgetNote: "* Using avg expense — no budget set yet",
    setBudget: "Set budget",
  },
  transactions: {
    title: "Transactions",
    search: "Search",
    all: "All",
    income: "Income",
    expense: "Expense",
    savings: "Savings",
    today: "Today",
    thisWeek: "This week",
    thisMonth: "This month",
    noTransactions: "No transactions yet",
    noResults: "No results found",
    deleteConfirm: "Delete this entry?",
    duplicate: "Duplicate",
    lt100: "Under ฿100",
    from100to500: "฿100–500",
    from501to1000: "฿501–1,000",
    gt1000: "Over ฿1,000",
    advancedFilter: "Advanced filter",
    filterType: "Type",
    filterDate: "Date range",
    filterAmount: "Amount",
    filterCategory: "Category",
    applyFilter: "Apply filter",
    clearFilter: "Clear filters",
    anyAmount: "Any amount",
    anyCategory: "Any category",
  },
  analytics: {
    title: "Analytics",
    subtitle: "Track your income, expenses, and saving behaviour",
    periodThisMonth: "This month",
    periodPrevMonth: "Last month",
    periodThisYear: "This year",
    customRange: "Custom range",
    rangeStart: "From",
    rangeEnd: "To",
    rangeInvalid: "Start month must not exceed end month",
    viewRange: "View this range",
    totalExpense: "Total expense",
    totalIncome: "Total income",
    totalSavings: "Total savings",
    avgPerDay: "Daily average",
    avgPerDaySub: "Average daily expense",
    noDataYet: "No data yet",
    newDataPeriod: "New data this period",
    nearlyFlat: "Similar to previous period",
    increased: "up",
    decreased: "down",
    fromPrev: "from last period",
    savingPctTemplate: "Saved {pct}% of income",
    noIncome: "No income yet",
    expenseByCategory: "Expense by category",
    incomeTrendTitle: "Income vs expense",
    legendIncome: "Income",
    legendExpense: "Expense",
    legendSavings: "Savings",
    monthRemainingTemplate: "Remaining this month after expenses and savings",
    savingRateTitle: "Saving rate",
    savingRateTarget: "Target",
    savingRateSavedTemplate: "Saved {amount} from {income} income",
    savingRateReached: "Goal reached — great job 🎉",
    savingRateNearTemplate: "Almost there — just {gap}% to go",
    savingRateFarTemplate: "{gap}% away from goal",
    dailyPatternTitle: "Daily spending pattern",
    dailyPatternSub: "Average expense per weekday",
    dailyPatternPeakLabel: "Highest spending day:",
    dailyPatternAvgLabel: "Daily average:",
    tooltipAvg: "Avg",
    topCategoryTitle: "Top spending category",
    topCategoryPctTemplate: "{pct}% of total expenses",
    topCategorySuggestTemplate: "💡 Try setting a {name} budget of {amount} next month",
    comparisonTitle: "vs previous period",
    comparisonUp: "up",
    comparisonDown: "down",
    smartInsightsTitle: "Smart insights",
    emptyTitle: "No data to analyse yet",
    emptyDesc: "Add your first income, expense, or savings entry to get started",
    emptyHint: "Tap the + button below to add your first entry",
  },
  wealth: {
    title: "Wealth",
    subtitle: "Track your assets and liabilities",
    netWorth: "Net worth",
    totalAssets: "Total assets",
    totalLiabilities: "Total liabilities",
    debtRatio: "Debt ratio",
    assets: "Assets",
    liabilities: "Liabilities",
    goals: "Goals",
    emergencyFund: "Emergency fund",
    months: "months",
    addAsset: "Add asset",
    addDebt: "Add liability",
    addGoal: "Add goal",
    noAssets: "No assets yet",
    noDebts: "No liabilities yet",
    noGoals: "No goals yet",
    showAll: "Show all",
    showLess: "Show less",
    lastUpdated: "Last updated",
    importData: "Import data",
    due: "Due",
    liquidAssets: "Liquid assets",
    avgMonthlyExpense: "Avg monthly expense",
    noWealthData: "No wealth data yet",
    startTracking: "Start tracking your assets and liabilities",
    unlockPro: "🔒 Unlock with Pro",
    netWorthVsPrev: "vs last month",
  },
  settings: {
    title: "Settings",
    subtitle: "Manage your profile and app preferences",
    sectionAccount: "Account",
    sectionFinance: "Finance settings",
    sectionData: "Data",
    sectionSecurity: "Security & privacy",
    sectionHelp: "Help",
    sectionDeveloper: "Developer",
    sectionDanger: "Danger zone",
    sectionAppearance: "Appearance",
    sectionNotifications: "Notifications",
    sectionCategories: "Categories & budgets",
    languageCurrency: "Language & currency",
    language: "Language",
    currencyLabel: "Currency",
    plan: "Plan",
    planFree: "Free",
    billingCycle: "Billing cycle start",
    billingCycleValue: "Day 1",
    monthlyBudget: "Monthly budget",
    monthlyBudgetSub: "Set per-category budgets",
    emergencyGoal: "Emergency fund goal",
    balanceMethod: "Balance calculation method",
    savingsTargetLabel: "Savings goal",
    savingsTargetHint: "Target saving rate — used in the Analytics screen",
    savingsTargetSave: "Save target",
    savingsTargetSaving: "Saving…",
    savingsTargetSaved: "Saved",
    savingsTargetError: "Failed to save",
    wallets: "Accounts & wallets",
    themeTitle: "App theme",
    themeDark: "Banana Night",
    themeLight: "Banana Cream",
    themeSystem: "System",
    accentColor: "Accent colour",
    accentColorValue: "Banana Yellow",
    hideBalance: "Hide balance mode",
    hideBalanceDesc: "Mask all amounts",
    notificationToggle: "Enable notifications",
    notificationDesc: "Receive daily reminders",
    backup: "Back up data",
    lockApp: "Lock app",
    faceId: "Face ID / Touch ID",
    privacyPolicy: "Privacy policy",
    downloadGuide: "Download user guide",
    downloadGuideDesc: "PDF — setup and feature walkthrough",
    downloadGuideBadge: "PDF",
    faq: "FAQ",
    feedback: "Send feedback",
    contact: "Contact us",
    about: "About Banana Sheet",
    version: "Version",
    freePlan: "Free plan",
    editCue: "Edit",
    displayNameLabel: "Display name",
    uploadPhoto: "Choose photo",
    saveProfile: "Save",
    savingProfile: "Saving…",
    clearAllData: "Clear all data",
    clearAllDataSub: "Delete all transactions, assets, liabilities, and goals",
    clearConfirmTitle: "Clear all data?",
    clearConfirmDesc: "Transactions, assets, liabilities, goals, and all history will be permanently deleted and cannot be recovered.",
    clearCancel: "Cancel",
    clearConfirmBtn: "Delete all",
    clearDeleting: "Deleting…",
    clearError: "Something went wrong — please try again",
    apiKeyTitle: "API Key",
    apiKeyDesc: "Use this key in your iOS Shortcut to add entries via chat",
    apiKeyGenerate: "Generate API Key",
    apiKeyGenerating: "Generating…",
    apiKeyCopied: "Copied!",
    apiKeyCopy: "Tap to copy",
    shortcutGuide: "iOS Shortcut setup guide",
    csvExportTitle: "Export data (CSV)",
    csvExportDesc: "All transactions as a CSV file",
    csvExportBtn: "Export CSV",
    csvExporting: "Exporting...",
    csvImportTitle: "Import data (CSV)",
    csvImportBtn: "Choose CSV file",
    csvImporting: "Importing...",
  },
  auth: {
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    loginButton: "Sign in",
    loginLoading: "Signing in…",
    signUp: "Sign up",
    forgotPassword: "Forgot password?",
    errorRequiredFields: "Please enter your email and password",
    signUpSuccess: "Confirmation email sent — or sign in if email confirmation is disabled",
    forgotTitle: "Forgot password",
    forgotDesc: "Enter your email and we'll send you a reset link",
    forgotSubmit: "Send reset link",
    forgotSuccess: "Password reset link sent to your email",
    backToLogin: "Back to sign in",
    resetTitle: "Set new password",
    newPasswordPlaceholder: "New password",
    resetSubmit: "Set new password",
    resetSuccess: "Password reset successful",
    resetError: "Error resetting password",
  },
};
```

- [ ] **Step 3: Create index + format helper**

```ts
// lib/i18n/index.ts
import { th, type Dictionary } from "./dictionaries/th";
import { en } from "./dictionaries/en";

export type Locale = "th" | "en";
export type { Dictionary };

const dicts: Record<Locale, Dictionary> = { th, en };

export function getDictionary(locale: Locale): Dictionary {
  return dicts[locale];
}

/** Replace {key} placeholders in a template string. */
export function format(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}
```

- [ ] **Step 4: Create server-only getLocale**

```ts
// lib/i18n/locale.ts
import "server-only";
import { cookies } from "next/headers";
import type { Locale } from "./index";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const val = cookieStore.get("bs-locale")?.value;
  return val === "en" ? "en" : "th";
}
```

- [ ] **Step 5: Create LanguageProvider**

```tsx
// lib/i18n/LanguageProvider.tsx
"use client";

import { createContext, useContext } from "react";
import type { Dictionary, Locale } from "./index";

interface LanguageContextValue {
  locale: Locale;
  dict: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <LanguageContext.Provider value={{ locale, dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT(): Dictionary {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT must be used inside LanguageProvider");
  return ctx.dict;
}

export function useLocale(): Locale {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLocale must be used inside LanguageProvider");
  return ctx.locale;
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors from the new files.

- [ ] **Step 7: Commit**

```bash
git add lib/i18n/
git commit -m "feat(i18n): add dictionaries, locale resolver, LanguageProvider"
```

---

## Task 2: Wire root layout, dashboard layout, and locale server action

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/(dashboard)/layout.tsx`
- Create: `app/actions/locale.ts`

- [ ] **Step 1: Create setLocale server action**

```ts
// app/actions/locale.ts
"use server";

import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n";

export async function setLocale(locale: Locale): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("bs-locale", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
}
```

- [ ] **Step 2: Update root layout to be async and set lang dynamically**

Replace the entire `app/layout.tsx`:

```tsx
// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { getLocale } from "@/lib/i18n/locale";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-geist-sans",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Banana Sheet",
  description: "Frictionless personal finance. Log in a tap, see it beautifully.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Banana Sheet" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Update dashboard layout to wrap children with LanguageProvider**

Replace `app/(dashboard)/layout.tsx`:

```tsx
// app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { BottomNav } from "./_components/BottomNav";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // if (!user) redirect("/login"); // TODO: re-enable auth before launch

  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <LanguageProvider locale={locale} dict={dict}>
      <div className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        {children}
        <BottomNav />
      </div>
    </LanguageProvider>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/(dashboard)/layout.tsx app/actions/locale.ts
git commit -m "feat(i18n): wire LanguageProvider into dashboard layout, dynamic html lang"
```

---

## Task 3: Language toggle UI in Settings

**Files:**
- Create: `app/(dashboard)/settings/_components/LanguageSection.tsx`
- Modify: `app/(dashboard)/settings/_components/SettingsRow.tsx` — add `comingSoonLabel` prop
- Modify: `app/(dashboard)/settings/page.tsx` — read locale+dict, wire section titles, remove comingSoon hardcoded text

- [ ] **Step 1: Add comingSoonLabel prop to SettingsRow**

In `app/(dashboard)/settings/_components/SettingsRow.tsx`, update the Props interface and the badge render:

```tsx
interface Props {
  icon?: React.ReactNode;
  label: string;
  sublabel?: string;
  value?: string;
  badge?: string;
  danger?: boolean;
  comingSoon?: boolean;
  comingSoonLabel?: string;   // ← new
  onClick?: () => void;
  right?: React.ReactNode;
}

export function SettingsRow({
  icon, label, sublabel, value, badge, danger, comingSoon, comingSoonLabel, onClick, right,
}: Props) {
  // ... existing render ...
  // change the comingSoon badge to use comingSoonLabel:
  {comingSoon && (
    <span className="shrink-0 rounded-full bg-[var(--glass-bg)] px-2 py-0.5 text-[10px] text-fg-muted">
      {comingSoonLabel ?? "เร็ว ๆ นี้"}
    </span>
  )}
  // ... rest unchanged ...
}
```

- [ ] **Step 2: Create LanguageSection component**

```tsx
// app/(dashboard)/settings/_components/LanguageSection.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { useT, useLocale } from "@/lib/i18n/LanguageProvider";
import type { Locale } from "@/lib/i18n";

export function LanguageSection() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  const options: { value: Locale; label: string }[] = [
    { value: "th", label: "ไทย" },
    { value: "en", label: "English" },
  ];

  return (
    <div className={`px-4 py-3.5 ${isPending ? "opacity-60" : ""}`}>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
          🌏
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">{t.settings.languageCurrency}</p>
          <p className="mt-0.5 text-xs text-fg-muted">{t.settings.currencyLabel}: THB</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            disabled={isPending}
            className={`rounded-2xl border py-3 text-sm font-medium transition-all ${
              locale === opt.value
                ? "border-accent bg-accent/10 text-accent"
                : "border-[var(--glass-border)] text-fg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update settings page to use locale+dict**

Replace `app/(dashboard)/settings/page.tsx` with the translated version (all Thai hardcoded strings replaced by `t.*` lookups, `comingSoonLabel={t.common.comingSoon}` added to every `comingSoon` row, section titles from dict):

```tsx
// app/(dashboard)/settings/page.tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Profile } from "@/lib/types";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n";

import { SettingsSection } from "./_components/SettingsSection";
import { SettingsRow } from "./_components/SettingsRow";
import { AppearanceSection } from "./_components/AppearanceSection";
import { NotificationSection } from "./_components/NotificationSection";
import { DangerZone } from "./_components/DangerZone";
import { SavingsTargetSection } from "./_components/SavingsTargetSection";
import { BudgetList } from "./_components/BudgetList";
import { CsvExportButton } from "./_components/CsvExportButton";
import { CsvImportDrawer } from "./_components/CsvImportDrawer";
import { ApiKeySection } from "./_components/ApiKeySection";
import { ShortcutGuide } from "./_components/ShortcutGuide";
import { ProfileHeader } from "./_components/ProfileHeader";
import { LanguageSection } from "./_components/LanguageSection";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at, api_key, savings_target_pct, display_name, avatar_url")
    .eq("id", userId)
    .single();

  const profile = profileData as Pick<
    Profile,
    "is_active" | "plan_expires_at" | "api_key" | "savings_target_pct" | "display_name" | "avatar_url"
  > | null;

  const savingsTarget = profile?.savings_target_pct ?? 20;
  const apiKey = profile?.api_key ?? null;
  const isPro = true; // DEMO

  const displayName =
    profile?.display_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Demo";
  const avatarUrl = profile?.avatar_url ?? null;
  const email = user?.email ?? "demo@example.com";

  const locale = await getLocale();
  const t = getDictionary(locale);
  const cs = t.common.comingSoon;

  return (
    <section className="space-y-5 pb-10">
      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/overview"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg)]"
          aria-label={t.common.back}
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t.settings.title}</h1>
          <p className="text-xs text-fg-muted">{t.settings.subtitle}</p>
        </div>
      </div>

      <ProfileHeader
        userId={userId}
        initialName={displayName}
        initialAvatarUrl={avatarUrl}
        email={email}
      />

      {/* 1. Account */}
      <SettingsSection title={t.settings.sectionAccount}>
        <LanguageSection />
        <SettingsRow icon="⭐" label={t.settings.plan} badge={t.settings.planFree} comingSoon comingSoonLabel={cs} />
      </SettingsSection>

      {/* 2. Finance */}
      <SettingsSection title={t.settings.sectionFinance}>
        <SettingsRow icon="📅" label={t.settings.billingCycle} value={t.settings.billingCycleValue} comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="💰" label={t.settings.monthlyBudget} sublabel={t.settings.monthlyBudgetSub} comingSoon comingSoonLabel={cs} />
        <div className="px-1">
          <SavingsTargetSection initialTarget={savingsTarget} />
        </div>
        <SettingsRow icon="🛡️" label={t.settings.emergencyGoal} comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="⚖️" label={t.settings.balanceMethod} comingSoon comingSoonLabel={cs} />
      </SettingsSection>

      {/* 3. Categories */}
      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {t.settings.sectionCategories}
        </p>
        <BudgetList userId={userId} isPro={isPro} />
        <div className="mt-2 overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)]">
          <SettingsRow icon="👛" label={t.settings.wallets} comingSoon comingSoonLabel={cs} />
        </div>
      </div>

      {/* 4. Appearance */}
      <AppearanceSection />

      {/* 5. Notifications */}
      <NotificationSection />

      {/* 6. Data */}
      <SettingsSection title={t.settings.sectionData}>
        <div className="px-4 py-2"><CsvExportButton /></div>
        <div className="px-4 py-2"><CsvImportDrawer /></div>
        <SettingsRow icon="☁️" label={t.settings.backup} comingSoon comingSoonLabel={cs} />
      </SettingsSection>

      {/* 7. Security */}
      <SettingsSection title={t.settings.sectionSecurity}>
        <SettingsRow icon="🔒" label={t.settings.lockApp} comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="🫆" label={t.settings.faceId} comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="📄" label={t.settings.privacyPolicy} comingSoon comingSoonLabel={cs} />
      </SettingsSection>

      {/* 8. Help */}
      <SettingsSection title={t.settings.sectionHelp}>
        <a
          href="/guide.pdf"
          download
          className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--glass-bg)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">📥</span>
          <div className="flex-1">
            <p className="text-sm font-medium">{t.settings.downloadGuide}</p>
            <p className="mt-0.5 text-xs text-fg-muted">{t.settings.downloadGuideDesc}</p>
          </div>
          <span className="text-xs text-fg-muted">{t.settings.downloadGuideBadge}</span>
        </a>
        <SettingsRow icon="❓" label={t.settings.faq} comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="💬" label={t.settings.feedback} comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="📧" label={t.settings.contact} comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="🍌" label={t.settings.about} comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="🏷️" label={t.settings.version} value="1.0.0" />
      </SettingsSection>

      <div className="overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)]">
        <ShortcutGuide />
      </div>

      <SettingsSection title={t.settings.sectionDeveloper}>
        <div className="px-1"><ApiKeySection initialKey={apiKey} /></div>
      </SettingsSection>

      <DangerZone />
    </section>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/settings/
git commit -m "feat(i18n): language toggle in Settings, translated settings page"
```

---

## Task 4: Translate remaining Settings client components

Each component below is `"use client"` — add `const t = useT()` at the top and replace Thai strings.

**Files:**
- Modify: `app/(dashboard)/settings/_components/AppearanceSection.tsx`
- Modify: `app/(dashboard)/settings/_components/NotificationSection.tsx`
- Modify: `app/(dashboard)/settings/_components/SavingsTargetSection.tsx`
- Modify: `app/(dashboard)/settings/_components/DangerZone.tsx`
- Modify: `app/(dashboard)/settings/_components/ProfileHeader.tsx`
- Modify: `app/(dashboard)/settings/_components/ApiKeySection.tsx`
- Modify: `app/(dashboard)/settings/_components/ShortcutGuide.tsx`
- Modify: `app/(dashboard)/settings/_components/CsvExportButton.tsx`
- Modify: `app/(dashboard)/settings/_components/CsvImportDrawer.tsx`

- [ ] **Step 1: AppearanceSection**

Add `import { useT } from "@/lib/i18n/LanguageProvider";` and `const t = useT();` inside the component.

Replace every Thai string:
- `"หน้าตาแอป"` → `t.settings.sectionAppearance` (in `SettingsSection title=`)
- `"ธีมแอป"` → `t.settings.themeTitle`
- `{ id: "dark", label: "กล้วยกลางคืน", emoji: "🌙" }` → `{ id: "dark", label: t.settings.themeDark, emoji: "🌙" }`
- `{ id: "light", label: "กล้วยครีม", emoji: "🍌" }` → `{ id: "light", label: t.settings.themeLight, emoji: "🍌" }`
- `{ id: "system", label: "ตามระบบ", emoji: "📱" }` → `{ id: "system", label: t.settings.themeSystem, emoji: "📱" }`
- `"สีหลัก"` → `t.settings.accentColor`
- `"กล้วยเหลือง (Banana)"` → `t.settings.accentColorValue`
- `"โหมดซ่อนยอดเงิน"` → `t.settings.hideBalance`
- `"ปิดบังตัวเลขทุกรายการ"` → `t.settings.hideBalanceDesc`

Note: the `THEMES` array must be computed inside the component (after `const t = useT()`) since its labels reference `t`.

- [ ] **Step 2: NotificationSection**

Read the file, add `const t = useT()`, replace:
- section title `"การแจ้งเตือน"` → `t.settings.sectionNotifications`
- `"เปิดการแจ้งเตือน"` → `t.settings.notificationToggle`
- notification description → `t.settings.notificationDesc`

- [ ] **Step 3: SavingsTargetSection**

Add `const t = useT()`, replace:
- `"เป้าหมายการออม"` → `t.settings.savingsTargetLabel`
- `"ตั้งเป้าว่าอยากออมกี่ % ของรายรับ..."` → `t.settings.savingsTargetHint`
- `"กำลังบันทึก…"` → `t.settings.savingsTargetSaving`
- `"บันทึกแล้ว"` → `t.settings.savingsTargetSaved`
- `"บันทึกเป้าหมาย"` → `t.settings.savingsTargetSave`
- `"บันทึกไม่สำเร็จ"` → `t.settings.savingsTargetError`

- [ ] **Step 4: DangerZone**

Add `const t = useT()`, replace:
- section title `"โซนอันตราย"` → `t.settings.sectionDanger`
- `"ล้างข้อมูลทั้งหมด"` → `t.settings.clearAllData`
- `"ลบรายการ สินทรัพย์..."` → `t.settings.clearAllDataSub`
- confirm dialog title → `t.settings.clearConfirmTitle`
- confirm dialog body → `t.settings.clearConfirmDesc`
- `"ยกเลิก"` → `t.settings.clearCancel`
- `"กำลังลบ…"` → `t.settings.clearDeleting`
- `"ลบทั้งหมด"` → `t.settings.clearConfirmBtn`
- error → `t.settings.clearError`

- [ ] **Step 5: ProfileHeader**

Add `const t = useT()`, replace:
- `"แผนฟรี"` badge → `t.settings.freePlan`
- `"แก้ไข"` cue → `t.settings.editCue`

- [ ] **Step 6: ApiKeySection — read the file first, then replace**

```bash
# Read app/(dashboard)/settings/_components/ApiKeySection.tsx first (already done during planning)
```
Add `const t = useT()`, replace all Thai strings using `t.settings.apiKey*` keys.

- [ ] **Step 7: ShortcutGuide**

Add `const t = useT()`, replace `"วิธีตั้ง iOS Shortcut"` → `t.settings.shortcutGuide` (and any other Thai strings in the guide body using appropriate new dict keys if needed — add new keys to both `th.ts` and `en.ts`).

- [ ] **Step 8: CsvExportButton + CsvImportDrawer**

Add `const t = useT()`, replace Thai strings using `t.settings.csv*` keys.

- [ ] **Step 9: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add app/(dashboard)/settings/_components/
git commit -m "feat(i18n): translate settings client components"
```

---

## Task 5: Translate Nav and FAB Drawer

**Files:**
- Modify: `app/(dashboard)/_components/BottomNav.tsx`
- Modify: `app/(dashboard)/_components/UniversalFabDrawer.tsx`

- [ ] **Step 1: BottomNav**

Add `import { useT } from "@/lib/i18n/LanguageProvider";` and `const t = useT();` inside `BottomNav`.

Replace the `LEFT_TABS` and `RIGHT_TABS` constants. Because they reference `t`, move them inside the component body:

```tsx
export function BottomNav() {
  const t = useT();
  const pathname = usePathname();
  // ...

  const LEFT_TABS = [
    { href: "/overview", label: t.nav.home, Icon: House },
    { href: "/analytics", label: t.nav.analytics, Icon: ChartLine },
  ];

  const RIGHT_TABS = [
    { href: "/transactions", label: t.nav.transactions, Icon: CreditCard },
    { href: "/wealth", label: t.nav.wealth, Icon: Wallet },
  ];

  // FAB aria-label:
  // aria-label={t.nav.addEntry}
```

- [ ] **Step 2: UniversalFabDrawer**

Add `const t = useT();`, replace:
- `"เพิ่มรายการ"` (header) → `t.fab.title`
- `aria-label="ปิด"` → `aria-label={t.common.close}`
- `"รายจ่าย"` pill → `t.fab.typeExpense`
- `"รายรับ"` pill → `t.fab.typeIncome`
- `"ออมเงิน"` pill → `t.fab.typeSavings`
- `placeholder="จำนวนเงิน (฿)"` → `placeholder={t.fab.amountPlaceholder}`
- `"— หมวดหมู่ (ไม่บังคับ) —"` → `t.fab.categoryOptional`
- `placeholder="หมายเหตุ (ไม่บังคับ)"` → `placeholder={t.fab.notePlaceholder}`
- submit button text → `t.fab.submit` / `t.fab.submitting`
- error `"กรุณากรอกจำนวนเงินที่ถูกต้อง"` → `t.fab.errorAmount`
- error `"เกิดข้อผิดพลาด"` → `t.common.error`

- [ ] **Step 3: Verify build and commit**

```bash
npx tsc --noEmit
git add app/(dashboard)/_components/
git commit -m "feat(i18n): translate BottomNav and FAB drawer"
```

---

## Task 6: Translate Overview

**Files:**
- Modify: `app/(dashboard)/overview/page.tsx`
- Modify: `app/actions/home.ts`
- Modify: `app/(dashboard)/overview/_components/HomeHeader.tsx`
- Modify: `app/(dashboard)/overview/_components/HomeBalanceCard.tsx`
- Modify: `app/(dashboard)/overview/_components/HomeSummaryCards.tsx`
- Modify: `app/(dashboard)/overview/_components/HomeBudgetProgress.tsx`
- Modify: `app/(dashboard)/overview/_components/HomeTodayCard.tsx`
- Modify: `app/(dashboard)/overview/_components/HomeRecentTransactions.tsx`
- Modify: `app/(dashboard)/overview/_components/EmergencyRunwayCard.tsx`
- Modify: `app/(dashboard)/overview/_components/DailyPaceCard.tsx`
- Modify: `app/(dashboard)/overview/_components/HeroMetrics.tsx`
- Modify: `app/(dashboard)/overview/_components/PeriodSelector.tsx`

- [ ] **Step 1: Update home.ts to accept locale**

In `app/actions/home.ts`, import `format` and the dict, then add `locale` param:

```ts
// app/actions/home.ts — diff
import { getDictionary, format, type Locale } from "@/lib/i18n";

// change MONTH_NAMES_SHORT to locale-aware
export async function getHomeData(userId: string, locale: Locale = "th") {
  const t = getDictionary(locale);
  const MONTH_NAMES_SHORT = t.calendar.months;
  const yearOffset = t.calendar.yearOffset;

  // ... existing logic unchanged ...

  // insight strings — replace the Thai hardcoded templates:
  // Was: `เดือนนี้คุณออมได้ ${rate}% ของรายรับแล้ว 🎉`
  // Now:
  if (totalIncome > 0 && totalSavings > 0) {
    const rate = Math.round((totalSavings / totalIncome) * 100);
    insight = format(
      locale === "en"
        ? "Saved {rate}% of income this month 🎉"
        : "เดือนนี้คุณออมได้ {rate}% ของรายรับแล้ว 🎉",
      { rate }
    );
  } else if (budgetTotal > 0 && totalExpense > 0) {
    const pct = Math.round((totalExpense / budgetTotal) * 100);
    if (pct > 90) {
      insight = format(
        locale === "en"
          ? "Used {pct}% of budget — watch out ⚠️"
          : "ใช้งบไปแล้ว {pct}% ระวังนิดนึงนะ ⚠️",
        { pct }
      );
    } else if (daysRemaining > 0) {
      const dailyBudget = Math.max(0, Math.round((budgetTotal - totalExpense) / daysRemaining));
      insight = format(
        locale === "en"
          ? "Daily budget remaining: {amount}"
          : "ใช้ได้อีกวันละประมาณ {amount} จนถึงสิ้นเดือน",
        { amount: THB(dailyBudget) }
      );
    }
  }

  return {
    // ... existing fields ...
    monthLabel: `${MONTH_NAMES_SHORT[month - 1]} ${year + yearOffset}`,
  };
}
```

- [ ] **Step 2: Update overview page to read locale and pass dict**

```tsx
// app/(dashboard)/overview/page.tsx — add at top of the async function:
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary, type Dictionary } from "@/lib/i18n";

// inside OverviewPage():
const locale = await getLocale();
const t = getDictionary(locale);
const home = await getHomeData(userId, locale);  // ← pass locale

// pass t.overview to each component:
<HomeHeader displayName={displayName} monthLabel={home.monthLabel} dict={t.overview} />
<HomeBalanceCard remaining={home.remaining} daysRemaining={home.daysRemaining} dict={t.overview} />
<HomeSummaryCards ... dict={t.overview} />
<HomeBudgetProgress ... dict={t.overview} />
<HomeTodayCard ... dict={t.overview} />
<HomeRecentTransactions transactions={home.recentTransactions} dict={t.overview} locale={locale} />
```

- [ ] **Step 3: Update each overview server component to accept dict prop**

For each server component, add `dict: Dictionary["overview"]` to its Props interface and replace hardcoded strings.

**HomeHeader** — `dict.greeting`, `dict.monthSummary`:
```tsx
interface Props {
  displayName: string;
  monthLabel: string;
  dict: Dictionary["overview"];
}
export function HomeHeader({ displayName, monthLabel, dict }: Props) {
  return (
    <div ...>
      <p className="text-lg font-bold">{dict.greeting}, {displayName} 👋</p>
      <p className="mt-0.5 text-xs text-fg-muted">{dict.monthSummary}</p>
      // ...
    </div>
  );
}
```

**HomeBalanceCard** — replace all status text and labels with `dict.*`:
```tsx
interface Props { remaining: number; daysRemaining: number; dict: Dictionary["overview"]; }
function statusText(remaining: number, daysRemaining: number, dict: Dictionary["overview"]) {
  if (remaining < 0) return { text: dict.statusOverBudget, color: "text-negative" };
  if (remaining === 0) return { text: dict.statusExact, color: "text-amber-400" };
  if (daysRemaining === 0) return { text: dict.statusEndOfMonth, color: "text-positive" };
  return { text: dict.statusOnTrack, color: "text-positive" };
}
// labels: dict.balanceTitle, dict.balanceDailyAvg
```

**HomeSummaryCards** — `dict.income`, `dict.expense`, `dict.savingsAmount`, `dict.savingRate`

**HeroMetrics** — same keys (also add `dict` prop, used in both overview and analytics contexts; import `Dictionary` from `@/lib/i18n`)

**HomeBudgetProgress** — `dict.budgetTitle`, `dict.budgetSpent`, `dict.budgetOf`, compose status messages inline:
```tsx
let statusMsg: string;
if (isOver) statusMsg = `${dict.budgetOverMsg} ${fmt(Math.abs(remaining))} ⚠️`;
else if (isWarn) statusMsg = dict.budgetWarnMsg;
else statusMsg = `${dict.budgetLeftMsg} ${fmt(remaining)}`;
```

**HomeTodayCard** — `dict.todaySpent`, `dict.todayBelowAvg`, `dict.todayAboveAvg`, `{todayCount} ${t_common_transactions}` (pass `dict` + access `common.transactions` — easiest: pass the full `Dictionary["overview"]` and a separate `transactionsLabel: string` prop, or import the transactions label from the same namespace. Simplest: use the `overview.typeExpense` etc. — actually this one uses `t.common.transactions`. Since server components can get dict from props, you can also pass `transactionsLabel={t.common.transactions}` from the page.

**HomeRecentTransactions** — needs both `dict` and `locale` for `fmtDate`. Update `fmtDate` to use locale param:
```tsx
interface Props {
  transactions: RecentTransaction[];
  dict: Dictionary["overview"];
  locale: Locale;
}
function fmtDate(iso: string, locale: Locale, todayLabel: string): string {
  const localeCode = locale === "th" ? "th-TH" : "en-US";
  const d = new Date(iso);
  const now = new Date();
  const todayStr = now.toLocaleDateString(localeCode, { timeZone: "Asia/Bangkok" });
  const txStr = d.toLocaleDateString(localeCode, { timeZone: "Asia/Bangkok" });
  if (todayStr === txStr) {
    return `${todayLabel} ${d.toLocaleTimeString(localeCode, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })}`;
  }
  return d.toLocaleDateString(localeCode, { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
}
```
Replace `TYPE_LABELS` using `dict.typeIncome / typeExpense / typeSavings`.
Replace `"รายการล่าสุด"` → `dict.recentTransactions`, `"ดูทั้งหมด"` → `dict.viewAll`.

**EmergencyRunwayCard** — `dict.emergencyRunway`, `dict.months`, `dict.liquidAssets`, `dict.avgMonthlyExpense`, `dict.unlockWithPro` (use `t.common.unlockWithPro`)

**DailyPaceCard** — `dict.dailyPace`, `dict.setupBudgetPrompt`, `dict.setupNow`, `dict.budgetTarget`, `dict.dayOf`, `dict.pace`, `dict.noBudgetNote`, `dict.setBudget`

**PeriodSelector** — This is a client component (`"use client"`), so it uses `useT()`:
```tsx
const t = useT();
const PRESETS = [
  { value: "3m" as Period, label: locale === "en" ? "Last 3 months" : "3 เดือนล่าสุด" },
  // ...
];
```
Actually add these to the dict. Add to `th.ts` → `overview: { period3m: "3 เดือนล่าสุด", periodYear: "ปีนี้", periodAll: "ทั้งหมด", periodCustom: "กำหนดเอง", periodTo: "ถึง", periodConfirm: "ตกลง" }` and matching English in `en.ts`, then use in `PeriodSelector`.

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/overview/ app/actions/home.ts
git commit -m "feat(i18n): translate Overview and home.ts"
```

---

## Task 7: Translate Transactions

**Files:**
- Modify: `app/(dashboard)/transactions/page.tsx`
- Modify: `app/(dashboard)/transactions/_components/TransactionsView.tsx`
- Modify: `app/(dashboard)/transactions/_components/AdvancedFilterSheet.tsx`

- [ ] **Step 1: Transactions page — pass locale down if needed**

`app/(dashboard)/transactions/page.tsx` — read locale, pass to `TransactionsView` if needed (TransactionsView is client so it uses `useT()` directly — no prop needed).

- [ ] **Step 2: TransactionsView — add useT()**

`TransactionsView` is `"use client"`. Add `const t = useT(); const locale = useLocale();`.

- Replace hardcoded `THAI_SHORT` month array: use `t.calendar.months`.
- Replace `TYPE_PILLS` labels: `t.transactions.all`, `t.transactions.income`, `t.transactions.expense`, `t.transactions.savings`.
- Replace `DATE_PILLS` labels: `t.transactions.today`, `t.transactions.thisWeek`, `t.transactions.thisMonth`.
- Replace `"ทั้งหมด"`, `"ยังไม่มีรายการ"`, `"ไม่พบรายการที่ค้นหา"` → `t.transactions.*`.
- Replace `"ลบรายการนี้?"` → `t.transactions.deleteConfirm`.
- Replace `"ทำซ้ำ"` → `t.transactions.duplicate`.
- Replace search placeholder `"ค้นหา"` → `t.transactions.search`.
- Replace date formatting: use `locale === "en" ? "en-US" : "th-TH"` in `toLocaleDateString` calls.
- Year display: use `+ t.calendar.yearOffset` for BE years.

- [ ] **Step 3: AdvancedFilterSheet — add useT()**

Add `const t = useT();`, replace all filter labels with `t.transactions.*` keys.

- [ ] **Step 4: Verify + commit**

```bash
npx tsc --noEmit
git add app/(dashboard)/transactions/
git commit -m "feat(i18n): translate Transactions"
```

---

## Task 8: Translate Analytics

**Files:**
- Modify: `app/actions/analytics.ts`
- Modify: `app/actions/analytics-utils.ts`
- Modify: `app/(dashboard)/analytics/page.tsx`
- Modify: `app/(dashboard)/analytics/_components/PeriodPills.tsx`
- Modify: `app/(dashboard)/analytics/_components/KeyMetrics.tsx`
- Modify: `app/(dashboard)/analytics/_components/CategoryBars.tsx`
- Modify: `app/(dashboard)/analytics/_components/IncomeExpenseTrend.tsx`
- Modify: `app/(dashboard)/analytics/_components/SavingsRate.tsx`
- Modify: `app/(dashboard)/analytics/_components/DailyPattern.tsx`
- Modify: `app/(dashboard)/analytics/_components/TopSpendingInsight.tsx`
- Modify: `app/(dashboard)/analytics/_components/ComparisonInsight.tsx`
- Modify: `app/(dashboard)/analytics/_components/SmartInsights.tsx`
- Modify: `app/(dashboard)/analytics/_components/AnalyticsEmptyState.tsx`

- [ ] **Step 1: analytics.ts — add locale param for weekday arrays and smart insights**

```ts
// app/actions/analytics.ts — change getAnalyticsData signature:
import { format, type Locale } from "@/lib/i18n";

export async function getAnalyticsData(
  userId: string,
  period: AnalyticsPeriod,
  savingsTarget: number,
  range?: { from: string; to: string },
  locale: Locale = "th"
) {
  // Replace hardcoded WD arrays:
  const WD_SHORT = locale === "en"
    ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
    : ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
  const WD_FULL = locale === "en"
    ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    : ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

  // Smart insights — replace Thai templates:
  if (topMover && topMover.delta > 0) {
    insights.push(
      locale === "en"
        ? `${topMover.name} spending is higher than last period by ฿${Math.round(topMover.delta).toLocaleString("en-US")}`
        : `เดือนนี้ค่า${topMover.name}สูงกว่าช่วงก่อน ฿${Math.round(topMover.delta).toLocaleString("th-TH")}`
    );
  }
  if (insights.length < 2 && totalExpense > 0) {
    const cut = 150;
    insights.push(
      locale === "en"
        ? `Cutting ฿${cut}/day could save you ~฿${(cut * 30).toLocaleString("en-US")}/month`
        : `ถ้าลดค่าใช้จ่ายวันละ ฿${cut} คุณจะออมเพิ่มได้ประมาณ ฿${(cut * 30).toLocaleString("th-TH")} ต่อเดือน`
    );
  }
  if (insights.length < 2 && savingRate !== null && savingRate >= savingsTarget) {
    insights.push(
      locale === "en"
        ? `Great job! You've saved ${savingRate}% — goal reached 🎉`
        : `เยี่ยมมาก! คุณออมได้ ${savingRate}% ถึงเป้าหมายแล้ว 🎉`
    );
  }
```

- [ ] **Step 2: analytics-utils.ts — remove Thai labels from ANALYTICS_PERIODS**

`ANALYTICS_PERIODS` is used only for the `id` in `PeriodPills` (labels come from dict now). Remove the `label` field or keep it as English fallback. Simplest: keep the array but `PeriodPills` no longer reads `p.label` — it looks up the dict key by `p.id`:

```ts
// analytics-utils.ts
export const ANALYTICS_PERIODS: { id: AnalyticsPeriod }[] = [
  { id: "month" },
  { id: "prevmonth" },
  { id: "year" },
];
```

- [ ] **Step 3: Analytics page — read locale, pass dict to server components**

```tsx
// app/(dashboard)/analytics/page.tsx
const locale = await getLocale();
const t = getDictionary(locale);
const analytics = await getAnalyticsData(userId, period, savingsTarget, range, locale);

// pass dict.analytics to server-component children:
<header>
  <h1>{t.analytics.title}</h1>
  <p>{t.analytics.subtitle}</p>
</header>
<AnalyticsEmptyState dict={t.analytics} />  // if no data
<KeyMetrics metrics={analytics.metrics} dict={t.analytics} />
<CategoryBars categories={analytics.categories} dict={t.analytics} />
<SavingsRate ... dict={t.analytics} />
<TopSpendingInsight topCategory={analytics.topCategory} dict={t.analytics} />
<ComparisonInsight movers={analytics.movers} dict={t.analytics} />
<SmartInsights insights={analytics.insights} dict={t.analytics} />
```

Client components (`PeriodPills`, `IncomeExpenseTrend`, `DailyPattern`) use `useT()` directly — no prop needed.

- [ ] **Step 4: PeriodPills — useT() + locale-aware month/year**

```tsx
const t = useT();
const locale = useLocale();

// THAI_MONTHS → t.calendar.months
// year display: y + t.calendar.yearOffset
// pill labels by id:
const periodLabel: Record<string, string> = {
  month: t.analytics.periodThisMonth,
  prevmonth: t.analytics.periodPrevMonth,
  year: t.analytics.periodThisYear,
};
// custom range pill:
// "เลือกช่วงเอง" → t.analytics.customRange
// picker labels: t.analytics.rangeStart, t.analytics.rangeEnd
// error: t.analytics.rangeInvalid
// button: t.analytics.viewRange
```

- [ ] **Step 5: Server analytics components — add dict prop**

Each takes `dict: Dictionary["analytics"]`.

**KeyMetrics:**
```tsx
interface Props { metrics: MetricSummary; dict: Dictionary["analytics"]; }
// card labels: dict.totalExpense, dict.totalIncome, dict.totalSavings, dict.avgPerDay
// changeText helper:
function changeText(current: number, prev: number, dict: Dictionary["analytics"]): string {
  if (prev === 0) return current > 0 ? dict.newDataPeriod : dict.noDataYet;
  const pct = Math.round(((current - prev) / prev) * 100);
  if (Math.abs(pct) <= 2) return dict.nearlyFlat;
  return pct > 0
    ? `${dict.increased} ${pct}% ${dict.fromPrev}`
    : `${dict.decreased} ${Math.abs(pct)}% ${dict.fromPrev}`;
}
// savings sub: format(dict.savingPctTemplate, { pct: metrics.savingRate }) or dict.noIncome
// avgPerDaySub: dict.avgPerDaySub
```

**CategoryBars:**
```tsx
interface Props { categories: CategoryRow[]; dict: Dictionary["analytics"]; }
// "รายจ่ายตามหมวดหมู่" → dict.expenseByCategory
// "ดูทั้งหมด" → use t.overview.viewAll (or add to analytics dict — simplest: pass common separately or use a shared key)
// Add to both dicts: analytics.viewAll: "ดูทั้งหมด" / "View all"
```

**SavingsRate (server component):**
```tsx
interface Props { ...; dict: Dictionary["analytics"]; }
// "อัตราการออม" → dict.savingRateTitle
// "เป้าหมาย {n}%" → `${dict.savingRateTarget} ${target}%`
// sub text: format(dict.savingRateSavedTemplate, { amount: formatTHB(totalSavings), income: formatTHB(totalIncome) })
// statusMsg: 
//   reached → dict.savingRateReached
//   near → format(dict.savingRateNearTemplate, { gap })
//   far → format(dict.savingRateFarTemplate, { gap })
```

**TopSpendingInsight (server component):**
```tsx
// "หมวดที่ใช้เยอะที่สุด" → dict.topCategoryTitle
// pct line → format(dict.topCategoryPctTemplate, { pct: topCategory.pct })
// suggest → format(dict.topCategorySuggestTemplate, { name: topCategory.name, amount: formatTHB(suggested) })
```

**ComparisonInsight (server component):**
```tsx
// "เทียบกับช่วงก่อน" → dict.comparisonTitle
// detail: m.pct ? `${up ? dict.comparisonUp : dict.comparisonDown} ${Math.abs(m.pct)}%` : ...
```

**SmartInsights (server component):**
```tsx
interface Props { insights: string[]; dict: Dictionary["analytics"]; }
// "ข้อสังเกต" → dict.smartInsightsTitle
```

**AnalyticsEmptyState (server component):**
```tsx
interface Props { dict: Dictionary["analytics"]; }
// all three strings → dict.emptyTitle, dict.emptyDesc, dict.emptyHint
```

- [ ] **Step 6: Client analytics components — useT()**

**IncomeExpenseTrend:**
```tsx
const t = useT();
// THAI_MONTHS → t.calendar.months
// year offset in label fn → t.calendar.yearOffset
// chart title "รายรับเทียบรายจ่าย" → t.analytics.incomeTrendTitle
// legend labels → t.analytics.legendIncome / legendExpense / legendSavings
// tooltip: t.analytics.legendIncome / legendExpense / legendSavings
// remaining text: `${t.analytics.monthRemainingTemplate}` + the amount span
```

**DailyPattern:**
```tsx
const t = useT();
// "พฤติกรรมการใช้เงินรายวัน" → t.analytics.dailyPatternTitle
// "ค่าเฉลี่ยต่อวัน..." → t.analytics.dailyPatternSub
// peakWeekday text: `${t.analytics.dailyPatternPeakLabel} ${t.calendar.weekdayPrefix}${peakWeekday.fullLabel}`
// avg text: `${t.analytics.dailyPatternAvgLabel} ${formatTHB(...)}`
// tooltip "เฉลี่ย" → t.analytics.tooltipAvg
```

- [ ] **Step 7: Verify + commit**

```bash
npx tsc --noEmit
git add app/(dashboard)/analytics/ app/actions/analytics.ts app/actions/analytics-utils.ts
git commit -m "feat(i18n): translate Analytics"
```

---

## Task 9: Translate Wealth

**Files:**
- Modify: `app/(dashboard)/wealth/page.tsx`
- Modify: `app/(dashboard)/wealth/_components/WealthView.tsx`
- Modify: `app/(dashboard)/wealth/_components/WealthFormDrawer.tsx`
- Modify: `app/(dashboard)/wealth/_components/GoalFormDrawer.tsx`
- Modify: `app/(dashboard)/wealth/_components/WealthImportDrawer.tsx`
- Modify: `app/(dashboard)/wealth/_components/WealthTrendChart.tsx`
- Modify: `app/(dashboard)/wealth/_components/AssetGrowthChart.tsx`

- [ ] **Step 1: Wealth page — pass locale to WealthView**

`WealthView` is a client component, so it uses `useT()`. The wealth page just renders `<WealthView data={data} />` — no dict prop needed. However, `app/actions/wealth-data.ts` may have Thai strings (asset icon regex patterns use Thai). These are internal and don't need translation.

Locale for date formatting in `WealthView.thaiDate()` — this function is inside the client component, so use `useLocale()`:

```tsx
// WealthView.tsx — replace thaiDate:
const locale = useLocale();
const t = useT();

function formatDate(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
  const [y, m, dd] = parts.split("-").map(Number);
  if (locale === "en") {
    return `${dd} ${t.calendar.months[m - 1]} ${y}`;
  }
  return `${dd} ${t.calendar.months[m - 1]} ${y + t.calendar.yearOffset}`;
}
```

- [ ] **Step 2: WealthView — useT(), replace all Thai strings**

Add `const t = useT(); const locale = useLocale();` at top.

Key strings to replace:
- Section headings: `t.wealth.netWorth`, `t.wealth.totalAssets`, `t.wealth.totalLiabilities`, `t.wealth.debtRatio`, `t.wealth.assets`, `t.wealth.liabilities`, `t.wealth.goals`, `t.wealth.emergencyFund`, `t.wealth.months`
- Buttons: `t.wealth.addAsset`, `t.wealth.addDebt`, `t.wealth.addGoal`
- Empty states: `t.wealth.noAssets`, `t.wealth.noDebts`, `t.wealth.noGoals`
- `t.wealth.showAll`, `t.wealth.showLess`, `t.wealth.lastUpdated`
- `t.wealth.importData`
- `dueLabel` function: `t.wealth.due` + date from `formatDate`
- `t.common.unlockWithPro` for Pro lock overlay
- `THAI_MONTHS` → `t.calendar.months` (used in `thaiDate` — now replaced by `formatDate`)
- Net worth change: `t.wealth.netWorthVsPrev`
- No-data empty state: `t.wealth.noWealthData`, `t.wealth.startTracking`

- [ ] **Step 3: WealthFormDrawer, GoalFormDrawer, WealthImportDrawer — useT()**

Each is a client component. Add `const t = useT();`, replace Thai form labels, buttons, placeholders using `t.wealth.*` and `t.common.*`. Add any missing keys to both `th.ts` and `en.ts`.

- [ ] **Step 4: WealthTrendChart, AssetGrowthChart — useT()**

Replace Thai chart labels and month arrays.

- [ ] **Step 5: Verify + commit**

```bash
npx tsc --noEmit
git add app/(dashboard)/wealth/
git commit -m "feat(i18n): translate Wealth"
```

---

## Task 10: Translate Auth pages

Auth pages are outside the dashboard layout, so `LanguageProvider` is not available. Pattern: each page reads locale + dict on the server, passes `dict.auth` to its client form component as a prop.

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/login/_components/LoginForm.tsx`
- Modify: `app/(auth)/forgot-password/page.tsx`
- Modify: `app/(auth)/reset-password/page.tsx`

- [ ] **Step 1: Login page — read locale, pass dict.auth to LoginForm**

```tsx
// app/(auth)/login/page.tsx
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary, type Dictionary } from "@/lib/i18n";

export default async function LoginPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <main ...>
      {/* existing content */}
      <LoginForm dict={t.auth} />
    </main>
  );
}
```

- [ ] **Step 2: LoginForm — accept dict prop**

```tsx
// app/(auth)/login/_components/LoginForm.tsx
interface Props {
  dict: Dictionary["auth"];
}

export function LoginForm({ dict }: Props) {
  // replace all Thai strings:
  // placeholder="อีเมล" → placeholder={dict.emailPlaceholder}
  // placeholder="รหัสผ่าน" → placeholder={dict.passwordPlaceholder}
  // "กำลังเข้าสู่ระบบ…" → dict.loginLoading
  // "เข้าสู่ระบบ" (button) → dict.loginButton
  // "สมัครใหม่" → dict.signUp
  // "ลืมรหัสผ่าน?" → dict.forgotPassword
  // error "กรุณากรอกอีเมลและรหัสผ่าน" → dict.errorRequiredFields
  // signUp success msg → dict.signUpSuccess
}
```

- [ ] **Step 3: ForgotPassword page + component**

Same pattern: page reads locale → passes `dict.auth` → form component uses prop.

```tsx
// forgot-password/page.tsx — pass dict.auth as prop
// form component: dict.forgotTitle, dict.forgotDesc, emailPlaceholder, forgotSubmit, forgotSuccess, backToLogin
```

- [ ] **Step 4: ResetPassword page + component**

```tsx
// reset-password: dict.resetTitle, newPasswordPlaceholder, resetSubmit, resetSuccess, resetError
```

- [ ] **Step 5: Verify + commit**

```bash
npx tsc --noEmit
git add app/(auth)/
git commit -m "feat(i18n): translate auth pages"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full type check**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: successful build, no type errors.

- [ ] **Step 3: Manual smoke test**

Start dev server: `npm run dev`

1. Open Settings → toggle to English → confirm Settings text swaps without reload.
2. Navigate to Overview, Transactions, Analytics, Wealth — confirm English text.
3. Navigate to Roast — confirm it stays Thai.
4. Toggle back to Thai — confirm all text reverts.
5. Refresh page — confirm locale persists (cookie retained).
6. Check `<html lang>` attribute in DevTools — switches between `th` and `en`.
7. THB formatting (`฿1,234`) unchanged on both locales.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(i18n): complete TH/EN language toggle"
```
