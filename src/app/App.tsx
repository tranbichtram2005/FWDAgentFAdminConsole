import React, { useState, useMemo, useEffect } from "react";
import {
  Settings2, FileText, Users, ClipboardCheck, Video, BarChart2,
  Shuffle, Bell, TrendingUp, ChevronLeft, ChevronRight, Search,
  Download, Plus, AlertTriangle, Clock, Eye, CheckSquare, Square,
  ChevronDown, LogOut, X, RefreshCw, Building, Calendar, ArrowUp,
  ArrowDown, ChevronsUpDown, Send, PenLine, ThumbsUp, RotateCcw,
  FileCheck, UserCheck, TrendingDown, Award, MoreHorizontal,
  Lock, Info, Check, CircleDot, CheckCircle2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell as RCell
} from "recharts";
import { clsx } from "clsx";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type Page = "dashboard" | "program-management" | "candidate-management"
  | "submission-review" | "interview-management" | "office-matching";
type RoundNum = 1 | 2 | 3 | 4;

// Round Status (3.5): trạng thái cấp VÒNG — hệ thống hoặc admin set
// "Retry" KHÔNG tồn tại ở cấp vòng (chỉ có ở cấp bài nộp — SubmissionLifecycle)
type StatusType = "In Progress" | "Qualified" | "Not Qualified" | "Completed" | "At Risk";

// Round Operational Status (1.2): kiểm soát cấu hình (threshold, trọng số...)
type RoundOpStatus = "Not Started" | "Open" | "Closed";

// Submission Lifecycle (4.5): vòng đời cấp BÀI NỘP — tách biệt hoàn toàn với Round Status
type SubmissionLifecycle = "Submitted" | "Reviewing" | "Retry" | "Resubmitted" | "Approved";

type TeamType = "Team Alpha" | "Team Beta" | "Team Gamma" | "Team Delta" | "Team Sigma";
type SubmissionStatus = "Pending" | "Reviewing" | "Reviewed";
type SubmissionType = "Essay" | "Case Study" | "AI Simulation" | "Assignment";

interface Participant {
  id: string; name: string; email: string;
  university: string; major: string;
  round: RoundNum; status: StatusType;
  team: TeamType | null; mentor: string | null;
  capability: number; commitment: number; advisoryFit: number;
  bonus: number; submittedAt: string;
}

interface Submission {
  id: string; participantId: string; participantName: string;
  round: RoundNum; submissionType: SubmissionType;
  submittedAt: string; column: SubmissionStatus;
  lifecycle: SubmissionLifecycle;
  content: string;
  capabilityScore?: number; commitmentScore?: number; advisoryFitScore?: number;
  comment?: string;
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const ROUND_WEIGHTS: Record<RoundNum, { cap: number; com: number; adv: number }> = {
  1: { cap: 0.40, com: 0.30, adv: 0.30 },
  2: { cap: 0.35, com: 0.35, adv: 0.30 },
  3: { cap: 0.30, com: 0.30, adv: 0.40 },
  4: { cap: 0.25, com: 0.30, adv: 0.45 },
};

// Round Status badges (3.5) — cấp vòng, không có Retry
const statusConfig: Record<StatusType, { cls: string; dot: string; label: string }> = {
  "In Progress":   { cls: "bg-blue-50 text-blue-700 border border-blue-200",          dot: "bg-blue-500",    label: "In Progress" },
  "Qualified":     { cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500", label: "Qualified" },
  "Not Qualified": { cls: "bg-red-50 text-red-700 border border-red-200",              dot: "bg-red-500",     label: "Not Qualified" },
  "Completed":     { cls: "bg-teal-50 text-teal-700 border border-teal-200",           dot: "bg-teal-500",    label: "Completed" },
  "At Risk":       { cls: "bg-orange-50 text-orange-700 border border-orange-200",     dot: "bg-orange-500",  label: "At Risk" },
};

// Round Operational Status (1.2/1.4) — khóa/mở cấu hình threshold
const ROUND_OP_STATUS: Record<RoundNum, RoundOpStatus> = {
  1: "Closed",
  2: "Closed",
  3: "Open",
  4: "Not Started",
};

const roundOpConfig: Record<RoundOpStatus, { cls: string; dot: string; icon: React.ElementType; thresholdEditable: boolean }> = {
  "Not Started": { cls: "bg-gray-100 text-gray-500 border border-gray-200",           dot: "bg-gray-400",    icon: Clock,    thresholdEditable: true },
  "Open":        { cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",  dot: "bg-emerald-500", icon: CircleDot, thresholdEditable: false },
  "Closed":      { cls: "bg-slate-100 text-slate-500 border border-slate-200",       dot: "bg-slate-400",   icon: Lock,     thresholdEditable: false },
};

const roundConfig: Record<RoundNum, { label: string; cls: string }> = {
  1: { label: "Round 1", cls: "bg-slate-100 text-slate-600" },
  2: { label: "Round 2", cls: "bg-violet-100 text-violet-700" },
  3: { label: "Round 3", cls: "bg-cyan-100 text-cyan-700" },
  4: { label: "Finals",  cls: "bg-orange-100 text-orange-700" },
};

const subTypeConfig: Record<SubmissionType, { cls: string; label: string }> = {
  "Essay":         { cls: "bg-indigo-50 text-indigo-700", label: "Essay" },
  "Case Study":    { cls: "bg-teal-50 text-teal-700",     label: "Case Study" },
  "AI Simulation": { cls: "bg-purple-50 text-purple-700", label: "AI Simulation" },
  "Assignment":    { cls: "bg-rose-50 text-rose-700",     label: "Assignment" },
};

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// SIDEBAR NAV — 6 flat module items
// ─────────────────────────────────────────────────────────────
type NavModule = { id: Page; label: string; icon: React.ElementType; badge?: string };

const NAV_MODULES: NavModule[] = [
  { id: "dashboard",           label: "Dashboard",            icon: BarChart2 },
  { id: "office-matching",     label: "Office Matching",      icon: Shuffle },
  { id: "program-management",  label: "Program Management",   icon: Settings2 },
  { id: "candidate-management",label: "Candidate Management", icon: Users,         badge: "12" },
  { id: "submission-review",   label: "Submission Review",    icon: ClipboardCheck, badge: "5" },
  { id: "interview-management",label: "Interview Management", icon: Video },
];

// ─────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────
const PARTICIPANTS: Participant[] = [
  { id: "A001", name: "Nguyễn Thị Minh Anh", email: "minhanh@gmail.com", university: "UEH", major: "Finance - Banking", round: 3, status: "In Progress", team: "Team Alpha", mentor: "Lê Văn Hùng", capability: 82, commitment: 88, advisoryFit: 85, bonus: 5, submittedAt: "15/03/2024" },
  { id: "A002", name: "Trần Hoàng Nam", email: "hoangnam@gmail.com", university: "FTU", major: "International Economics", round: 2, status: "At Risk", team: "Team Beta", mentor: null, capability: 65, commitment: 70, advisoryFit: 62, bonus: 0, submittedAt: "14/03/2024" }, // At Risk = admin flag: điểm thấp, cần theo dõi
  { id: "A003", name: "Phạm Thị Lan Hương", email: "lanhuong@gmail.com", university: "NEU", major: "Business Administration", round: 3, status: "Qualified", team: "Team Gamma", mentor: "Nguyễn Văn Khoa", capability: 90, commitment: 85, advisoryFit: 88, bonus: 10, submittedAt: "13/03/2024" },
  { id: "A004", name: "Lê Đức Anh", email: "ducanh@gmail.com", university: "HUST", major: "Financial Engineering", round: 1, status: "Not Qualified", team: null, mentor: null, capability: 55, commitment: 60, advisoryFit: 50, bonus: 0, submittedAt: "12/03/2024" },
  { id: "A005", name: "Vũ Ngọc Bảo", email: "ngocbao@gmail.com", university: "BUH", major: "Insurance", round: 3, status: "In Progress", team: "Team Delta", mentor: "Phạm Thị Hoa", capability: 78, commitment: 82, advisoryFit: 80, bonus: 5, submittedAt: "11/03/2024" },
  { id: "A006", name: "Đinh Thị Thanh Tâm", email: "thanhtam@gmail.com", university: "UEH", major: "Marketing", round: 2, status: "In Progress", team: "Team Sigma", mentor: null, capability: 72, commitment: 75, advisoryFit: 70, bonus: 0, submittedAt: "10/03/2024" },
  { id: "A007", name: "Hoàng Minh Khải", email: "minhkhai@gmail.com", university: "FTU", major: "International Finance", round: 4, status: "In Progress", team: "Team Alpha", mentor: "Trần Thị Bích", capability: 88, commitment: 90, advisoryFit: 87, bonus: 8, submittedAt: "09/03/2024" },
  { id: "A008", name: "Ngô Thị Diễm Quỳnh", email: "diemquynh@gmail.com", university: "VNU-HCM", major: "Business Administration", round: 3, status: "At Risk", team: "Team Beta", mentor: "Lê Văn Hùng", capability: 68, commitment: 65, advisoryFit: 72, bonus: 0, submittedAt: "08/03/2024" },
  { id: "A009", name: "Bùi Thanh Tùng", email: "thanhtung@gmail.com", university: "NEU", major: "Economics", round: 2, status: "Not Qualified", team: null, mentor: null, capability: 0, commitment: 0, advisoryFit: 0, bonus: 0, submittedAt: "07/03/2024" },
  { id: "A010", name: "Đặng Thị Thu Thảo", email: "thuthao@gmail.com", university: "BUH", major: "Finance - Banking", round: 4, status: "Qualified", team: "Team Gamma", mentor: "Nguyễn Văn Khoa", capability: 92, commitment: 88, advisoryFit: 90, bonus: 15, submittedAt: "06/03/2024" },
  { id: "A011", name: "Lý Hoàng Long", email: "hoanglong@gmail.com", university: "UEH", major: "Insurance", round: 3, status: "In Progress", team: "Team Delta", mentor: "Phạm Thị Hoa", capability: 80, commitment: 78, advisoryFit: 83, bonus: 3, submittedAt: "05/03/2024" },
  { id: "A012", name: "Trịnh Thị Mỹ Hạnh", email: "myhanh@gmail.com", university: "FTU", major: "Business Administration", round: 2, status: "In Progress", team: "Team Sigma", mentor: null, capability: 75, commitment: 80, advisoryFit: 73, bonus: 0, submittedAt: "04/03/2024" },
  { id: "A013", name: "Phan Đức Trọng", email: "ductrong@gmail.com", university: "HUST", major: "Economics", round: 1, status: "Qualified", team: null, mentor: null, capability: 77, commitment: 74, advisoryFit: 76, bonus: 0, submittedAt: "03/03/2024" },
  { id: "A014", name: "Võ Thị Ngọc Trinh", email: "ngoctrinh@gmail.com", university: "VNU-HCM", major: "Marketing", round: 3, status: "In Progress", team: "Team Alpha", mentor: "Trần Thị Bích", capability: 83, commitment: 87, advisoryFit: 84, bonus: 5, submittedAt: "02/03/2024" },
  { id: "A015", name: "Cao Hoàng Phúc", email: "hoangphuc@gmail.com", university: "UEH", major: "International Finance", round: 4, status: "In Progress", team: "Team Beta", mentor: "Lê Văn Hùng", capability: 86, commitment: 84, advisoryFit: 88, bonus: 10, submittedAt: "01/03/2024" },
  { id: "A016", name: "Huỳnh Thị Bích Ngọc", email: "bichngoc@gmail.com", university: "BUH", major: "Insurance", round: 2, status: "At Risk", team: "Team Gamma", mentor: null, capability: 63, commitment: 68, advisoryFit: 65, bonus: 0, submittedAt: "29/02/2024" },
  { id: "A017", name: "Dương Văn Kiên", email: "vankien@gmail.com", university: "NEU", major: "Business Administration", round: 3, status: "In Progress", team: "Team Delta", mentor: "Phạm Thị Hoa", capability: 79, commitment: 81, advisoryFit: 77, bonus: 2, submittedAt: "28/02/2024" },
  { id: "A018", name: "Lưu Thị Khánh Linh", email: "khanhlinh@gmail.com", university: "FTU", major: "Finance - Banking", round: 4, status: "Completed", team: "Team Sigma", mentor: "Nguyễn Văn Khoa", capability: 91, commitment: 89, advisoryFit: 93, bonus: 12, submittedAt: "27/02/2024" },
  { id: "A019", name: "Tống Quốc Bảo", email: "quocbao@gmail.com", university: "VNU-HCM", major: "International Economics", round: 1, status: "Not Qualified", team: null, mentor: null, capability: 48, commitment: 55, advisoryFit: 50, bonus: 0, submittedAt: "26/02/2024" },
  { id: "A020", name: "Chu Thị Thanh Xuân", email: "thanhxuan@gmail.com", university: "UEH", major: "Marketing", round: 2, status: "In Progress", team: "Team Alpha", mentor: "Trần Thị Bích", capability: 74, commitment: 76, advisoryFit: 71, bonus: 0, submittedAt: "25/02/2024" },
];

const SUBMISSIONS: Submission[] = [
  {
    id: "S001", participantId: "A001", participantName: "Nguyễn Thị Minh Anh",
    round: 3, submissionType: "Essay", submittedAt: "15/03 09:30", column: "Pending", lifecycle: "Submitted" as SubmissionLifecycle,
    content: `Essay: The Role of FWD Agent in Protecting Vietnamese Families' Financial Future

In a context where life insurance awareness in Vietnam remains low (only about 11% of the population holds life insurance, compared to 40–60% in more developed ASEAN countries), the FWD Agent's role is not merely to sell products — but to serve as a financial advisor, companion, and protector of each family's life plan.

Five core values of an outstanding FWD Agent:

1. Empathy First — Listen before advising
Every client has their own financial situation, goals, and concerns. A great Agent puts themselves in the client's shoes to truly understand what they need — not just push products to hit a quota.

2. Financial Literacy — Elevating financial knowledge
An Agent doesn't just explain contract terms; they help clients understand the concept of comprehensive financial protection: life insurance, emergency funds, and long-term investment.

3. Trust over Transaction — Building trust instead of transactions
The Agent–client relationship must be built on a foundation of transparency and honesty. A loyal client over 20 years creates 10 times more value than a one-time contract.

4. Lifelong Learning — Continuously updating knowledge
Insurance products, regulations, and markets change constantly. Agents must commit to continuous learning to provide the most accurate and relevant advice at any given time.

5. Community Impact — Making a difference
Every insurance contract signed is a family protected against unforeseen risks. FWD Agents are genuinely making a difference in the community.`,
  },
  {
    id: "S002", participantId: "A005", participantName: "Vũ Ngọc Bảo",
    round: 3, submissionType: "Case Study", submittedAt: "14/03 14:15", column: "Pending", lifecycle: "Submitted" as SubmissionLifecycle,
    content: `Case Study: Insurance Advisory for Mr. Minh Tuan's Family, Age 38, with 2 Young Children

Background: Minh Tuan is an IT Project Manager earning 45M VND/month. His wife is a teacher earning 12M VND/month. They have 2 children (ages 7 and 4) and a 1.2B VND home loan with 15 years remaining.

Risk Analysis:
• Primary income risk: If Minh Tuan becomes unable to work, the family loses 45M VND/month and cannot service the loan
• Education risk: University costs for 2 children estimated at 800M–1.2B VND over the next 10–14 years
• Health risk: Treatment costs for critical illness can reach 500M–2B VND

Advisory Solution:
1. Term Life Insurance — Coverage 3B VND, premium ~6M VND/year
   → Protects the family against mortality risk; sufficient to repay the loan and support both children
2. Critical Illness Rider (CI Rider) — Coverage 500M VND
   → Protection against 35 common critical illnesses
3. Education Savings Plan — FWD Education Plan, contributing 5M VND/month
   → Guarantees 1.2B VND for both children's university education

Outcome: After 3 advisory sessions, Minh Tuan agreed to a comprehensive protection package at 11M VND/month (24% of income — within the recommended 20–30% range). The client felt the genuine professionalism and care.`,
  },
  {
    id: "S003", participantId: "A008", participantName: "Ngô Thị Diễm Quỳnh",
    round: 3, submissionType: "AI Simulation", submittedAt: "14/03 16:45", column: "Pending", lifecycle: "Resubmitted" as SubmissionLifecycle,
    content: `AI Simulation — Scenario: Client objects to buying insurance because "it's a waste of money"

Client (Mr. Hai, age 32): "I don't really trust insurance. You pay for decades, and when you actually need it they find every excuse not to pay. And if nothing happens, the money is just gone. I'd rather save it myself."

My response:
"Mr. Hai, I completely understand your concerns — and honestly, this is a question that many smart people ask. Let me share a different perspective.

On the claim denial concern: FWD has a benefit payout rate of 98.7% in 2023 (FWD Vietnam Annual Report). Denials typically only occur in cases of fraud or misrepresentation at the time of application — something that is entirely within your control.

On 'losing money': You're right if we're talking about term life insurance. But consider this: you pay 500K VND/month (6M VND/year) to receive 1B VND in coverage. If nothing happens in 20 years, you've 'lost' 120M VND. But what if you need 1B VND and have no insurance?

If you want both protection and a return on premium, I can introduce FWD Wealth Protect — a product combining insurance and investment, where most of the premiums are returned after 20 years.

Which option feels right for you: focused protection at a lower cost, or protection combined with savings?"`,
  },
  {
    id: "S004", participantId: "A011", participantName: "Lý Hoàng Long",
    round: 3, submissionType: "Essay", submittedAt: "13/03 11:20", column: "Pending", lifecycle: "Submitted" as SubmissionLifecycle,
    content: `Essay: Building a Sustainable Client Portfolio — Strategy of the Next-Generation FWD Agent

In the insurance industry, a common paradox holds that 80% of revenue comes from 20% of loyal clients. Yet most Agents spend 80% of their time searching for new clients instead of nurturing existing relationships.

A 3-phase strategy for building a sustainable portfolio:

Phase 1 (Months 1–6): Foundation Building
• Clearly define your ideal client profile: income level, life stage, financial goals
• Build 50 quality relationships rather than 200 cold contacts
• Each client must be followed up at least once per quarter

Phase 2 (Months 7–18): Value Deepening
• Host mini financial seminars for groups of 5–10 loyal clients
• Provide free annual financial reviews — revisiting insurance plans as life circumstances change
• Referral program: each client refers an average of 2.3 new prospects (per industry research)

Phase 3 (Year 2+): Community Building
• Create a "FWD Family" community group for clients: sharing financial knowledge and product updates
• Evolve into a true "Financial Advisor," not just a sales Agent
• Target: 150 loyal clients = stable revenue of 200–300M VND/year`,
  },
  {
    id: "S005", participantId: "A014", participantName: "Võ Thị Ngọc Trinh",
    round: 3, submissionType: "Assignment", submittedAt: "13/03 09:00", column: "Pending", lifecycle: "Submitted" as SubmissionLifecycle,
    content: `Assignment: 90-Day Advisory Plan as a New FWD Agent

90-Day Goal: Close 8–10 first contracts, build a client portfolio foundation of 50+ people.

MONTH 1 — Learn & Prepare (Days 1–30):
• Weeks 1–2: Complete basic product training — FWD Term Life, iProtect, Wealth Protect
• Week 3: Build a list of 100 warm leads from family, friends, and colleagues
• Week 4: Practice pitch with mentor at least 20 times; roleplay common scenarios

MONTH 2 — Outreach & Learning from the Field (Days 31–60):
• Target: 20 meetings, goal of 3–4 contracts
• Every meeting must be debriefed: strengths, areas for improvement
• Weekly debrief with mentor — don't hide failures; get support early

MONTH 3 — Scale & Refine (Days 61–90):
• Activate referral system from the first 3–4 clients
• Target: 5–6 contracts, total 8–10 within 90 days
• Start building personal brand on LinkedIn and Facebook

KPIs: Activity (meetings/week) → Conversion rate → Premium volume → NPS from clients`,
  },
  // Reviewing
  {
    id: "S006", participantId: "A007", participantName: "Hoàng Minh Khải",
    round: 4, submissionType: "Essay", submittedAt: "12/03 10:30", column: "Reviewing", lifecycle: "Reviewing" as SubmissionLifecycle,
    content: `Final Essay: Vision for the Role of Advisory Specialist in the FWD Financial Ecosystem...`,
  },
  {
    id: "S007", participantId: "A010", participantName: "Đặng Thị Thu Thảo",
    round: 4, submissionType: "Case Study", submittedAt: "12/03 14:00", column: "Reviewing", lifecycle: "Reviewing" as SubmissionLifecycle,
    content: `Final Case Study: Building a Life Insurance Market Development Strategy in Rural Vietnam...`,
  },
  {
    id: "S008", participantId: "A015", participantName: "Cao Hoàng Phúc",
    round: 4, submissionType: "AI Simulation", submittedAt: "11/03 16:20", column: "Reviewing", lifecycle: "Retry" as SubmissionLifecycle,
    content: `Final AI Simulation: Advising a Comprehensive Insurance Package for a 28-Year-Old Startup Entrepreneur Who Just Closed Series A...`,
  },
  // Reviewed
  {
    id: "S009", participantId: "A003", participantName: "Phạm Thị Lan Hương",
    round: 3, submissionType: "Essay", submittedAt: "10/03 10:00", column: "Reviewed", lifecycle: "Approved" as SubmissionLifecycle,
    content: "...", capabilityScore: 90, commitmentScore: 85, advisoryFitScore: 88,
    comment: "Outstanding essay on the Agent's role. Clear strategic thinking, concrete and persuasive evidence. The empathy section is particularly insightful.",
  },
  {
    id: "S010", participantId: "A013", participantName: "Phan Đức Trọng",
    round: 1, submissionType: "Essay", submittedAt: "09/03 14:30", column: "Reviewed", lifecycle: "Approved" as SubmissionLifecycle,
    content: "...", capabilityScore: 77, commitmentScore: 74, advisoryFitScore: 76,
    comment: "Good result for Round 1. Needs further development on Advisory Fit — the product advisory section lacks sufficient depth.",
  },
  {
    id: "S011", participantId: "A017", participantName: "Dương Văn Kiên",
    round: 3, submissionType: "Case Study", submittedAt: "09/03 11:15", column: "Reviewed", lifecycle: "Approved" as SubmissionLifecycle,
    content: "...", capabilityScore: 79, commitmentScore: 81, advisoryFitScore: 77,
    comment: "Well-analyzed case study; needs additional market data and comparison with competing products.",
  },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const getTotal = (p: Participant) => {
  const w = ROUND_WEIGHTS[p.round];
  return Math.round(p.capability * w.cap + p.commitment * w.com + p.advisoryFit * w.adv) + p.bonus;
};

// ─────────────────────────────────────────────────────────────
// UI ATOMS
// ─────────────────────────────────────────────────────────────
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium font-mono", className)}>
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: StatusType }) {
  const c = statusConfig[status];
  const isSystemAuto = status === "Not Qualified";
  return (
    <span className="inline-flex items-center gap-1">
      <Badge className={c.cls}>
        <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", c.dot)} />
        {c.label}
      </Badge>
      {isSystemAuto && (
        <span title="Auto-assessed by system: score below threshold after grading. Different from 'Disqualified' set manually by admin (withdrawal / policy violation).">
          <Info className="w-3 h-3 text-muted-foreground hover:text-red-500 cursor-help transition-colors" />
        </span>
      )}
    </span>
  );
}

function RoundBadge({ round }: { round: RoundNum }) {
  const c = roundConfig[round];
  return <Badge className={c.cls}>{c.label}</Badge>;
}

function RoundOpStatusBadge({ round }: { round: RoundNum }) {
  const opStatus = ROUND_OP_STATUS[round];
  const c = roundOpConfig[opStatus];
  const Icon = c.icon;
  return (
    <Badge className={clsx(c.cls, "gap-1")}>
      <Icon className="w-3 h-3" />
      {opStatus}
    </Badge>
  );
}

// Submission lifecycle stepper — two paths:
// Normal:  Submitted → Reviewing → Approved
// Retry:   Submitted → Reviewing → Retry → Resubmitted → Approved
const LC_NORMAL: SubmissionLifecycle[] = ["Submitted", "Reviewing", "Approved"];
const LC_RETRY: SubmissionLifecycle[]  = ["Submitted", "Reviewing", "Retry", "Resubmitted", "Approved"];
const LC_LABELS: Record<SubmissionLifecycle, string> = {
  "Submitted":   "Submitted",
  "Reviewing":   "Reviewing",
  "Retry":       "Retry Requested",
  "Resubmitted": "Resubmitted",
  "Approved":    "Approved",
};

function SubmissionLifecycleStepper({ lifecycle }: { lifecycle: SubmissionLifecycle }) {
  const isRetryPath = lifecycle === "Retry" || lifecycle === "Resubmitted";
  const path = isRetryPath ? LC_RETRY : LC_NORMAL;
  const currentIdx = path.indexOf(lifecycle);

  return (
    <div className="flex items-center gap-0.5 flex-wrap mt-1">
      {path.map((step, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isRetryStep = step === "Retry";
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div className={clsx("w-4 h-px shrink-0", isDone ? "bg-emerald-400" : "bg-gray-200")} />
            )}
            <span className={clsx(
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap",
              isDone   ? "bg-emerald-50 text-emerald-700" :
              isCurrent && isRetryStep ? "bg-amber-50 text-amber-700 ring-1 ring-amber-300" :
              isCurrent ? "bg-[#E6F0EC] text-[#0B3D2E] ring-1 ring-[#0B3D2E]/40" :
              "text-gray-400"
            )}>
              {isDone && <Check className="w-2.5 h-2.5" />}
              {LC_LABELS[step]}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ScoreBar({ value }: { value: number }) {
  const color = value >= 80 ? "#0B3D2E" : value >= 65 ? "#FF6B00" : "#DC2626";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono font-semibold text-foreground w-7 text-right">{value}</span>
    </div>
  );
}

function Btn({
  children, variant = "primary", size = "sm", className, onClick, disabled,
}: {
  children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "xs" | "sm" | "md"; className?: string; onClick?: () => void; disabled?: boolean;
}) {
  const v = {
    primary: "bg-[#0B3D2E] text-white hover:bg-[#0a3426]",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    ghost: "text-gray-600 hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
    accent: "bg-[#FF6B00] text-white hover:bg-[#e66000]",
  };
  const s = { xs: "px-2 py-1 text-xs gap-1", sm: "px-3 py-1.5 text-sm gap-1.5", md: "px-4 py-2 text-sm gap-2" };
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={clsx("inline-flex items-center justify-center rounded-md font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed", v[variant], s[size], className)}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR — responsive: drawer on mobile, fixed on desktop
// ─────────────────────────────────────────────────────────────
function SidebarContent({ current, onChange, collapsed, setCollapsed, onClose }: {
  current: Page; onChange: (p: Page) => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#0B3D2E" }}>
      {/* Logo */}
      <div className="flex items-center h-14 px-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-md bg-[#FF6B00] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-[10px]">FWD</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-white font-semibold text-[13px] leading-tight">F Program</div>
              <div className="text-white/45 text-[11px]">Admin Portal</div>
            </div>
          )}
        </div>
        {/* Close button on mobile drawer */}
        {onClose && (
          <button onClick={onClose} className="text-white/50 hover:text-white p-1 ml-2">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {NAV_MODULES.map((mod) => {
          const Icon = mod.icon;
          const isActive = current === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => { onChange(mod.id); onClose?.(); }}
              title={collapsed && !onClose ? mod.label : undefined}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 transition-all relative text-left",
                isActive ? "bg-white/12 text-white" : "text-white/50 hover:text-white/85 hover:bg-white/5"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#FF6B00] rounded-r" />
              )}
              <Icon className={clsx("w-[18px] h-[18px] shrink-0", isActive ? "text-[#FF6B00]" : "")} />
              {(!collapsed || onClose) && (
                <>
                  <span className="flex-1 text-[13px] font-medium truncate">{mod.label}</span>
                  {mod.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#FF6B00]/25 text-[#FF9A55] shrink-0 leading-none">
                      {mod.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && !onClose && mod.badge && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF6B00]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} className="p-3 shrink-0">
        {(!collapsed || onClose) && (
          <div className="flex items-center gap-2.5 mb-2 px-1">
            <div className="w-7 h-7 rounded-full bg-[#FF6B00]/25 flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">BT</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">BTC Admin</div>
              <div className="text-white/40 text-[10px] truncate">btc@fwd.com.vn</div>
            </div>
            <button className="text-white/40 hover:text-white p-1"><LogOut className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {/* Collapse toggle — desktop only */}
        {!onClose && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center text-white/30 hover:text-white/60 transition-colors w-full py-1 rounded hover:bg-white/5"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function Sidebar({ current, onChange, collapsed, setCollapsed, mobileOpen, onMobileClose }: {
  current: Page; onChange: (p: Page) => void;
  collapsed: boolean; setCollapsed: (v: boolean) => void;
  mobileOpen: boolean; onMobileClose: () => void;
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col h-screen shrink-0 transition-all duration-300 overflow-hidden"
        style={{ width: collapsed ? 56 : 220, borderRight: "1px solid rgba(255,255,255,0.08)" }}
      >
        <SidebarContent
          current={current} onChange={onChange}
          collapsed={collapsed} setCollapsed={setCollapsed}
        />
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 flex"
          onClick={onMobileClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Drawer */}
          <aside
            className="relative z-50 flex flex-col w-64 h-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent
              current={current} onChange={onChange}
              collapsed={false} setCollapsed={setCollapsed}
              onClose={onMobileClose}
            />
          </aside>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────────────────────
const PAGE_INFO: Record<Page, string> = {
  "dashboard":            "Dashboard",
  "program-management":   "Program Management",
  "candidate-management": "Candidate Management",
  "submission-review":    "Submission Review",
  "interview-management": "Interview Management",
  "office-matching":      "Office Matching",
};

function TopBar({ page, activeTabLabel, onMenuClick }: {
  page: Page; activeTabLabel?: string; onMenuClick?: () => void;
}) {
  const moduleLabel = PAGE_INFO[page];
  return (
    <header className="h-14 flex items-center gap-3 px-4 bg-card shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-[13px] text-muted-foreground truncate hidden sm:block">{moduleLabel}</span>
        <span className="text-[13px] font-semibold text-foreground truncate sm:hidden">{moduleLabel}</span>
        {activeTabLabel && (
          <>
            <span className="text-muted-foreground/40 text-[13px] hidden sm:block">/</span>
            <span className="text-[13px] font-semibold text-foreground truncate hidden sm:block">{activeTabLabel}</span>
          </>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Search — hidden on small mobile */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            placeholder="Search…"
            className="h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-background w-36 lg:w-44 outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 focus:border-[#0B3D2E]/40"
          />
        </div>
        {/* Search icon on tiny mobile */}
        <button className="sm:hidden w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60">
          <Search className="w-4 h-4" />
        </button>
        {/* Bell */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
        </button>
        {/* Avatar */}
        <div className="flex items-center gap-2 pl-1.5 border-l border-border">
          <div className="w-7 h-7 rounded-full bg-[#0B3D2E] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">BT</span>
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-medium text-foreground leading-tight">Admin</div>
            <div className="text-[10px] text-muted-foreground leading-tight">BTC</div>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW / FUNNEL DASHBOARD (9.1)
// ─────────────────────────────────────────────────────────────
const FUNNEL_STAGES = [
  { label: "Registration",    count: 2000, pct: "100%",  color: "#0B3D2E", sub: "All applicants" },
  { label: "V1 – CREATE",    count: 500,  pct: "25%",   color: "#1A5E42", sub: "Behavior MCQ + Completion" },
  { label: "V2 – BUILD",     count: 250,  pct: "50%",   color: "#2E8A64", sub: "Essay / CV + Learning MCQ" },
  { label: "V3 – PROVE",     count: 60,   pct: "24%",   color: "#3DA87E", sub: "Learning + Participation + Interview" },
  { label: "Graduates",      count: 30,   pct: "50%",   color: "#FF6B00", sub: "Post-interview selection" },
  { label: "Office Matched", count: 20,   pct: "67%",   color: "#FF8C38", sub: "Agency placement confirmed" },
];

const STAT_CARDS = [
  { label: "In Progress", value: PARTICIPANTS.filter(p => p.status === "In Progress").length, icon: Users, color: "text-blue-600", bg: "bg-blue-50", change: "1500 registered" },
  { label: "Pending Review", value: SUBMISSIONS.filter(s => s.column === "Pending").length, icon: ClipboardCheck, color: "text-[#FF6B00]", bg: "bg-orange-50", change: "48h SLA" },
  { label: "At Risk", value: PARTICIPANTS.filter(p => p.status === "At Risk").length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", change: "Needs monitoring" },
  { label: "Qualified / Completed", value: PARTICIPANTS.filter(p => p.status === "Qualified" || p.status === "Completed").length, icon: Award, color: "text-emerald-600", bg: "bg-emerald-50", change: "Above threshold" },
];

function FunnelViz() {
  const max = FUNNEL_STAGES[0].count;
  return (
    <div className="space-y-2">
      {FUNNEL_STAGES.map((stage, i) => {
        const w = 25 + (stage.count / max) * 70;
        return (
          <div key={i} className="group">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-foreground w-32 shrink-0 truncate">{stage.label}</span>
              <span className="text-xs font-mono font-bold text-foreground">{stage.count.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">{stage.sub}</span>
              {i > 0 && (
                <span className="ml-auto text-xs font-mono text-muted-foreground shrink-0">
                  −{(FUNNEL_STAGES[i - 1].count - stage.count).toLocaleString()}
                </span>
              )}
            </div>
            <div className="h-6 w-full bg-muted/30 rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all group-hover:brightness-110"
                style={{ width: `${w}%`, backgroundColor: stage.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OverviewPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div className="p-4 sm:p-5 space-y-4 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-start justify-between mb-3">
                <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center", card.bg)}>
                  <Icon className={clsx("w-[18px] h-[18px]", card.color)} />
                </div>
                <span className="text-xs text-muted-foreground">{card.change}</span>
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">{card.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Round operational status strip */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Round Operational Status</h4>
            <p className="text-xs text-muted-foreground">Only "Not Started" rounds allow editing thresholds & weights</p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">Configured at: 1.2 / 1.4</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([1, 2, 3, 4] as RoundNum[]).map(r => {
            const op = ROUND_OP_STATUS[r];
            const cfg = roundOpConfig[op];
            const Icon = cfg.icon;
            return (
              <div key={r} className={clsx("rounded-lg border p-3", cfg.cls)}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold">{roundConfig[r].label}</span>
                  <span className={clsx("w-2 h-2 rounded-full", cfg.dot, op === "Open" && "animate-pulse")} />
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium">
                  <Icon className="w-3 h-3" />
                  {op}
                </div>
                {cfg.thresholdEditable && (
                  <div className="mt-1.5 text-[10px] opacity-60 flex items-center gap-0.5">
                    <PenLine className="w-2.5 h-2.5" /> Threshold editable
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Funnel + right panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Program Progress Funnel</h3>
            </div>
            <Btn variant="secondary" size="xs"><Download className="w-3 h-3" /> Export Report</Btn>
          </div>
          <FunnelViz />
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Round 3 Progress</h4>
            {[
              { label: "Submitted", value: 52, total: 60 },
              { label: "Graded", value: 38, total: 52 },
              { label: "Above threshold (≥70)", value: 30, total: 38 },
            ].map((item) => (
              <div key={item.label} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-mono font-medium">{item.value}/{item.total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#0B3D2E]" style={{ width: `${(item.value / item.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">Upcoming Deadlines</h4>
            {[
              { label: "Round 3 Assignment Submission", date: "20/03", days: 5, urgent: true },
              { label: "Finalize Grader Scores", date: "22/03", days: 7, urgent: false },
              { label: "Finals Interview", date: "28/03", days: 13, urgent: false },
              { label: "Announce Graduate Results", date: "01/04", days: 17, urgent: false },
            ].map((d, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                <Clock className={clsx("w-3.5 h-3.5 shrink-0", d.urgent ? "text-[#FF6B00]" : "text-muted-foreground")} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{d.label}</div>
                </div>
                <div className={clsx("text-xs font-mono shrink-0", d.urgent ? "text-[#FF6B00] font-semibold" : "text-muted-foreground")}>
                  {d.date} ({d.days}d)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-orange-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-b border-orange-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-800">At-Risk Candidates</span>
              <Badge className="bg-orange-200 text-orange-800">{PARTICIPANTS.filter(p => p.status === "At Risk").length}</Badge>
            </div>
            <button onClick={() => navigate("candidate-management")} className="text-xs text-orange-700 hover:underline">
              View all →
            </button>
          </div>
          <div className="divide-y divide-border">
            {PARTICIPANTS.filter(p => p.status === "At Risk").map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <span className="text-orange-700 text-xs font-semibold">{p.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{p.university} · Total score: {getTotal(p)}</div>
                </div>
                <RoundBadge round={p.round} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-amber-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Submissions Needing Retry</span>
              <Badge className="bg-amber-200 text-amber-800 font-mono">{SUBMISSIONS.filter(s => s.lifecycle === "Retry").length}</Badge>
            </div>
            <button onClick={() => navigate("submission-review")} className="text-xs text-amber-700 hover:underline">
              Go to grading →
            </button>
          </div>
          <div className="divide-y divide-border">
            {SUBMISSIONS.filter(s => s.lifecycle === "Retry").length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">No submissions require Retry</div>
            ) : (
              SUBMISSIONS.filter(s => s.lifecycle === "Retry").map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <span className="text-amber-700 text-xs font-semibold">{s.participantName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{s.participantName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{s.submissionType} · {s.submittedAt}</div>
                  </div>
                  <RoundBadge round={s.round} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PARTICIPANT LIST (3.2)
// ─────────────────────────────────────────────────────────────
type SortKeyP = "name" | "round" | "total" | "capability" | "commitment" | "advisoryFit" | null;

function ParticipantPage() {
  const [search, setSearch] = useState("");
  const [filterRound, setFilterRound] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUniv, setFilterUniv] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKeyP>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pg, setPg] = useState(1);
  const PER = 8;

  const univs = Array.from(new Set(PARTICIPANTS.map(p => p.university)));

  const filtered = useMemo(() => {
    let list = PARTICIPANTS.filter(p => {
      if (filterRound !== "all" && p.round !== Number(filterRound)) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterUniv !== "all" && p.university !== filterUniv) return false;
      if (filterTeam !== "all" && p.team !== filterTeam) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.email.includes(search.toLowerCase()) && !p.id.includes(search)) return false;
      return true;
    });
    if (sortKey) {
      list = [...list].sort((a, b) => {
        let av: number | string = 0, bv: number | string = 0;
        if (sortKey === "name") { av = a.name; bv = b.name; }
        else if (sortKey === "round") { av = a.round; bv = b.round; }
        else if (sortKey === "total") { av = getTotal(a); bv = getTotal(b); }
        else if (sortKey === "capability") { av = a.capability; bv = b.capability; }
        else if (sortKey === "commitment") { av = a.commitment; bv = b.commitment; }
        else if (sortKey === "advisoryFit") { av = a.advisoryFit; bv = b.advisoryFit; }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [search, filterRound, filterStatus, filterUniv, filterTeam, sortKey, sortDir]);

  const totalPgs = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((pg - 1) * PER, pg * PER);
  const allSel = paged.length > 0 && paged.every(p => selected.has(p.id));

  const toggleSort = (k: SortKeyP) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
    setPg(1);
  };

  const toggleSel = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    if (allSel) setSelected(s => { const n = new Set(s); paged.forEach(p => n.delete(p.id)); return n; });
    else setSelected(s => { const n = new Set(s); paged.forEach(p => n.add(p.id)); return n; });
  };

  const SortIcon = ({ k }: { k: SortKeyP }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-[#0B3D2E]" /> : <ArrowDown className="w-3 h-3 text-[#0B3D2E]" />;
  };

  const detail = PARTICIPANTS.find(p => p.id === detailId);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden p-5">
        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPg(1); }}
              placeholder="Search by name, email, ID..."
              className="pl-8 pr-3 py-1.5 text-sm bg-card border border-border rounded-md outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 focus:border-[#0B3D2E] w-52"
            />
          </div>
          {[
            { val: filterRound, set: (v: string) => { setFilterRound(v); setPg(1); }, opts: [["all","All rounds"],["1","Round 1"],["2","Round 2"],["3","Round 3"],["4","Finals"]] },
            { val: filterStatus, set: (v: string) => { setFilterStatus(v); setPg(1); }, opts: [["all","All statuses"],["In Progress","In Progress"],["Qualified","Qualified"],["At Risk","At Risk"],["Not Qualified","Not Qualified"],["Completed","Completed"]] },
            { val: filterUniv, set: (v: string) => { setFilterUniv(v); setPg(1); }, opts: [["all","All schools"], ...univs.map(u => [u, u])] },
            { val: filterTeam, set: (v: string) => { setFilterTeam(v); setPg(1); }, opts: [["all","All teams"],["Team Alpha","Team Alpha"],["Team Beta","Team Beta"],["Team Gamma","Team Gamma"],["Team Delta","Team Delta"],["Team Sigma","Team Sigma"]] },
          ].map((f, i) => (
            <div key={i} className="relative">
              <select value={f.val} onChange={e => f.set(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 text-sm bg-card border border-border rounded-md outline-none focus:border-[#0B3D2E] cursor-pointer">
                {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          ))}
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground font-mono">{filtered.length} results</span>
          <Btn variant="secondary" size="sm"><Download className="w-3.5 h-3.5" /> Export Report</Btn>
          <Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" /> Add New</Btn>
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-[#0B3D2E] text-white rounded-lg mb-3 text-sm">
            <CheckSquare className="w-4 h-4" />
            <span className="font-medium">{selected.size} selected</span>
            <div className="w-px h-4 bg-white/30" />
            <Btn variant="secondary" size="xs" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <UserCheck className="w-3 h-3" /> Update Status
            </Btn>
            <Btn variant="secondary" size="xs" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Building className="w-3 h-3" /> Assign Team / Mentor
            </Btn>
            <Btn variant="secondary" size="xs" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Download className="w-3 h-3" /> Export Report
            </Btn>
            <div className="flex-1" />
            <button onClick={() => setSelected(new Set())} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-auto flex-1" style={{ scrollbarWidth: "thin" }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/60 text-left">
                  <th className="w-10 px-3 py-2.5">
                    <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground">
                      {allSel ? <CheckSquare className="w-4 h-4 text-[#0B3D2E]" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("name")}>Candidate <SortIcon k="name" /></button>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">School / Major</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("round")}>Round <SortIcon k="round" /></button>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("capability")}>CAP <SortIcon k="capability" /></button>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("commitment")}>COM <SortIcon k="commitment" /></button>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("advisoryFit")}>ADV <SortIcon k="advisoryFit" /></button>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("total")}>Total <SortIcon k="total" /></button>
                  </th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map(p => {
                  const total = getTotal(p);
                  const isSel = selected.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setDetailId(detailId === p.id ? null : p.id)}
                      className={clsx("hover:bg-muted/30 transition-colors cursor-pointer", isSel && "bg-[#0B3D2E]/5", detailId === p.id && "bg-[#0B3D2E]/8")}
                    >
                      <td className="px-3 py-2.5" onClick={e => { e.stopPropagation(); toggleSel(p.id); }}>
                        {isSel ? <CheckSquare className="w-4 h-4 text-[#0B3D2E]" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#E6F0EC] flex items-center justify-center shrink-0">
                            <span className="text-[#0B3D2E] text-xs font-semibold">{p.name[0]}</span>
                          </div>
                          <div>
                            <div className="font-medium text-foreground text-sm">{p.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{p.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-medium text-foreground">{p.university}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[120px]">{p.major}</div>
                      </td>
                      <td className="px-3 py-2.5"><RoundBadge round={p.round} /></td>
                      <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.team ?? <span className="italic text-muted-foreground/60">Unassigned</span>}</td>
                      <td className="px-3 py-2.5 w-24"><ScoreBar value={p.capability} /></td>
                      <td className="px-3 py-2.5 w-24"><ScoreBar value={p.commitment} /></td>
                      <td className="px-3 py-2.5 w-24"><ScoreBar value={p.advisoryFit} /></td>
                      <td className="px-3 py-2.5">
                        <span className={clsx("text-sm font-bold font-mono", total >= 80 ? "text-emerald-700" : total >= 65 ? "text-[#FF6B00]" : "text-red-700")}>
                          {total}
                        </span>
                      </td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
                {paged.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-12 text-muted-foreground text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-25" />
                    No data matches the current filters.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0">
            <span className="text-xs text-muted-foreground font-mono">
              {Math.min((pg-1)*PER+1, filtered.length)}–{Math.min(pg*PER, filtered.length)} / {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Btn variant="ghost" size="xs" onClick={() => setPg(p => Math.max(1, p-1))} disabled={pg===1}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Btn>
              {Array.from({ length: totalPgs }, (_, i) => i+1).map(p => (
                <button key={p} onClick={() => setPg(p)}
                  className={clsx("w-7 h-7 text-xs rounded-md font-mono transition-colors", pg===p ? "bg-[#0B3D2E] text-white" : "text-muted-foreground hover:bg-muted")}>
                  {p}
                </button>
              ))}
              <Btn variant="ghost" size="xs" onClick={() => setPg(p => Math.min(totalPgs, p+1))} disabled={pg===totalPgs}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {detail && (
        <div className="w-76 w-[300px] shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <span className="text-sm font-semibold text-foreground">Candidate Details</span>
            <button onClick={() => setDetailId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: "none" }}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#E6F0EC] flex items-center justify-center mx-auto mb-2">
                <span className="text-[#0B3D2E] text-lg font-bold">{detail.name[0]}</span>
              </div>
              <div className="font-semibold text-foreground text-sm">{detail.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{detail.email}</div>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                <StatusBadge status={detail.status} />
                <RoundBadge round={detail.round} />
              </div>
            </div>

            <div className="space-y-1.5">
              {[
                { l: "ID", v: detail.id },
                { l: "School", v: detail.university },
                { l: "Major", v: detail.major },
                { l: "Team", v: detail.team ?? "Unassigned" },
                { l: "Mentor", v: detail.mentor ?? "Not assigned" },
                { l: "Registration Date", v: detail.submittedAt },
              ].map(row => (
                <div key={row.l} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{row.l}</span>
                  <span className="font-medium font-mono text-foreground">{row.v}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">3-Criteria Scores</div>
              <div className="space-y-3">
                {[
                  { label: `Capability (${Math.round(ROUND_WEIGHTS[detail.round].cap*100)}%)`, value: detail.capability },
                  { label: `Commitment (${Math.round(ROUND_WEIGHTS[detail.round].com*100)}%)`, value: detail.commitment },
                  { label: `Advisory Fit (${Math.round(ROUND_WEIGHTS[detail.round].adv*100)}%)`, value: detail.advisoryFit },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-mono font-semibold">{s.value}/100</span>
                    </div>
                    <ScoreBar value={s.value} />
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-foreground">Weighted Total Score</span>
                  <span className="text-base font-bold font-mono text-[#0B3D2E]">{getTotal(detail)}</span>
                </div>
                {detail.bonus > 0 && <div className="text-xs text-[#FF6B00] font-mono text-right">+{detail.bonus} bonus</div>}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Activity History</div>
              <div className="relative pl-4">
                <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
                {[
                  { l: "Round 3 Submission", t: detail.submittedAt },
                  { l: "Passed Round 2 Threshold", t: "01/03/2024" },
                  { l: "Completed MBTI", t: "22/02/2024" },
                ].map((a, i) => (
                  <div key={i} className="relative flex gap-2 pb-3 last:pb-0">
                    <div className="absolute -left-2.5 w-2 h-2 rounded-full bg-[#0B3D2E] border-2 border-card mt-0.5" />
                    <div>
                      <div className="text-xs font-medium text-foreground">{a.l}</div>
                      <div className="text-xs text-muted-foreground font-mono">{a.t}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Internal Notes</div>
              <textarea rows={3} className="w-full text-xs p-2 border border-border rounded-md bg-muted/30 resize-none outline-none focus:ring-2 focus:ring-[#0B3D2E]/20"
                placeholder="Internal notes for the organizing committee..."
                defaultValue={detail.status === "At Risk" ? "Low Advisory Fit score — needs more advisory practice. Contact mentor soon." : ""} />
            </div>
          </div>
          <div className="p-3 border-t border-border flex gap-2 shrink-0">
            <Btn variant="secondary" size="sm" className="flex-1"><Eye className="w-3.5 h-3.5" /> View Details</Btn>
            <Btn variant="primary" size="sm" className="flex-1"><PenLine className="w-3.5 h-3.5" /> Edit</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SCORING SCREEN (4.3) — với prev/next navigation
// ─────────────────────────────────────────────────────────────
type DimScores = { cap: number; com: number; adv: number; comment: string };

function ScoringPage() {
  const queue = useMemo(() => SUBMISSIONS.filter(s => s.column !== "Reviewed"), []);
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, DimScores>>({});
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [filterCol, setFilterCol] = useState<"all" | SubmissionStatus>("all");

  const visible = queue.filter(s => filterCol === "all" || s.column === filterCol);
  const current = visible[idx] ?? null;
  const curScore: DimScores = current ? (scores[current.id] ?? { cap: 0, com: 0, adv: 0, comment: "" }) : { cap: 0, com: 0, adv: 0, comment: "" };

  const updateScore = (field: keyof DimScores, val: number | string) => {
    if (!current) return;
    setScores(s => ({ ...s, [current.id]: { ...curScore, [field]: val } }));
  };

  const handleSubmit = () => {
    if (!current) return;
    setSubmittedIds(s => new Set(s).add(current.id));
    if (idx < visible.length - 1) setIdx(i => i + 1);
  };

  const weightedTotal = Math.round(curScore.cap * 0.3 + curScore.com * 0.3 + curScore.adv * 0.4);

  const colConfig = { Pending: "Pending", Reviewing: "Reviewing", Reviewed: "Done" };
  const colDot = { Pending: "bg-amber-400", Reviewing: "bg-blue-400", Reviewed: "bg-emerald-400" };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Queue panel */}
      <div className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border bg-muted/20 flex flex-col overflow-hidden max-h-[220px] md:max-h-none">
        <div className="px-3 py-3 border-b border-border shrink-0">
          <div className="text-xs font-semibold text-foreground mb-2">Submission Queue</div>
          <div className="grid grid-cols-4 gap-1">
            {(["all", "Pending", "Reviewing", "Reviewed"] as const).map(col => (
              <button key={col} onClick={() => { setFilterCol(col); setIdx(0); }}
                className={clsx("text-[10px] py-1 rounded-md transition-colors",
                  filterCol === col ? "bg-[#0B3D2E] text-white" : "text-muted-foreground hover:bg-muted")}>
                {col === "all" ? "All" : col === "Pending" ? "Pending" : col === "Reviewing" ? "Reviewing" : "Done"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: "none" }}>
          {visible.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">No submissions to grade at this time.</div>
          )}
          {visible.map((sub, i) => {
            const isDone = submittedIds.has(sub.id);
            return (
              <button
                key={sub.id}
                onClick={() => setIdx(i)}
                className={clsx(
                  "w-full text-left p-2.5 rounded-lg border transition-all",
                  i === idx ? "border-[#0B3D2E] bg-[#0B3D2E]/6" : "border-border bg-card hover:border-[#0B3D2E]/30",
                  isDone && "opacity-50"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground truncate flex-1">{sub.participantName}</span>
                  <span className={clsx("w-2 h-2 rounded-full shrink-0 ml-1", colDot[sub.column])} />
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className={subTypeConfig[sub.submissionType].cls}>{subTypeConfig[sub.submissionType].label}</Badge>
                  <RoundBadge round={sub.round} />
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1">{sub.submittedAt}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main review area */}
      {current ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Nav bar */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-card border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E6F0EC] flex items-center justify-center shrink-0">
                <span className="text-[#0B3D2E] text-sm font-bold">{current.participantName[0]}</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{current.participantName}</div>
                <div className="flex items-center gap-2">
                  <RoundBadge round={current.round} />
                  <Badge className={subTypeConfig[current.submissionType].cls}>{subTypeConfig[current.submissionType].label}</Badge>
                  <span className="text-xs text-muted-foreground font-mono">{current.submittedAt}</span>
                </div>
                <SubmissionLifecycleStepper lifecycle={current.lifecycle} />
              </div>
            </div>
            {/* Prev/Next navigation */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded-md">
                {idx + 1} / {visible.length} submissions
              </span>
              <button
                onClick={() => setIdx(i => Math.max(0, i - 1))}
                disabled={idx === 0}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIdx(i => Math.min(visible.length - 1, i + 1))}
                disabled={idx === visible.length - 1}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <Btn variant="secondary" size="xs"><RefreshCw className="w-3 h-3" /> Request Retry</Btn>
            </div>
          </div>

          {/* Content + Scoring split */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Content viewer */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 border-b md:border-b-0 md:border-r border-border" style={{ scrollbarWidth: "thin" }}>
              <div className="max-w-2xl">
                <h3 className="text-base font-semibold text-foreground mb-1">Submission Content</h3>
                <p className="text-xs text-muted-foreground mb-5">{subTypeConfig[current.submissionType].label} — Round {current.round} — {current.submittedAt}</p>
                {current.content.split("\n\n").map((para, i) => (
                  <div key={i} className="mb-4">
                    {para.split("\n").map((line, j) => {
                      if (line.startsWith("•") || line.match(/^[0-9]+\./)) {
                        return <div key={j} className="text-sm leading-relaxed text-foreground pl-3 mb-1">{line}</div>;
                      }
                      if (line.startsWith("#") || (line.length < 80 && line.endsWith(":"))) {
                        return <div key={j} className="text-sm font-semibold text-foreground mb-1 mt-3 first:mt-0">{line.replace(/^#+\s*/, "")}</div>;
                      }
                      return <span key={j} className="text-sm leading-relaxed text-foreground">{line} </span>;
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Scoring form */}
            <div className="w-full md:w-80 shrink-0 flex flex-col overflow-hidden bg-card">
              <div className="px-5 py-3 border-b border-border shrink-0">
                <div className="text-sm font-semibold text-foreground">Score</div>
                <div className="text-xs text-muted-foreground">3 criteria — weights for Round {current.round}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: "none" }}>
                {[
                  { label: "Capability", key: "cap" as const, value: curScore.cap, weight: Math.round(ROUND_WEIGHTS[current.round].cap * 100), desc: "Product knowledge & insurance market understanding" },
                  { label: "Commitment", key: "com" as const, value: curScore.com, weight: Math.round(ROUND_WEIGHTS[current.round].com * 100), desc: "Commitment, learning attitude, proactiveness" },
                  { label: "Advisory Fit", key: "adv" as const, value: curScore.adv, weight: Math.round(ROUND_WEIGHTS[current.round].adv * 100), desc: "Advisory mindset, listening & situation-handling skills" },
                ].map(dim => (
                  <div key={dim.key}>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{dim.label}</div>
                        <div className="text-xs text-muted-foreground leading-tight">{dim.desc}</div>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono shrink-0 ml-2">×{dim.weight}%</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="range" min={0} max={100} step={1} value={dim.value}
                        onChange={e => updateScore(dim.key, Number(e.target.value))}
                        className="flex-1 h-1.5 cursor-pointer accent-[#0B3D2E]" />
                      <input type="number" min={0} max={100} value={dim.value}
                        onChange={e => updateScore(dim.key, Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="w-14 text-center text-sm font-mono font-bold border border-border rounded-md px-1 py-1 bg-muted/50 outline-none focus:ring-2 focus:ring-[#0B3D2E]/20" />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>0</span>
                      <span className={clsx("font-medium",
                        dim.value >= 80 ? "text-emerald-600" : dim.value >= 65 ? "text-[#FF6B00]" : dim.value > 0 ? "text-red-500" : ""
                      )}>
                        {dim.value >= 80 ? "Excellent" : dim.value >= 65 ? "Meets standard" : dim.value > 0 ? "Below standard" : "—"}
                      </span>
                      <span>100</span>
                    </div>
                  </div>
                ))}

                {/* Score preview */}
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Composite Score</span>
                    <span className={clsx("text-xl font-bold font-mono",
                      weightedTotal >= 70 ? "text-emerald-700" : weightedTotal >= 55 ? "text-[#FF6B00]" : "text-red-700"
                    )}>
                      {weightedTotal}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden mb-1.5">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${weightedTotal}%`, backgroundColor: weightedTotal >= 70 ? "#0B3D2E" : weightedTotal >= 55 ? "#FF6B00" : "#DC2626" }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Round {current.round} threshold: <span className="font-mono font-medium text-foreground">70</span></span>
                    <span className={weightedTotal >= 70 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                      {weightedTotal >= 70 ? "✓ Pass" : "✗ Below threshold"}
                    </span>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Comments & Feedback</label>
                  <textarea
                    value={curScore.comment}
                    onChange={e => updateScore("comment", e.target.value)}
                    rows={4}
                    placeholder="Strengths, areas for improvement, notes for the organizing committee..."
                    className="w-full text-sm p-2.5 border border-border rounded-md bg-muted/30 resize-none outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 focus:border-[#0B3D2E]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border space-y-2 shrink-0">
                <Btn variant="accent" size="md" className="w-full justify-center" onClick={handleSubmit}
                  disabled={curScore.cap === 0 && curScore.com === 0 && curScore.adv === 0}>
                  <ThumbsUp className="w-4 h-4" /> Submit & Next
                </Btn>
                <div className="grid grid-cols-2 gap-2">
                  <Btn variant="primary" size="sm" className="justify-center">
                    <FileCheck className="w-3.5 h-3.5" /> Save Draft
                  </Btn>
                  <Btn variant="secondary" size="sm" className="justify-center">
                    <RotateCcw className="w-3.5 h-3.5" /> Request Retry
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <div className="text-sm font-medium">No submissions</div>
            <div className="text-xs mt-1">No submissions match the current filter.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SCORECARD (6.3)
// ─────────────────────────────────────────────────────────────
type SortKeyS = "total" | "capability" | "commitment" | "advisoryFit" | "name" | "round";

function ScorecardPage() {
  const [sortKey, setSortKey] = useState<SortKeyS>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterRound, setFilterRound] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [bonusP, setBonusP] = useState("");
  const [bonusType, setBonusType] = useState<"bonus" | "malus">("bonus");
  const [bonusPts, setBonusPts] = useState(0);
  const [bonusReason, setBonusReason] = useState("");
  const [auditLog, setAuditLog] = useState([
    { id: "A003", name: "Phạm Thị Lan Hương", type: "bonus", pts: 10, reason: "Top performer at Workshop", date: "14/03", by: "BTC Admin" },
    { id: "A010", name: "Đặng Thị Thu Thảo",  type: "bonus", pts: 15, reason: "Outstanding Advisory Fit Round 3", date: "12/03", by: "Team Head Khoa" },
    { id: "A018", name: "Lưu Thị Khánh Linh", type: "bonus", pts: 12, reason: "Mentor rated 5/5 for commitment", date: "10/03", by: "GAD Hoa" },
    { id: "A006", name: "Đinh Thị Thanh Tâm",  type: "malus", pts: 5, reason: "Submitted 2 days late — Round 2", date: "08/03", by: "BTC Admin" },
  ]);

  const toggleSort = (k: SortKeyS) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    let list = PARTICIPANTS.filter(p => {
      if (filterRound !== "all" && p.round !== Number(filterRound)) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      if (sortKey === "name") { av = a.name; bv = b.name; }
      else if (sortKey === "round") { av = a.round; bv = b.round; }
      else if (sortKey === "total") { av = getTotal(a); bv = getTotal(b); }
      else if (sortKey === "capability") { av = a.capability; bv = b.capability; }
      else if (sortKey === "commitment") { av = a.commitment; bv = b.commitment; }
      else if (sortKey === "advisoryFit") { av = a.advisoryFit; bv = b.advisoryFit; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [sortKey, sortDir, filterRound, filterStatus]);

  const histData = useMemo(() => {
    const ranges = [
      { range: "<55", min: 0, max: 55 },
      { range: "55–60", min: 55, max: 60 },
      { range: "60–65", min: 60, max: 65 },
      { range: "65–70", min: 65, max: 70 },
      { range: "70–75", min: 70, max: 75 },
      { range: "75–80", min: 75, max: 80 },
      { range: "80–85", min: 80, max: 85 },
      { range: "85–90", min: 85, max: 90 },
      { range: "90+",   min: 90, max: 999 },
    ];
    return ranges.map(r => ({
      range: r.range,
      count: PARTICIPANTS.filter(p => { const t = getTotal(p); return t >= r.min && t < r.max; }).length,
      above: r.min >= 70,
    }));
  }, []);

  const handleBonus = () => {
    const p = PARTICIPANTS.find(p => p.name.includes(bonusP) || p.id === bonusP);
    if (!p || !bonusReason || bonusPts === 0) return;
    setAuditLog(l => [{ id: p.id, name: p.name, type: bonusType, pts: bonusPts, reason: bonusReason, date: "15/03", by: "BTC Admin" }, ...l]);
    setBonusP(""); setBonusPts(0); setBonusReason("");
  };

  const SortIcon = ({ k }: { k: SortKeyS }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-[#0B3D2E]" /> : <ArrowDown className="w-3 h-3 text-[#0B3D2E]" />;
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: "thin" }}>
        {/* Filters */}
        <div className="flex items-center gap-2">
          {[
            { val: filterRound, set: setFilterRound, opts: [["all","All rounds"],["1","Round 1"],["2","Round 2"],["3","Round 3"],["4","Finals"]] },
            { val: filterStatus, set: setFilterStatus, opts: [["all","All statuses"],["In Progress","In Progress"],["Qualified","Qualified"],["At Risk","At Risk"],["Not Qualified","Not Qualified"],["Completed","Completed"]] },
          ].map((f, i) => (
            <div key={i} className="relative">
              <select value={f.val} onChange={e => f.set(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 text-sm bg-card border border-border rounded-md outline-none focus:border-[#0B3D2E] cursor-pointer">
                {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          ))}
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground font-mono">{sorted.length} candidates</span>
          <Btn variant="secondary" size="sm"><Download className="w-3.5 h-3.5" /> Export Excel</Btn>
          <Btn variant="accent" size="sm"><Download className="w-3.5 h-3.5" /> Export PDF</Btn>
        </div>

        {/* Scorecard table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-left">
                  <th className="w-8 px-3 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("name")}>Candidate <SortIcon k="name" /></button>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">School</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("round")}>Round <SortIcon k="round" /></button>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("capability")}>CAP <SortIcon k="capability" /></button>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("commitment")}>COM <SortIcon k="commitment" /></button>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("advisoryFit")}>ADV <SortIcon k="advisoryFit" /></button>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bonus Pts</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("total")}>Total <SortIcon k="total" /></button>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.slice(0, 12).map((p, i) => {
                  const total = getTotal(p);
                  const rank = i + 1;
                  const isAtRisk = p.status === "At Risk" || total < 65;
                  return (
                    <tr key={p.id} className={clsx("hover:bg-muted/30 transition-colors", isAtRisk && "bg-red-50/50")}>
                      <td className="px-3 py-2">
                        <span className={clsx("text-xs font-mono font-bold w-5 h-5 rounded flex items-center justify-center",
                          rank === 1 ? "bg-yellow-100 text-yellow-700" : rank === 2 ? "bg-gray-100 text-gray-600" : rank === 3 ? "bg-orange-100 text-orange-700" : "text-muted-foreground")}>
                          {rank}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{p.id}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{p.university}</td>
                      <td className="px-3 py-2"><RoundBadge round={p.round} /></td>
                      {[p.capability, p.commitment, p.advisoryFit].map((val, di) => (
                        <td key={di} className="px-3 py-2 w-24">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-semibold w-7">{val}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: ["#0B3D2E","#1A5E42","#2E8A64"][di] }} />
                            </div>
                          </div>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <span className={clsx("text-xs font-mono font-semibold", p.bonus > 0 ? "text-[#FF6B00]" : p.bonus < 0 ? "text-red-600" : "text-muted-foreground")}>
                          {p.bonus > 0 ? `+${p.bonus}` : p.bonus < 0 ? p.bonus : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className={clsx("text-base font-bold font-mono",
                            total >= 80 ? "text-emerald-700" : total >= 70 ? "text-[#0B3D2E]" : total >= 55 ? "text-[#FF6B00]" : "text-red-700")}>
                            {total}
                          </span>
                          {total < 70 && <TrendingDown className="w-3 h-3 text-red-400" />}
                          {isAtRisk && <AlertTriangle className="w-3 h-3 text-orange-400" />}
                        </div>
                      </td>
                      <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Histogram */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Score Distribution — aids threshold setting</h4>
              <p className="text-xs text-muted-foreground">Round 3 threshold = 70 · Green bars = pass · Grey bars = below threshold</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={histData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={22} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E5E7EB" }} formatter={(v: number) => [`${v} people`, "Count"]} />
              <ReferenceLine x="70–75" stroke="#FF6B00" strokeDasharray="4 3" strokeWidth={1.5} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {histData.map((e, i) => <RCell key={i} fill={e.above ? "#0B3D2E" : "#CBD5E1"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#0B3D2E]" /> Above threshold (≥70)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-300" /> Below threshold</div>
            <div className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-[#FF6B00]" /> Pass threshold = 70</div>
          </div>
        </div>
      </div>

      {/* Bonus/Malus + Audit log */}
      <div className="hidden lg:flex w-72 shrink-0 border-l border-border bg-card flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="text-sm font-semibold text-foreground">Score Adjustment</div>
          <div className="text-xs text-muted-foreground">Add / deduct points manually</div>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="p-4 space-y-3 border-b border-border">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Candidate</label>
              <input value={bonusP} onChange={e => setBonusP(e.target.value)} placeholder="Enter name or ID..."
                className="w-full text-sm px-3 py-1.5 border border-border rounded-md bg-muted/30 outline-none focus:ring-2 focus:ring-[#0B3D2E]/20" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Adjustment Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setBonusType("bonus")}
                  className={clsx("py-1.5 text-xs font-medium rounded-md border transition-colors",
                    bonusType === "bonus" ? "bg-emerald-600 text-white border-emerald-600" : "text-muted-foreground border-border hover:bg-muted")}>
                  + Add Points
                </button>
                <button onClick={() => setBonusType("malus")}
                  className={clsx("py-1.5 text-xs font-medium rounded-md border transition-colors",
                    bonusType === "malus" ? "bg-red-600 text-white border-red-600" : "text-muted-foreground border-border hover:bg-muted")}>
                  − Deduct Points
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Points</label>
              <input type="number" min={0} max={50} value={bonusPts} onChange={e => setBonusPts(Number(e.target.value))}
                className="w-full text-sm px-3 py-1.5 border border-border rounded-md bg-muted/30 outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 font-mono" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Reason (required)</label>
              <textarea value={bonusReason} onChange={e => setBonusReason(e.target.value)} rows={3} placeholder="Describe the reason for the score adjustment..."
                className="w-full text-sm px-3 py-1.5 border border-border rounded-md bg-muted/30 outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 resize-none" />
            </div>
            <Btn variant="primary" size="sm" className="w-full justify-center" onClick={handleBonus}
              disabled={!bonusP || !bonusReason || bonusPts === 0}>
              <Send className="w-3.5 h-3.5" /> Confirm & Save to History
            </Btn>
          </div>

          {/* Audit log */}
          <div className="p-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Score Change History</div>
            <div className="space-y-2">
              {auditLog.map((entry, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground truncate flex-1 mr-2">{entry.name}</span>
                    <span className={clsx("font-bold font-mono shrink-0", entry.type === "bonus" ? "text-emerald-600" : "text-red-600")}>
                      {entry.type === "bonus" ? "+" : "−"}{entry.pts} pts
                    </span>
                  </div>
                  <div className="text-muted-foreground leading-tight">{entry.reason}</div>
                  <div className="flex justify-between mt-1.5 text-muted-foreground font-mono text-[10px]">
                    <span>{entry.date}/2024</span>
                    <span>by {entry.by}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SHARED: TAB BAR + SIMPLE TABLE
// ─────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onSwitch }: {
  tabs: { id: string; label: string; badge?: string }[];
  active: string;
  onSwitch: (id: string) => void;
}) {
  return (
    <div className="flex px-3 sm:px-5 border-b border-border bg-card shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onSwitch(t.id)}
          className={clsx(
            "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px",
            active === t.id ? "border-[#0B3D2E] text-[#0B3D2E]" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
          {t.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FF6B00]/15 text-[#FF6B00] font-mono font-bold">{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm table-auto mx-auto">
          <thead>
            <tr className="bg-[#FF6B00]/8 text-left">
              {headers.map(h => (
                <th key={h} className="px-4 py-2.5 text-xs font-semibold text-[#FF6B00] uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2.5 text-sm">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 01. CẤU HÌNH CHƯƠNG TRÌNH
// ─────────────────────────────────────────────────────────────
function ProgramConfigPage({ activeTab }: { activeTab?: string }) {
  const tabs = [
    { id: "program-info",  label: "Program Info" },
    { id: "rounds-config", label: "Rounds & Roadmap" },
    { id: "rules",         label: "Rules & Criteria" },
    { id: "thresholds",    label: "Pass Conditions" },
    { id: "dim-weights",   label: "3-Criteria Weights" },
    { id: "controls",      label: "Program Controls" },
  ];
  const [tab, setTab] = useState(activeTab && tabs.some(t => t.id === activeTab) ? activeTab : "program-info");
  useEffect(() => { if (activeTab && tabs.some(t => t.id === activeTab)) setTab(activeTab); }, [activeTab]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TabBar tabs={tabs} active={tab} onSwitch={setTab} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-5" style={{ scrollbarWidth: "thin" }}>

        {tab === "program-info" && (
          <div className="space-y-4">
            <div className="bg-card rounded-lg border border-border p-5 space-y-4">
              {[
                { label: "Program Name", val: "FWD F Program 2024 — Agent Trainee", multi: false },
                { label: "Description", val: "FWD Vietnam's next-generation Agent training program, spanning 4 rounds from June to September 2024.", multi: true },
                { label: "Start Date", val: "01/06/2024", multi: false },
                { label: "End Date", val: "30/09/2024", multi: false },
                { label: "Organizer", val: "FWD Vietnam — F Program Organizing Committee", multi: false },
                { label: "Recruitment Target", val: "20 Office-confirmed Agents", multi: false },
              ].map(row => (
                <div key={row.label} className="grid grid-cols-3 gap-3 items-start">
                  <label className="text-xs font-medium text-muted-foreground pt-2">{row.label}</label>
                  <div className="col-span-2">
                    {row.multi
                      ? <textarea defaultValue={row.val} rows={3} className="w-full text-sm px-3 py-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 resize-none" />
                      : <input defaultValue={row.val} className="w-full text-sm px-3 py-1.5 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-[#0B3D2E]/20" />
                    }
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Btn variant="primary" size="sm">Save Changes</Btn>
                <Btn variant="secondary" size="sm">Cancel</Btn>
              </div>
            </div>
          </div>
        )}

        {tab === "rounds-config" && (
          <div className="space-y-3">
            <SectionHeader title="Rounds & Roadmap" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Add Round</Btn>} />
            <SimpleTable
              headers={["Round", "Round Name", "Start Date", "End Date", "Operational Status", "Actions"]}
              rows={[
                ["Round 1", "Discover",    "01/06/2024", "30/06/2024", <Badge className="bg-slate-100 text-slate-600">Closed</Badge>,      <Btn variant="ghost" size="xs">Edit</Btn>],
                ["Round 2", "Experience",  "01/07/2024", "31/07/2024", <Badge className="bg-slate-100 text-slate-600">Closed</Badge>,      <Btn variant="ghost" size="xs">Edit</Btn>],
                ["Round 3", "Prove",       "01/08/2024", "31/08/2024", <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Open</Badge>, <Btn variant="ghost" size="xs">Edit</Btn>],
                ["Round 4", "Become",      "01/09/2024", "30/09/2024", <Badge className="bg-gray-100 text-gray-500">Not Started</Badge>,   <Btn variant="ghost" size="xs">Edit</Btn>],
              ]}
            />
          </div>
        )}

        {tab === "rules" && (
          <div className="space-y-4">
            <SectionHeader title="Rules & Evaluation Criteria" />
            <SimpleTable
              headers={["Criteria", "Description", "Assessment Method", "Max Weight"]}
              rows={[
                ["Capability",    "Insurance expertise and advisory skills", "Assignment + AI Simulation", "40%"],
                ["Commitment",    "Dedication, diligence, and task completion", "Submission progress + Interview", "35%"],
                ["Advisory Fit",  "Alignment with FWD Agent culture and philosophy", "Case Study + Interview", "45%"],
              ]}
            />
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              Round advancement conditions: Weighted total score ≥ 70/100. No criteria with a score of 0. All mandatory submissions completed on time.
            </div>
          </div>
        )}

        {tab === "thresholds" && (
          <div className="space-y-4">
            <SectionHeader title="Round Pass Thresholds" />
            <p className="text-xs text-muted-foreground -mt-2 mb-2">Minimum total score required to advance to the next round.</p>
            <SimpleTable
              headers={["Round", "Name", "Min Score to Pass", "Status"]}
              rows={[
                ["V1", "CREATE", "≥ 60 pts", <Badge className="bg-slate-100 text-slate-500 text-[10px]">Locked</Badge>],
                ["V2", "BUILD",  "≥ 70 pts", <Badge className="bg-slate-100 text-slate-500 text-[10px]">Locked</Badge>],
                ["V3", "PROVE",  "≥ 75 pts", <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">Active</Badge>],
              ]}
            />
          </div>
        )}

        {tab === "dim-weights" && (
          <div className="space-y-6">
            <SectionHeader title="3-Dimension Weights by Round & Activity" />
            <div className="space-y-4">
              {[
                {
                  round: "V1 – CREATE",
                  rows: [
                    ["Behavior MCQ", "95 pts", "55", "—", "35", "90"],
                    ["Completion",   "5 pts",  "—", "10", "—", "10"],
                    ["Total",        "100 pts","55", "10", "35", "100"],
                  ],
                },
                {
                  round: "V2 – BUILD",
                  rows: [
                    ["CV / Essay",   "60 pts", "15", "20", "25", "60"],
                    ["Learning MCQ", "40 pts", "20", "10", "10", "40"],
                    ["Total",        "100 pts","35", "30", "35", "100"],
                  ],
                },
                {
                  round: "V3 – PROVE",
                  rows: [
                    ["Learning",      "30 pts", "15", "5",  "10", "30"],
                    ["Participation", "20 pts", "—",  "10", "10", "20"],
                    ["Interview",     "50 pts", "10", "—",  "40", "50"],
                    ["Total",         "100 pts","25", "15", "60", "100"],
                  ],
                },
              ].map(({ round, rows }) => (
                <div key={round}>
                  <div className="text-xs font-semibold text-foreground mb-1.5">{round}</div>
                  <SimpleTable
                    headers={["Activity", "Base", "CAP (Capability)", "COM (Commitment)", "ADV (Advisory Fit)", "Sum"]}
                    rows={rows.map((r, ri) => ri === rows.length - 1
                      ? r.map((cell, ci) => <span key={ci} className="font-bold text-foreground">{cell}</span>)
                      : r
                    )}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Weights are fixed per program design and cannot be changed mid-round.</p>
          </div>
        )}

        {tab === "controls" && (
          <div className="space-y-3">
            <SectionHeader title="Program Controls" />
            <div className="bg-card rounded-lg border border-border divide-y divide-border">
              {[
                { label: "Allow new registrations",          desc: "Open the registration portal for candidates",    on: false },
                { label: "Show results to candidates",       desc: "Candidates can view their own scores",            on: true },
                { label: "Allow Round 3 submissions",        desc: "Submission portal is open",                      on: true },
                { label: "Automated email notifications",    desc: "Send deadline reminders and results automatically", on: true },
                { label: "Maintenance mode",                 desc: "Hide the entire user interface",                  on: false },
              ].map(ctrl => (
                <div key={ctrl.label} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{ctrl.label}</div>
                    <div className="text-xs text-muted-foreground">{ctrl.desc}</div>
                  </div>
                  <div className={clsx("relative w-10 h-5 rounded-full transition-colors shrink-0 ml-4", ctrl.on ? "bg-[#0B3D2E]" : "bg-gray-200")}>
                    <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: ctrl.on ? "22px" : "2px" }} />
                  </div>
                </div>
              ))}
            </div>
            <Btn variant="primary" size="sm">Save Config</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 02. NỘI DUNG & ĐÀO TẠO
// ─────────────────────────────────────────────────────────────
function ContentManagementPage({ activeTab }: { activeTab?: string }) {
  const tabs = [
    { id: "courses",        label: "Courses & Materials" },
    { id: "mbti",           label: "MBTI Questions" },
    { id: "mcq",            label: "Assessment" },
    { id: "ai-sim",         label: "AI Simulation" },
    { id: "assignments",    label: "Assignments & Challenges" },
    { id: "content-matrix", label: "Content by Round" },
  ];
  const [tab, setTab] = useState(activeTab && tabs.some(t => t.id === activeTab) ? activeTab : "courses");
  useEffect(() => { if (activeTab && tabs.some(t => t.id === activeTab)) setTab(activeTab); }, [activeTab]);

  const COURSES = [
    { id: "C001", title: "Introduction to FWD F Program 2024",                type: "Video",   vong: "Round 1", tg: "15 min",      status: "Published", luot: 492 },
    { id: "C002", title: "FWD Products: Life Insurance Overview",              type: "PDF",     vong: "Round 1", tg: "30 pages",    status: "Published", luot: 481 },
    { id: "C003", title: "5-Step Advisory Process",                            type: "Video",   vong: "Round 2", tg: "25 min",      status: "Published", luot: 245 },
    { id: "C004", title: "Techniques for Handling Common Objections",          type: "Video",   vong: "Round 2", tg: "20 min",      status: "Published", luot: 238 },
    { id: "C005", title: "FNAR Framework — Financial Needs Analysis",          type: "PDF",     vong: "Round 3", tg: "45 pages",    status: "Published", luot: 58  },
    { id: "C006", title: "10 Classic Advisory Scenarios",                      type: "Article", vong: "Round 3", tg: "20 min read", status: "Published", luot: 55  },
    { id: "C007", title: "Client Portfolio Building Strategy",                 type: "Video",   vong: "Round 4", tg: "35 min",      status: "Draft",     luot: 0   },
  ];

  const MBTI_QS = [
    { id: "Q001", text: "Do you prefer working in a team or independently?",                          dim: "E/I", opts: "Team / Independent" },
    { id: "Q002", text: "When facing a problem, do you rely on intuition or concrete data?",          dim: "N/S", opts: "Intuition / Data" },
    { id: "Q003", text: "Do you make decisions based on logic or emotion?",                           dim: "T/F", opts: "Logic / Emotion" },
    { id: "Q004", text: "Do you prefer planning ahead or staying flexible?",                          dim: "J/P", opts: "Planning / Flexible" },
    { id: "Q005", text: "Do you feel more comfortable meeting many people or fewer people?",          dim: "E/I", opts: "Many / Few" },
    { id: "Q006", text: "Do you tend to focus on details or the big picture?",                        dim: "N/S", opts: "Details / Big picture" },
  ];

  const MCQ_QS = [
    { id: "M001", text: "Which life insurance product covers short-term mortality risk?",    ans: "Term Life Insurance" },
    { id: "M002", text: "In what year was FWD Vietnam founded?",                             ans: "2015" },
    { id: "M003", text: "What does CI Rider stand for?",                                     ans: "Critical Illness Rider" },
    { id: "M004", text: "What was FWD's benefit payout rate in 2023?",                       ans: "98.7%" },
    { id: "M005", text: "What is the typical waiting period for critical illness insurance?",ans: "90 days" },
  ];

  const AI_SCENARIOS = [
    { id: "AI001", title: "Client objection: 'Insurance is a waste of money'",  do: "Hard",   luot: 238 },
    { id: "AI002", title: "Advisory for a young family with 2 young children",  do: "Medium", luot: 231 },
    { id: "AI003", title: "Handling a client requesting contract cancellation",  do: "Hard",   luot: 55  },
    { id: "AI004", title: "Prospective client: First meeting",                   do: "Easy",   luot: 491 },
    { id: "AI005", title: "Financial needs analysis for a 50-year-old client",  do: "Medium", luot: 58  },
  ];

  const ASSIGNS = [
    { id: "T001", title: "Essay: Why I Want to Become a FWD Agent",           vong: "Round 1", han: "30/06/2024", nop: 487, status: "Published" },
    { id: "T002", title: "Case Study: Advisory for a Sample Client Family",    vong: "Round 2", han: "31/07/2024", nop: 231, status: "Published" },
    { id: "T003", title: "Practical Assignment: Advise a Real Client",         vong: "Round 3", han: "31/08/2024", nop: 52,  status: "Published" },
    { id: "T004", title: "6-Month Business Plan with FWD",                     vong: "Round 4", han: "30/09/2024", nop: 0,   status: "Draft" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TabBar tabs={tabs} active={tab} onSwitch={setTab} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-5" style={{ scrollbarWidth: "thin" }}>

        {tab === "courses" && (
          <div className="space-y-3">
            <SectionHeader title="Courses & Materials" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Add Content</Btn>} />
            <SimpleTable
              headers={["ID", "Title", "Type", "Round", "Duration", "Views", "Status"]}
              rows={COURSES.map(c => [
                <span className="font-mono text-xs text-muted-foreground">{c.id}</span>,
                c.title,
                <Badge className="bg-blue-50 text-blue-700">{c.type}</Badge>,
                c.vong,
                c.tg,
                <span className="font-mono">{c.luot}</span>,
                <Badge className={c.status === "Published" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}>{c.status}</Badge>,
              ])}
            />
          </div>
        )}

        {tab === "mbti" && (
          <div className="space-y-3">
            <SectionHeader title="MBTI Question Set" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Add Question</Btn>} />
            <SimpleTable
              headers={["ID", "Question", "Dimension", "Options"]}
              rows={MBTI_QS.map(q => [
                <span className="font-mono text-xs text-muted-foreground">{q.id}</span>,
                q.text,
                <Badge className="bg-violet-50 text-violet-700">{q.dim}</Badge>,
                <span className="text-xs text-muted-foreground">{q.opts}</span>,
              ])}
            />
          </div>
        )}

        {tab === "mcq" && (
          <div className="space-y-3">
            <SectionHeader title="Assessment (MCQ)" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Add Question</Btn>} />
            <SimpleTable
              headers={["ID", "Question", "Correct Answer", "Actions"]}
              rows={MCQ_QS.map(q => [
                <span className="font-mono text-xs text-muted-foreground">{q.id}</span>,
                q.text,
                <span className="text-emerald-700 font-medium text-xs">{q.ans}</span>,
                <Btn variant="ghost" size="xs">Edit</Btn>,
              ])}
            />
          </div>
        )}

        {tab === "ai-sim" && (
          <div className="space-y-3">
            <SectionHeader title="AI Simulation Scenarios" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Create Scenario</Btn>} />
            <SimpleTable
              headers={["ID", "Scenario Title", "Difficulty", "Attempts", "Actions"]}
              rows={AI_SCENARIOS.map(s => [
                <span className="font-mono text-xs text-muted-foreground">{s.id}</span>,
                s.title,
                <Badge className={s.do === "Hard" ? "bg-red-50 text-red-700" : s.do === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}>{s.do}</Badge>,
                <span className="font-mono">{s.luot}</span>,
                <Btn variant="ghost" size="xs">View Details</Btn>,
              ])}
            />
          </div>
        )}

        {tab === "assignments" && (
          <div className="space-y-3">
            <SectionHeader title="Assignments & Challenges" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Create Assignment</Btn>} />
            <SimpleTable
              headers={["ID", "Title", "Round", "Deadline", "Submissions", "Status"]}
              rows={ASSIGNS.map(a => [
                <span className="font-mono text-xs text-muted-foreground">{a.id}</span>,
                a.title,
                a.vong,
                a.han,
                <span className="font-mono">{a.nop}</span>,
                <Badge className={a.status === "Published" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}>{a.status}</Badge>,
              ])}
            />
          </div>
        )}

        {tab === "content-matrix" && (
          <div className="space-y-3">
            <SectionHeader title="Content Assignment by Round" />
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-left">Content Type</th>
                      {["Round 1 – Discover", "Round 2 – Experience", "Round 3 – Prove", "Round 4 – Become"].map(v => (
                        <th key={v} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-center">{v}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { type: "Video Courses",  vals: ["2 videos", "2 videos", "2 videos", "1 video"] },
                      { type: "PDF Materials",  vals: ["1 PDF",    "1 PDF",    "1 PDF",    "—"]        },
                      { type: "Essay",          vals: ["✓",        "—",        "—",        "✓"]        },
                      { type: "Case Study",     vals: ["—",        "✓",        "✓",        "—"]        },
                      { type: "AI Simulation",  vals: ["—",        "✓",        "✓",        "—"]        },
                      { type: "MBTI Test",      vals: ["—",        "✓",        "—",        "—"]        },
                    ].map(row => (
                      <tr key={row.type} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-medium text-foreground">{row.type}</td>
                        {row.vals.map((v, i) => (
                          <td key={i} className="px-4 py-2.5 text-center text-muted-foreground">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 03. NGƯỜI THAM GIA (4 mục không phải danh sách)
// ─────────────────────────────────────────────────────────────
function ParticipantsManagementPage({ activeTab, hideTabBar }: { activeTab?: string; hideTabBar?: boolean }) {
  const tabs = [
    { id: "applications",  label: "Review Applications", badge: "12" },
    { id: "teams",         label: "Teams & Mentors" },
    { id: "dev-path",      label: "Development Path" },
    { id: "status-update", label: "Round Status" },
    { id: "sub-gate",      label: "Submission Gate" },
  ];
  const [tab, setTab] = useState(activeTab && tabs.some(t => t.id === activeTab) ? activeTab : "applications");
  useEffect(() => { if (activeTab && tabs.some(t => t.id === activeTab)) setTab(activeTab); }, [activeTab]);

  const APPS = [
    { id: "APP001", name: "Trần Thị Mai Anh",   email: "maianh@gmail.com",   phone: "0901234567", university: "UEH",    major: "Finance - Banking",          date: "10/07" },
    { id: "APP002", name: "Nguyễn Hoàng Bảo",   email: "hoangbao@gmail.com", phone: "0912345678", university: "FTU",    major: "International Economics",        date: "11/07" },
    { id: "APP003", name: "Lê Thị Cẩm Tú",      email: "camtu@gmail.com",    phone: "0923456789", university: "NEU",    major: "Business Administration",       date: "11/07" },
    { id: "APP004", name: "Phạm Văn Dũng",       email: "vandung@gmail.com",  phone: "0934567890", university: "HUST",   major: "Financial Engineering",        date: "12/07" },
    { id: "APP005", name: "Vũ Thị Phương Thảo",  email: "pthao@gmail.com",    phone: "0945678901", university: "BUH",    major: "Insurance",                  date: "12/07" },
    { id: "APP006", name: "Đinh Văn Hiếu",        email: "vanhieu@gmail.com",  phone: "0956789012", university: "VNU-HCM", major: "Accounting",                 date: "13/07" },
    { id: "APP007", name: "Hoàng Thị Kim Yến",   email: "kimyen@gmail.com",   phone: "0967890123", university: "UEH",    major: "Marketing",                 date: "13/07" },
    { id: "APP008", name: "Ngô Minh Trí",         email: "minhtri@gmail.com",  phone: "0978901234", university: "FTU",    major: "International Finance",         date: "14/07" },
    { id: "APP009", name: "Bùi Thị Hồng Nhung",  email: "hnhung@gmail.com",   phone: "0989012345", university: "HUST",   major: "Economics",                   date: "14/07" },
    { id: "APP010", name: "Đặng Quốc Thắng",     email: "qthang@gmail.com",   phone: "0990123456", university: "UEH",    major: "Finance - Banking",            date: "15/07" },
    { id: "APP011", name: "Trịnh Hoài Nam",       email: "hoainam@gmail.com",  phone: "0901234561", university: "BUH",    major: "Insurance",                  date: "15/07" },
    { id: "APP012", name: "Lý Thiên Minh",        email: "thienminh@gmail.com",phone: "0912345679", university: "VNU-HCM", major: "Finance",                  date: "15/07" },
  ];

  const TEAMS = [
    { team: "Team Alpha", mentor: "Lê Văn Hùng",      members: ["Nguyễn Thị Minh Anh", "Hoàng Minh Khải", "Võ Thị Ngọc Trinh", "Cao Hoàng Phúc"] },
    { team: "Team Beta",  mentor: "Not assigned",          members: ["Trần Hoàng Nam", "Ngô Thị Diễm Quỳnh"] },
    { team: "Team Gamma", mentor: "Nguyễn Văn Khoa",   members: ["Phạm Thị Lan Hương", "Đặng Thị Thu Thảo", "Lưu Thị Khánh Linh"] },
    { team: "Team Delta", mentor: "Phạm Thị Hoa",      members: ["Vũ Ngọc Bảo", "Lý Hoàng Long", "Dương Văn Kiên"] },
    { team: "Team Sigma", mentor: "Not assigned",          members: ["Đinh Thị Thanh Tâm", "Trịnh Thị Mỹ Hạnh", "Chu Thị Thanh Xuân"] },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {!hideTabBar && <TabBar tabs={tabs} active={tab} onSwitch={setTab} />}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5" style={{ scrollbarWidth: "thin" }}>

        {tab === "applications" && (
          <div className="space-y-3">
            <SectionHeader title="New Applications — 12 pending review" action={
              <div className="flex gap-2">
                <Btn variant="secondary" size="sm"><Download className="w-3.5 h-3.5" />Export List</Btn>
                <Btn variant="primary" size="sm"><CheckSquare className="w-3.5 h-3.5" />Approve All</Btn>
              </div>
            } />
            <SimpleTable
              headers={["ID", "Full Name", "Email", "Phone", "School", "Major", "Registration Date", "Actions"]}
              rows={APPS.map(a => [
                <span className="font-mono text-xs text-muted-foreground">{a.id}</span>,
                <span className="font-medium">{a.name}</span>,
                a.email,
                a.phone,
                a.university,
                a.major,
                a.date,
                <div className="flex gap-1">
                  <Btn variant="primary" size="xs">Approve</Btn>
                  <Btn variant="danger" size="xs">Reject</Btn>
                </div>,
              ])}
            />
          </div>
        )}

        {tab === "teams" && (
          <div className="space-y-3">
            <SectionHeader title="Teams & Mentors" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Create Team</Btn>} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {TEAMS.map(t => (
                <div key={t.team} className="bg-card rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm text-foreground">{t.team}</span>
                    <Btn variant="ghost" size="xs">Edit</Btn>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Mentor: <span className={clsx("font-medium", t.mentor === "Not assigned" ? "text-amber-600" : "text-foreground")}>{t.mentor}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">Members ({t.members.length}):</div>
                  <div className="space-y-1">
                    {t.members.map(m => (
                      <div key={m} className="text-xs text-foreground bg-muted/40 rounded px-2 py-1">{m}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "dev-path" && (
          <div className="space-y-3">
            <SectionHeader title="Development Path by Candidate" />
            <SimpleTable
              headers={["Candidate", "School", "Strengths", "Areas to Develop", "Recommended Development Path"]}
              rows={[
                ["Nguyễn Thị Minh Anh", "UEH",     "High Advisory Fit (85)",     "Commitment needs improvement",   "Focus on advanced advisory scenarios"],
                ["Phạm Thị Lan Hương",  "NEU",     "Outstanding Capability (90)", "—",                              "Target GAD track"],
                ["Hoàng Minh Khải",     "FTU",     "All 3 criteria high",         "—",                              "Potential Agency Leader"],
                ["Vũ Ngọc Bảo",         "BUH",     "Strong Commitment (82)",      "Capability needs strengthening", "Enroll in additional product courses"],
                ["Ngô Thị Diễm Quỳnh", "VNU-HCM", "Commitment (65)",             "Advisory Fit needs improvement", "Add AI Simulation practice sessions"],
                ["Trần Hoàng Nam",      "FTU",     "—",                           "All 3 criteria At Risk",          "Needs urgent meeting with mentor"],
              ]}
            />
          </div>
        )}

        {tab === "status-update" && (
          <div className="space-y-3">
            <SectionHeader title="Round Status Update" />
            <SimpleTable
              headers={["Candidate", "Current Round", "Status", "Manual Update", "Action"]}
              rows={PARTICIPANTS.slice(0, 10).map(p => [
                <span className="font-medium">{p.name}</span>,
                <RoundBadge round={p.round} />,
                <StatusBadge status={p.status} />,
                <select className="text-xs px-2 py-1 border border-border rounded bg-background">
                  <option>In Progress</option>
                  <option>Qualified</option>
                  <option>At Risk</option>
                  <option>Not Qualified</option>
                </select>,
                <Btn variant="secondary" size="xs">Update</Btn>,
              ])}
            />
          </div>
        )}

        {tab === "sub-gate" && (
          <div className="space-y-4">
            <SectionHeader title="Open/Close Submission Gate by Round" />
            <div className="bg-card rounded-lg border border-border divide-y divide-border">
              {[
                { vong: "Round 1 – Discover",    han: "30/06/2024", open: false },
                { vong: "Round 2 – Experience",  han: "31/07/2024", open: false },
                { vong: "Round 3 – Prove",       han: "31/08/2024", open: true  },
                { vong: "Round 4 – Become",      han: "30/09/2024", open: false },
              ].map(v => (
                <div key={v.vong} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{v.vong}</div>
                    <div className="text-xs text-muted-foreground">Deadline: {v.han}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={v.open ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500"}>
                      {v.open ? "Open" : "Closed"}
                    </Badge>
                    <Btn variant={v.open ? "danger" : "primary"} size="xs">{v.open ? "Close Gate" : "Open Gate"}</Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 04. SUBMISSIONS MANAGEMENT
// ─────────────────────────────────────────────────────────────
function SubmissionsManagementPage({ activeTab }: { activeTab?: string }) {
  const tabs = [
    { id: "sub-list",      label: "Submission List" },
    { id: "rubrics",       label: "Scoring Rubric" },
    { id: "feedback-pg",   label: "Feedback" },
    { id: "retry-pg",      label: "Retry Requests" },
    { id: "approve-score", label: "Approve & Finalize Scores" },
  ];
  const [tab, setTab] = useState(activeTab && tabs.some(t => t.id === activeTab) ? activeTab : "sub-list");
  useEffect(() => { if (activeTab && tabs.some(t => t.id === activeTab)) setTab(activeTab); }, [activeTab]);

  const retryList = SUBMISSIONS.filter(s => s.lifecycle === "Retry");
  const approvedList = SUBMISSIONS.filter(s => s.lifecycle === "Approved");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TabBar tabs={tabs} active={tab} onSwitch={setTab} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-5" style={{ scrollbarWidth: "thin" }}>

        {tab === "sub-list" && (
          <div className="space-y-3">
            <SectionHeader title={`All Submissions — ${SUBMISSIONS.length} entries`} action={<Btn variant="secondary" size="sm"><Download className="w-3.5 h-3.5" />Export Report</Btn>} />
            <SimpleTable
              headers={["ID", "Candidate", "Round", "Type", "Submitted", "Column", "Lifecycle"]}
              rows={SUBMISSIONS.map(s => [
                <span className="font-mono text-xs text-muted-foreground">{s.id}</span>,
                s.participantName,
                <RoundBadge round={s.round} />,
                <Badge className={subTypeConfig[s.submissionType].cls}>{subTypeConfig[s.submissionType].label}</Badge>,
                s.submittedAt,
                <Badge className={s.column === "Reviewed" ? "bg-emerald-50 text-emerald-700" : s.column === "Reviewing" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}>
                  {s.column === "Pending" ? "Pending" : s.column === "Reviewing" ? "Reviewing" : "Done"}
                </Badge>,
                <SubmissionLifecycleStepper lifecycle={s.lifecycle} />,
              ])}
            />
          </div>
        )}

        {tab === "rubrics" && (
          <div className="space-y-5">
            <SectionHeader title="Scoring Rubric by Round" />
            {[
              {
                round: "V1 – CREATE",
                pass: "≥ 60 pts",
                activities: [
                  { name: "Behavior MCQ (95 pts)", items: [
                    { khia: "Capability (CAP)",   diem: "55 pts" },
                    { khia: "Advisory Fit (ADV)", diem: "35 pts" },
                  ]},
                  { name: "Completion (5 pts)", items: [
                    { khia: "Commitment (COM)",   diem: "10 pts" },
                  ]},
                ],
              },
              {
                round: "V2 – BUILD",
                pass: "≥ 70 pts",
                activities: [
                  { name: "CV / Essay (60 pts)", items: [
                    { khia: "Capability (CAP)",   diem: "15 pts" },
                    { khia: "Commitment (COM)",   diem: "20 pts" },
                    { khia: "Advisory Fit (ADV)", diem: "25 pts" },
                  ]},
                  { name: "Learning MCQ (40 pts)", items: [
                    { khia: "Capability (CAP)",   diem: "20 pts" },
                    { khia: "Commitment (COM)",   diem: "10 pts" },
                    { khia: "Advisory Fit (ADV)", diem: "10 pts" },
                  ]},
                ],
              },
              {
                round: "V3 – PROVE",
                pass: "≥ 75 pts",
                activities: [
                  { name: "Learning (30 pts)", items: [
                    { khia: "Capability (CAP)",   diem: "15 pts" },
                    { khia: "Commitment (COM)",   diem: "5 pts" },
                    { khia: "Advisory Fit (ADV)", diem: "10 pts" },
                  ]},
                  { name: "Participation (20 pts)", items: [
                    { khia: "Commitment (COM)",   diem: "10 pts" },
                    { khia: "Advisory Fit (ADV)", diem: "10 pts" },
                  ]},
                  { name: "Interview (50 pts)", items: [
                    { khia: "Capability (CAP)",   diem: "10 pts" },
                    { khia: "Advisory Fit (ADV)", diem: "40 pts" },
                  ]},
                ],
              },
            ].map(section => (
              <div key={section.round} className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-foreground">{section.round}</h4>
                  <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">Pass: {section.pass}</Badge>
                </div>
                <div className="space-y-3">
                  {section.activities.map(act => (
                    <div key={act.name}>
                      <div className="text-xs font-medium text-muted-foreground mb-1">{act.name}</div>
                      <SimpleTable
                        headers={["Dimension", "Weight"]}
                        rows={act.items.map(i => [i.khia, <span className="font-mono text-xs font-bold text-foreground">{i.diem}</span>])}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "feedback-pg" && (
          <div className="space-y-3">
            <SectionHeader title="Feedback Sent to Candidates" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Send New Feedback</Btn>} />
            <SimpleTable
              headers={["Candidate", "Submission", "Feedback Date", "Sent By", "Summary"]}
              rows={[
                ["Phạm Thị Lan Hương",  "Essay – Round 3", "16/08/2024", "Admin BTC", "Excellent Advisory Fit. Needs more supporting data for CAP."],
                ["Nguyễn Thị Minh Anh", "Essay – Round 3", "16/08/2024", "Admin BTC", "Good content, clear structure. Commitment needs to be more evident."],
                ["Vũ Ngọc Bảo",         "Case Study – R3", "17/08/2024", "Admin BTC", "Accurate risk analysis. Solution needs more specifics on coverage amount."],
                ["Ngô Thị Diễm Quỳnh", "AI Sim – Round 3","17/08/2024", "Admin BTC", "Retry requested: needs improvement in handling customer objections."],
                ["Lý Hoàng Long",        "Essay – Round 3", "18/08/2024", "Admin BTC", "Well-written but slightly long. Focus on 3 key points."],
              ]}
            />
          </div>
        )}

        {tab === "retry-pg" && (
          <div className="space-y-3">
            <SectionHeader title={`Retry Requests — ${retryList.length} pending`} />
            {retryList.length === 0 ? (
              <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">
                No submissions currently require a retry.
              </div>
            ) : (
              <SimpleTable
                headers={["Candidate", "Submission", "Round", "Type", "Retry Reason", "Retry Deadline", "Action"]}
                rows={retryList.map(s => [
                  s.participantName,
                  s.id,
                  <RoundBadge round={s.round} />,
                  <Badge className={subTypeConfig[s.submissionType].cls}>{subTypeConfig[s.submissionType].label}</Badge>,
                  "Needs improvement in handling objections",
                  "22/08/2024",
                  <Btn variant="ghost" size="xs">View Details</Btn>,
                ])}
              />
            )}
            <div className="bg-card rounded-lg border border-border p-4">
              <h4 className="text-sm font-semibold mb-2">Create New Retry Request</h4>
              <div className="flex gap-2">
                <input placeholder="Enter candidate name or ID..." className="flex-1 text-sm px-3 py-1.5 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-[#0B3D2E]/20" />
                <Btn variant="accent" size="sm">Create Retry Request</Btn>
              </div>
            </div>
          </div>
        )}

        {tab === "approve-score" && (
          <div className="space-y-3">
            <SectionHeader title={`Approve & Finalize Scores — ${approvedList.length} scored`} />
            <SimpleTable
              headers={["Candidate", "Submission", "CAP", "COM", "ADV", "Weighted Total", "Scorer", "Action"]}
              rows={[
                ["Phạm Thị Lan Hương",  "S009", "90","85","88","88","BTC Admin", <div className="flex gap-1"><Btn variant="primary" size="xs">Approve</Btn><Btn variant="danger" size="xs">Reject</Btn></div>],
                ["Đặng Thị Thu Thảo",   "S010", "92","88","90","90","BTC Admin", <div className="flex gap-1"><Btn variant="primary" size="xs">Approve</Btn><Btn variant="danger" size="xs">Reject</Btn></div>],
                ["Hoàng Minh Khải",     "S011", "88","90","87","88","BTC Admin", <div className="flex gap-1"><Btn variant="primary" size="xs">Approve</Btn><Btn variant="danger" size="xs">Reject</Btn></div>],
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 05. INTERVIEW MANAGEMENT
// ─────────────────────────────────────────────────────────────
function InterviewManagementPage({ activeTab }: { activeTab?: string }) {
  const tabs = [
    { id: "iv-rubric",   label: "Interview Rubric" },
    { id: "iv-assign",   label: "Interviewer Assignment" },
    { id: "iv-schedule", label: "Interview Schedule" },
    { id: "iv-results",  label: "Interview Results" },
    { id: "graduates",   label: "Finalize Graduates" },
  ];
  const [tab, setTab] = useState(activeTab && tabs.some(t => t.id === activeTab) ? activeTab : "iv-rubric");
  useEffect(() => { if (activeTab && tabs.some(t => t.id === activeTab)) setTab(activeTab); }, [activeTab]);

  const IV_SLOTS = [
    { id: "IV001", name: "Nguyễn Thị Minh Anh", interviewer: "Trần Văn Minh",  date: "28/08", time: "09:00", room: "Room A1",        status: "Completed", score: 88 },
    { id: "IV002", name: "Vũ Ngọc Bảo",          interviewer: "Lê Thị Hoa",     date: "28/08", time: "10:00", room: "Room A1",        status: "Completed", score: 82 },
    { id: "IV003", name: "Hoàng Minh Khải",       interviewer: "Nguyễn Văn Khoa",date: "28/08", time: "11:00", room: "Online – Zoom",  status: "Completed", score: 91 },
    { id: "IV004", name: "Đặng Thị Thu Thảo",    interviewer: "Phạm Thị Bích",  date: "29/08", time: "09:00", room: "Room B2",        status: "Confirmed", score: undefined },
    { id: "IV005", name: "Lưu Thị Khánh Linh",   interviewer: "Trần Văn Minh",  date: "29/08", time: "10:00", room: "Room B2",        status: "Confirmed", score: undefined },
    { id: "IV006", name: "Cao Hoàng Phúc",        interviewer: "Lê Thị Hoa",     date: "29/08", time: "11:00", room: "Online – Teams", status: "Pending",   score: undefined },
    { id: "IV007", name: "Ngô Thị Diễm Quỳnh",  interviewer: "Nguyễn Văn Khoa",date: "30/08", time: "14:00", room: "Room A1",        status: "Pending",   score: undefined },
    { id: "IV008", name: "Lý Hoàng Long",          interviewer: "Phạm Thị Bích",  date: "30/08", time: "15:00", room: "Room C3",        status: "Absent",    score: undefined },
  ];

  const statusCls: Record<string, string> = {
    "Completed": "bg-emerald-50 text-emerald-700",
    "Confirmed": "bg-blue-50 text-blue-700",
    "Pending":   "bg-amber-50 text-amber-700",
    "Absent":    "bg-red-50 text-red-700",
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TabBar tabs={tabs} active={tab} onSwitch={setTab} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-5" style={{ scrollbarWidth: "thin" }}>

        {tab === "iv-rubric" && (
          <div className="space-y-4">
            <SectionHeader title="Interview Rubric — Finals" />
            <SimpleTable
              headers={["Evaluation Criterion", "Score Range", "Scoring Guide"]}
              rows={[
                ["Product & market knowledge",          "0–25", "Strong command of FWD product portfolio, understands VN insurance market"],
                ["Communication & presentation skills", "0–25", "Clear, confident, professional language, handles questions well"],
                ["Critical thinking & problem solving", "0–25", "Logical, creative, flexible in real-world scenarios"],
                ["FWD culture fit (Advisory Fit)",      "0–25", "Demonstrates empathy, long-term values, customer-oriented mindset"],
              ]}
            />
          </div>
        )}

        {tab === "iv-assign" && (
          <div className="space-y-3">
            <SectionHeader title="Interviewer Assignment" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Add Assignment</Btn>} />
            <SimpleTable
              headers={["Interviewer", "Title", "Candidates Assigned", "Interviewed", "Remaining"]}
              rows={[
                ["Trần Văn Minh",  "GAD – FWD Ho Chi Minh City", "3", "2", "1"],
                ["Lê Thị Hoa",     "Agency Manager",              "3", "2", "1"],
                ["Nguyễn Văn Khoa","GAD – FWD Hanoi",             "3", "2", "1"],
                ["Phạm Thị Bích",  "Training Manager",            "3", "1", "2"],
              ]}
            />
          </div>
        )}

        {tab === "iv-schedule" && (
          <div className="space-y-3">
            <SectionHeader title="Interview Schedule" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Add Slot</Btn>} />
            <SimpleTable
              headers={["ID", "Candidate", "Interviewer", "Date", "Time", "Location", "Status"]}
              rows={IV_SLOTS.map(s => [
                <span className="font-mono text-xs text-muted-foreground">{s.id}</span>,
                s.name,
                s.interviewer,
                s.date,
                s.time,
                s.room,
                <Badge className={statusCls[s.status] ?? "bg-gray-100 text-gray-500"}>{s.status}</Badge>,
              ])}
            />
          </div>
        )}

        {tab === "iv-results" && (
          <div className="space-y-3">
            <SectionHeader title="Interview Results" action={<Btn variant="secondary" size="sm"><Download className="w-3.5 h-3.5" />Export Results</Btn>} />
            <SimpleTable
              headers={["Candidate", "Interviewer", "Date", "Score", "Comments", "Recommendation"]}
              rows={IV_SLOTS.filter(s => s.score !== undefined).map(s => [
                s.name,
                s.interviewer,
                s.date,
                <span className={clsx("font-mono font-bold", (s.score ?? 0) >= 80 ? "text-emerald-600" : "text-amber-600")}>{s.score}/100</span>,
                s.id === "IV001" ? "Confident, handled objections well" : s.id === "IV002" ? "Strong listening skills, ask more probing questions" : "Deep product knowledge, practical strategy",
                (s.score ?? 0) >= 85 ? <Badge className="bg-emerald-50 text-emerald-700">Recommend Graduate</Badge> : <Badge className="bg-blue-50 text-blue-700">Review Further</Badge>,
              ])}
            />
          </div>
        )}

        {tab === "graduates" && (
          <div className="space-y-3">
            <SectionHeader title="Finalize Graduate List" action={
              <div className="flex gap-2">
                <Btn variant="secondary" size="sm"><Download className="w-3.5 h-3.5" />Export List</Btn>
                <Btn variant="accent" size="sm"><CheckSquare className="w-3.5 h-3.5" />Publish Results</Btn>
              </div>
            } />
            <SimpleTable
              headers={["Candidate", "School", "Total Score (4 Rounds)", "Interview Score", "Combined Score", "Result", "Action"]}
              rows={[
                ["Hoàng Minh Khải",    "FTU",     "88", "91", "89", <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Graduate</Badge>,     <Btn variant="ghost" size="xs">Confirm</Btn>],
                ["Đặng Thị Thu Thảo", "BUH",     "90", "—",  "—",  <Badge className="bg-amber-50 text-amber-700">Awaiting IV</Badge>,                              <Btn variant="ghost" size="xs">View</Btn>],
                ["Lưu Thị Khánh Linh","FTU",     "91", "—",  "—",  <Badge className="bg-amber-50 text-amber-700">Awaiting IV</Badge>,                              <Btn variant="ghost" size="xs">View</Btn>],
                ["Nguyễn Thị Minh Anh","UEH",    "85", "88", "86", <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Graduate</Badge>,     <Btn variant="ghost" size="xs">Confirm</Btn>],
                ["Lý Hoàng Long",      "UEH",     "80", "—",  "—",  <Badge className="bg-red-50 text-red-700">Absent (IV)</Badge>,                                  <Btn variant="ghost" size="xs">View</Btn>],
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 06. SCORE MANAGEMENT
// ─────────────────────────────────────────────────────────────
function ScoreManagementPage({ activeTab, hideTabBar }: { activeTab?: string; hideTabBar?: boolean }) {
  const tabs = [
    { id: "score-cfg",      label: "Bonus/Penalty Rules" },
    { id: "score-approval", label: "Approve Bonus/Penalty" },
    { id: "score-adjust",   label: "Manual Score Adjustment" },
    { id: "score-history",  label: "Change History" },
  ];
  const [tab, setTab] = useState(activeTab && tabs.some(t => t.id === activeTab) ? activeTab : "score-cfg");
  useEffect(() => { if (activeTab && tabs.some(t => t.id === activeTab)) setTab(activeTab); }, [activeTab]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {!hideTabBar && <TabBar tabs={tabs} active={tab} onSwitch={setTab} />}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5" style={{ scrollbarWidth: "thin" }}>

        {tab === "score-cfg" && (
          <div className="space-y-6">
            <div>
              <SectionHeader title="Bonus Rules" />
              <SimpleTable
                headers={["Event", "Type", "Points", "Status"]}
                rows={[
                  ["Complete all challenges",  "Bonus", "+10 pts", <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>],
                  ["Complete learning path",   "Bonus", "+5 pts",  <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>],
                  ["Q&A contribution",         "Bonus", "+5 pts",  <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>],
                  ["Bonus challenge",          "Bonus", "+5 pts",  <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>],
                ]}
              />
            </div>
            <div>
              <SectionHeader title="Penalty Rules" />
              <SimpleTable
                headers={["Event", "Type", "Points", "Status"]}
                rows={[
                  ["Miss deadline",            "Penalty", "−5 pts",  <Badge className="bg-red-50 text-red-700">Active</Badge>],
                  ["Miss required activity",   "Penalty", "−10 pts", <Badge className="bg-red-50 text-red-700">Active</Badge>],
                  ["Incomplete submission",    "Penalty", "−5 pts",  <Badge className="bg-red-50 text-red-700">Active</Badge>],
                  ["Compliance issue",         "Penalty", "−20 pts", <Badge className="bg-red-50 text-red-700">Active</Badge>],
                ]}
              />
            </div>
          </div>
        )}

        {tab === "score-approval" && (
          <div className="space-y-3">
            <SectionHeader title="Pending Bonus/Penalty Approvals" />
            <SimpleTable
              headers={["Candidate", "Type", "Points", "Reason", "Proposed By", "Action"]}
              rows={[
                ["Nguyễn Thị Minh Anh", "Bonus",   "+5 pts", "Outstanding achievement in August",       "GAD Khoa", <div className="flex gap-1"><Btn variant="primary" size="xs">Approve</Btn><Btn variant="danger" size="xs">Reject</Btn></div>],
                ["Hoàng Minh Khải",     "Bonus",   "+3 pts", "3 consecutive early submissions",          "GAD Bích", <div className="flex gap-1"><Btn variant="primary" size="xs">Approve</Btn><Btn variant="danger" size="xs">Reject</Btn></div>],
                ["Trần Hoàng Nam",      "Penalty", "−5 pts", "Round 3 submission 12 hours late",         "System",   <div className="flex gap-1"><Btn variant="primary" size="xs">Confirm</Btn><Btn variant="ghost" size="xs">Dismiss</Btn></div>],
              ]}
            />
          </div>
        )}

        {tab === "score-adjust" && (
          <div className="max-w-md space-y-4">
            <SectionHeader title="Manual Score Adjustment" />
            <div className="bg-card rounded-lg border border-border p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Candidate</label>
                <input placeholder="Enter candidate name or ID..." className="w-full text-sm px-3 py-1.5 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-[#0B3D2E]/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="py-1.5 text-xs font-medium rounded-md border bg-emerald-600 text-white border-emerald-600">+ Add Points</button>
                  <button className="py-1.5 text-xs font-medium rounded-md border text-muted-foreground border-border hover:bg-muted">− Deduct Points</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Points</label>
                <input type="number" defaultValue={5} min={1} max={50} className="w-full text-sm px-3 py-1.5 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Reason (required)</label>
                <textarea rows={3} placeholder="Describe the reason for adjusting the score..." className="w-full text-sm px-3 py-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 resize-none" />
              </div>
              <Btn variant="primary" size="sm" className="w-full justify-center">Confirm & Log History</Btn>
            </div>
          </div>
        )}

        {tab === "score-history" && (
          <div className="space-y-3">
            <SectionHeader title="Score Change History" action={<Btn variant="secondary" size="sm"><Download className="w-3.5 h-3.5" />Export Log</Btn>} />
            <SimpleTable
              headers={["Time", "Candidate", "Type", "Points", "Reason", "Actioned By"]}
              rows={[
                ["18/08 09:15", "Nguyễn Thị Minh Anh", "Bonus",   "+5 pts", "Outstanding achievement in August",      "Admin BTC"],
                ["17/08 14:30", "Hoàng Minh Khải",     "Bonus",   "+3 pts", "24h early submission",                    "System"],
                ["16/08 08:00", "Trần Hoàng Nam",      "Penalty", "−5 pts", "Round 3 submission 12h late",             "System"],
                ["15/08 17:45", "Lưu Thị Khánh Linh", "Bonus",   "+2 pts", "Completed optional course",               "Admin BTC"],
                ["14/08 11:00", "Đặng Thị Thu Thảo",  "Bonus",   "+8 pts", "Special GAD recommendation",              "GAD Khoa"],
                ["13/08 16:20", "Vũ Ngọc Bảo",        "Penalty", "−3 pts", "Case Study submitted 6h late",            "System"],
              ].map(r => [
                <span className="font-mono text-xs text-muted-foreground">{r[0]}</span>,
                r[1],
                <Badge className={r[2] === "Bonus" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>{r[2]}</Badge>,
                <span className={clsx("font-mono font-bold text-xs", r[2] === "Bonus" ? "text-emerald-600" : "text-red-600")}>{r[3]}</span>,
                r[4], r[5],
              ])}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 07. MATCHING & AMBASSADOR
// ─────────────────────────────────────────────────────────────
function MatchingManagementPage({ activeTab }: { activeTab?: string }) {
  const tabs = [
    { id: "office-list",  label: "Office List" },
    { id: "office-match", label: "Office Matching" },
    { id: "ambassador",   label: "Ambassador" },
    { id: "social-track", label: "Social Media Performance" },
  ];
  const [tab, setTab] = useState(activeTab && tabs.some(t => t.id === activeTab) ? activeTab : "office-list");
  useEffect(() => { if (activeTab && tabs.some(t => t.id === activeTab)) setTab(activeTab); }, [activeTab]);

  const OFFICES = [
    { id: "OFF001", name: "FWD Hanoi – Central",          gad: "Nguyễn Văn Khoa",  dia: "Hoan Kiem, Hanoi",          cap: 5, filled: 3 },
    { id: "OFF002", name: "FWD Ho Chi Minh City – D1",   gad: "Lê Thị Hoa",       dia: "District 1, Ho Chi Minh City", cap: 6, filled: 4 },
    { id: "OFF003", name: "FWD Ho Chi Minh City – BT",   gad: "Phạm Thị Bích",    dia: "Binh Thanh, Ho Chi Minh City", cap: 4, filled: 2 },
    { id: "OFF004", name: "FWD Da Nang",                  gad: "Trần Văn Minh",    dia: "Hai Chau, Da Nang",            cap: 4, filled: 0 },
    { id: "OFF005", name: "FWD Can Tho",                  gad: "Hoàng Thị Mai",    dia: "Ninh Kieu, Can Tho",           cap: 3, filled: 1 },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TabBar tabs={tabs} active={tab} onSwitch={setTab} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-5" style={{ scrollbarWidth: "thin" }}>

        {tab === "office-list" && (
          <div className="space-y-3">
            <SectionHeader title="Office List" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Add Office</Btn>} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {OFFICES.map(o => (
                <div key={o.id} className="bg-card rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-sm text-foreground">{o.name}</span>
                    <Btn variant="ghost" size="xs">Edit</Btn>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>GAD: <span className="text-foreground font-medium">{o.gad}</span></div>
                    <div>Address: {o.dia}</div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-mono font-medium">{o.filled}/{o.cap}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0B3D2E] rounded-full" style={{ width: `${(o.filled / o.cap) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "office-match" && (
          <div className="space-y-3">
            <SectionHeader title="Match Candidates to Offices" action={
              <div className="flex gap-2">
                <Btn variant="secondary" size="sm">AI Auto-Suggest</Btn>
                <Btn variant="accent" size="sm"><CheckSquare className="w-3.5 h-3.5" />Confirm Match</Btn>
              </div>
            } />
            <SimpleTable
              headers={["Candidate", "Total Score", "Preferred Area", "Suggested Office", "Status", "Action"]}
              rows={[
                ["Hoàng Minh Khải",     "89", "Hanoi",            "FWD Hanoi – Central",         <Badge className="bg-amber-50 text-amber-700">Pending</Badge>,   <Btn variant="ghost" size="xs">Match Now</Btn>],
                ["Nguyễn Thị Minh Anh","86", "Ho Chi Minh City", "FWD Ho Chi Minh City – D1",   <Badge className="bg-amber-50 text-amber-700">Pending</Badge>,   <Btn variant="ghost" size="xs">Match Now</Btn>],
                ["Đặng Thị Thu Thảo",  "88", "Ho Chi Minh City", "FWD Ho Chi Minh City – BT",   <Badge className="bg-amber-50 text-amber-700">Pending</Badge>,   <Btn variant="ghost" size="xs">Match Now</Btn>],
                ["Lưu Thị Khánh Linh", "90", "Ho Chi Minh City", "FWD Ho Chi Minh City – D1",   <Badge className="bg-emerald-50 text-emerald-700">Matched</Badge>, <Btn variant="ghost" size="xs">View</Btn>],
                ["Cao Hoàng Phúc",     "85", "Flexible",          "FWD Da Nang",                  <Badge className="bg-amber-50 text-amber-700">Pending</Badge>,   <Btn variant="ghost" size="xs">Match Now</Btn>],
              ]}
            />
          </div>
        )}

        {tab === "ambassador" && (
          <div className="space-y-3">
            <SectionHeader title="Ambassador List" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Assign Ambassador</Btn>} />
            <SimpleTable
              headers={["Candidate", "School", "Platform", "Followers", "Program Posts", "Reach", "Status"]}
              rows={[
                ["Nguyễn Thị Minh Anh","UEH",     "TikTok + Facebook", "12.5K", "8 posts",  "45,200", <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>],
                ["Phạm Thị Lan Hương", "NEU",     "Instagram",          "8.2K",  "6 posts",  "28,400", <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>],
                ["Hoàng Minh Khải",    "FTU",     "LinkedIn",           "3.1K",  "10 posts", "15,600", <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>],
                ["Đặng Thị Thu Thảo", "BUH",     "TikTok",             "22K",   "12 posts", "89,500", <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>],
                ["Lưu Thị Khánh Linh","FTU",     "Facebook + TikTok",  "5.8K",  "7 posts",  "31,200", <Badge className="bg-blue-50 text-blue-700">Newly Joined</Badge>],
              ]}
            />
          </div>
        )}

        {tab === "social-track" && (
          <div className="space-y-4">
            <SectionHeader title="Program Social Media Performance" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Reach",        val: "210,000+", sub: "All platforms",          color: "text-[#0B3D2E]" },
                { label: "Official Posts",      val: "43",       sub: "From Ambassadors",       color: "text-violet-600" },
                { label: "Social-Referred Apps",val: "328",      sub: "Ref from TikTok/FB",     color: "text-[#FF6B00]" },
                { label: "Conversion Rate",     val: "15.6%",    sub: "Reach → Registration",   color: "text-emerald-600" },
              ].map(s => (
                <div key={s.label} className="bg-card rounded-lg border border-border p-4">
                  <div className={clsx("text-2xl font-bold font-mono", s.color)}>{s.val}</div>
                  <div className="text-xs font-medium text-foreground mt-1">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.sub}</div>
                </div>
              ))}
            </div>
            <SimpleTable
              headers={["Ambassador", "Platform", "Posts", "Views", "Interactions", "Applications Referred"]}
              rows={[
                ["Đặng Thị Thu Thảo", "TikTok",           "12", "89,500", "12,400", "67"],
                ["Nguyễn Thị Minh Anh","TikTok + Facebook","8",  "45,200", "6,800",  "43"],
                ["Lưu Thị Khánh Linh", "Facebook + TikTok","7",  "31,200", "4,200",  "38"],
                ["Phạm Thị Lan Hương", "Instagram",        "6",  "28,400", "3,900",  "31"],
                ["Hoàng Minh Khải",    "LinkedIn",         "10", "15,600", "2,100",  "22"],
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 08. NOTIFICATIONS & SUPPORT
// ─────────────────────────────────────────────────────────────
function NotificationsManagementPage({ activeTab }: { activeTab?: string }) {
  const tabs = [
    { id: "announcements",   label: "Compose Announcement" },
    { id: "reminders",       label: "Reminders" },
    { id: "support-tickets", label: "Participant Support", badge: "3" },
  ];
  const [tab, setTab] = useState(activeTab && tabs.some(t => t.id === activeTab) ? activeTab : "announcements");
  useEffect(() => { if (activeTab && tabs.some(t => t.id === activeTab)) setTab(activeTab); }, [activeTab]);

  const TICKETS = [
    { id: "TK001", from: "Nguyễn Thị Minh Anh", subj: "Question about Round 3 submission deadline", time: "15/08 08:30", status: "Unanswered" },
    { id: "TK002", from: "Trần Hoàng Nam",       subj: "Error uploading PDF file",                   time: "15/08 09:15", status: "Unanswered" },
    { id: "TK003", from: "Lưu Thị Khánh Linh",  subj: "Feedback on Scorecard results",               time: "13/08 14:00", status: "Unanswered" },
    { id: "TK004", from: "Vũ Ngọc Bảo",          subj: "Question about scoring criteria",             time: "14/08 16:45", status: "Replied"    },
    { id: "TK005", from: "Đinh Thị Thanh Tâm",   subj: "Interview schedule confirmation",             time: "14/08 11:20", status: "Replied"    },
    { id: "TK006", from: "Ngô Thị Diễm Quỳnh",  subj: "Resubmission after Retry",                   time: "11/08 17:30", status: "Replied"    },
  ];

  const SENT_ANNOUNCEMENTS = [
    { id: "AN001", title: "Finals Interview Schedule 2024",               audience: "Round 4",          date: "12/08/2024", channel: "Email + App" },
    { id: "AN002", title: "Round 3 Submission Reminder — 5 days left",  audience: "Round 3",          date: "15/08/2024", channel: "Email + SMS" },
    { id: "AN003", title: "Round 2 Results Published",                   audience: "All",              date: "05/08/2024", channel: "Email + App" },
    { id: "AN004", title: "Round 3 Registration Now Open",               audience: "Round 2 Qualified",date: "01/08/2024", channel: "Email" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TabBar tabs={tabs} active={tab} onSwitch={setTab} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-5" style={{ scrollbarWidth: "thin" }}>

        {tab === "announcements" && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="space-y-4">
              <SectionHeader title="Compose New Announcement" />
              <div className="bg-card rounded-lg border border-border p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Announcement Title</label>
                  <input placeholder="Enter title..." className="w-full text-sm px-3 py-1.5 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-[#0B3D2E]/20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Audience</label>
                  <select className="w-full text-sm px-3 py-1.5 border border-border rounded-md bg-background outline-none">
                    <option>All candidates</option>
                    <option>Round 3 participants</option>
                    <option>Round 4 – Finals</option>
                    <option>At-risk candidates</option>
                    <option>Specific group</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Channels</label>
                  <div className="flex gap-3">
                    {["Email", "SMS", "App Notification"].map(c => (
                      <label key={c} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="checkbox" defaultChecked={c !== "SMS"} className="rounded" />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Content</label>
                  <textarea rows={5} placeholder="Compose announcement content here..." className="w-full text-sm px-3 py-2 border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-[#0B3D2E]/20 resize-none" />
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Btn variant="primary" size="sm">Publish Now</Btn>
                  <Btn variant="secondary" size="sm">Save Draft</Btn>
                  <Btn variant="ghost" size="sm">Preview</Btn>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <SectionHeader title="Sent Announcements" />
              <SimpleTable
                headers={["Title", "Audience", "Date Sent", "Channel"]}
                rows={SENT_ANNOUNCEMENTS.map(a => [a.title, a.audience, a.date, a.channel])}
              />
            </div>
          </div>
        )}

        {tab === "reminders" && (
          <div className="space-y-3">
            <SectionHeader title="Automated Reminders" action={<Btn variant="primary" size="sm"><Plus className="w-3.5 h-3.5" />Add Reminder</Btn>} />
            <SimpleTable
              headers={["Event", "Deadline", "Remind Before", "Channel", "Status"]}
              rows={[
                ["Round 3 Assignment Submission",  "31/08/2024", "7 days + 1 day", "Email + App", <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>],
                ["Scorer Score Finalization",      "05/09/2024", "3 days",          "Email",       <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>],
                ["Interview Schedule Confirmation","27/08/2024", "2 days + 1 day",  "SMS + Email", <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>],
                ["Graduate Results Published",     "30/09/2024", "1 day",           "App",         <Badge className="bg-gray-100 text-gray-500">Not Active</Badge>],
                ["Update Personal Profile",        "31/08/2024", "14 days",         "Email",       <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>],
              ]}
            />
          </div>
        )}

        {tab === "support-tickets" && (
          <div className="space-y-3">
            <SectionHeader title={`Support Requests — ${TICKETS.filter(t => t.status === "Unanswered").length} unanswered`} />
            <div className="space-y-2">
              {TICKETS.map(tk => (
                <div key={tk.id} className={clsx("bg-card rounded-lg border p-4", tk.status === "Unanswered" ? "border-amber-200" : "border-border")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">{tk.from}</span>
                        <Badge className={tk.status === "Unanswered" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}>
                          {tk.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-foreground">{tk.subj}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">{tk.time}</div>
                    </div>
                    <Btn variant={tk.status === "Unanswered" ? "primary" : "ghost"} size="xs">
                      {tk.status === "Unanswered" ? "Reply" : "View"}
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 09. ANALYTICS & REPORTS
// ─────────────────────────────────────────────────────────────
function AnalyticsManagementPage({ activeTab }: { activeTab?: string }) {
  const tabs = [
    { id: "progress-dashboard",   label: "Progress & Completion" },
    { id: "score-dashboard",      label: "3-Criteria Analysis" },
    { id: "submission-dashboard", label: "Submissions & Office Matching" },
    { id: "export-pg",            label: "Export Reports" },
  ];
  const [tab, setTab] = useState(activeTab && tabs.some(t => t.id === activeTab) ? activeTab : "progress-dashboard");
  useEffect(() => { if (activeTab && tabs.some(t => t.id === activeTab)) setTab(activeTab); }, [activeTab]);

  const progressData = [
    { name: "Round 1",  tong: 500, dat: 250, phanTram: 50  },
    { name: "Round 2",  tong: 250, dat: 60,  phanTram: 24  },
    { name: "Round 3",  tong: 60,  dat: 30,  phanTram: 50  },
    { name: "Finals",   tong: 30,  dat: 0,   phanTram: 0   },
  ];

  const scoreData = [
    { name: "A001 – Minh Anh",  cap: 82, com: 88, adv: 85 },
    { name: "A003 – Lan Hương", cap: 90, com: 85, adv: 88 },
    { name: "A005 – Ngọc Bảo",  cap: 78, com: 82, adv: 80 },
    { name: "A007 – Minh Khải", cap: 88, com: 90, adv: 87 },
    { name: "A010 – Thu Thảo",  cap: 92, com: 88, adv: 90 },
    { name: "A018 – Khánh Linh",cap: 91, com: 89, adv: 93 },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TabBar tabs={tabs} active={tab} onSwitch={setTab} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-5" style={{ scrollbarWidth: "thin" }}>

        {tab === "progress-dashboard" && (
          <div className="space-y-4">
            <SectionHeader title="Completion Progress by Round" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {progressData.map(d => (
                <div key={d.name} className="bg-card rounded-lg border border-border p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{d.name}</div>
                  <div className="text-2xl font-bold font-mono text-foreground">{d.tong}</div>
                  <div className="text-xs text-muted-foreground">Total candidates</div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0B3D2E] rounded-full" style={{ width: `${d.phanTram}%` }} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{d.dat} passed ({d.phanTram}%)</div>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-lg border border-border p-5">
              <h4 className="text-sm font-semibold text-foreground mb-4">Conversion Rate by Round</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={progressData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v} candidates`]} />
                  <Bar dataKey="tong" fill="#E6F0EC" name="Total" radius={[4,4,0,0]} />
                  <Bar dataKey="dat" fill="#0B3D2E" name="Passed" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === "score-dashboard" && (
          <div className="space-y-4">
            <SectionHeader title="3-Criteria Analysis — Round 3" />
            <div className="bg-card rounded-lg border border-border p-5">
              <h4 className="text-sm font-semibold text-foreground mb-4">Capability / Commitment / Advisory Fit Scores</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={scoreData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine y={75} stroke="#FF6B00" strokeDasharray="4 4" label={{ value: "V3 Threshold 75", fontSize: 10, fill: "#FF6B00" }} />
                  <Bar dataKey="cap" fill="#0B3D2E" name="Capability" radius={[3,3,0,0]} />
                  <Bar dataKey="com" fill="#3DA87E" name="Commitment" radius={[3,3,0,0]} />
                  <Bar dataKey="adv" fill="#FF6B00" name="Advisory Fit" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">V3 weights: CAP 25% · COM 15% · ADV 60% · Pass threshold ≥ 75</p>
            <SimpleTable
              headers={["Candidate", "CAP (25%)", "COM (15%)", "ADV (60%)", "Weighted Total", "Grade"]}
              rows={scoreData.map(d => {
                const total = Math.round(d.cap * 0.25 + d.com * 0.15 + d.adv * 0.60);
                return [
                  d.name.split(" – ")[1],
                  <span className="font-mono">{d.cap}</span>,
                  <span className="font-mono">{d.com}</span>,
                  <span className="font-mono">{d.adv}</span>,
                  <span className="font-mono font-bold">{total}</span>,
                  <Badge className={total >= 85 ? "bg-emerald-50 text-emerald-700" : total >= 75 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}>
                    {total >= 85 ? "Excellent" : total >= 75 ? "Qualified" : "Not Qualified"}
                  </Badge>,
                ];
              })}
            />
          </div>
        )}

        {tab === "submission-dashboard" && (
          <div className="space-y-4">
            <SectionHeader title="Submission & Office Matching Statistics" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Submissions",  val: SUBMISSIONS.length.toString(),                                                    color: "text-[#0B3D2E]" },
                { label: "Pending Scoring",     val: SUBMISSIONS.filter(s => s.column === "Pending").length.toString(),              color: "text-amber-600"  },
                { label: "Approved",            val: SUBMISSIONS.filter(s => s.lifecycle === "Approved").length.toString(),         color: "text-emerald-600"},
                { label: "Retry Requested",     val: SUBMISSIONS.filter(s => s.lifecycle === "Retry").length.toString(),            color: "text-[#FF6B00]"  },
              ].map(s => (
                <div key={s.label} className="bg-card rounded-lg border border-border p-4">
                  <div className={clsx("text-2xl font-bold font-mono", s.color)}>{s.val}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <SimpleTable
              headers={["Office", "GAD", "Target", "Matched", "Remaining", "Status"]}
              rows={[
                ["FWD Hanoi – Central",          "Nguyễn Văn Khoa", "5", "3", "2", <Badge className="bg-amber-50 text-amber-700">Spots Available</Badge>],
                ["FWD Ho Chi Minh City – D1",    "Lê Thị Hoa",      "6", "4", "2", <Badge className="bg-amber-50 text-amber-700">Spots Available</Badge>],
                ["FWD Ho Chi Minh City – BT",    "Phạm Thị Bích",   "4", "2", "2", <Badge className="bg-amber-50 text-amber-700">Spots Available</Badge>],
                ["FWD Da Nang",                  "Trần Văn Minh",   "4", "0", "4", <Badge className="bg-red-50 text-red-700">No agent yet</Badge>],
                ["FWD Can Tho",                  "Hoàng Thị Mai",   "3", "1", "2", <Badge className="bg-amber-50 text-amber-700">Spots Available</Badge>],
              ]}
            />
          </div>
        )}

        {tab === "export-pg" && (
          <div className="space-y-4">
            <SectionHeader title="Export Reports" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Program Funnel Overview",          desc: "Conversion data across the full program",              fmt: "Excel + PDF" },
                { title: "Full Candidate Scorecard",          desc: "3-criteria scores + weighted total",                   fmt: "Excel" },
                { title: "Finals Interview Results",          desc: "Interview scores and Graduate recommendations",         fmt: "PDF" },
                { title: "Detailed Submission List",          desc: "All submissions and lifecycle status",                  fmt: "Excel" },
                { title: "Office Matching Report",            desc: "Agent allocation by office and GAD",                   fmt: "Excel + PDF" },
                { title: "Social Media Performance Stats",   desc: "Reach and engagement from Ambassadors",                 fmt: "PDF" },
                { title: "Score Adjustment Log",              desc: "Bonus/penalty history with confirmations",              fmt: "Excel" },
                { title: "Program Summary (Slide Deck)",      desc: "Executive summary slide deck for leadership",           fmt: "PPT" },
              ].map(r => (
                <div key={r.title} className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.desc}</div>
                    <Badge className="bg-muted text-muted-foreground mt-1">{r.fmt}</Badge>
                  </div>
                  <Btn variant="secondary" size="sm"><Download className="w-3.5 h-3.5" />Download</Btn>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MERGED MODULE PAGES
// ─────────────────────────────────────────────────────────────

// Program Management = Program Setup tabs + Content & Training tabs
function ProgramManagementPage() {
  const SECTIONS = [
    { id: "setup",   label: "Program Setup" },
    { id: "content", label: "Content & Training" },
  ] as const;
  type Section = typeof SECTIONS[number]["id"];
  const [section, setSection] = useState<Section>("setup");
  const [setupTab,   setSetupTab]   = useState("program-info");
  const [contentTab, setContentTab] = useState("courses");

  const setupTabs    = [
    { id: "program-info",  label: "Program Info" },
    { id: "rounds-config", label: "Rounds & Roadmap" },
    { id: "rules",         label: "Rules & Criteria" },
    { id: "thresholds",    label: "Pass Conditions" },
    { id: "dim-weights",   label: "3-Criteria Weights" },
    { id: "controls",      label: "Program Controls" },
  ];
  const contentTabs  = [
    { id: "courses",        label: "Courses & Materials" },
    { id: "mbti",           label: "MBTI Questions" },
    { id: "mcq",            label: "Assessment" },
    { id: "ai-sim",         label: "AI Simulation" },
    { id: "assignments",    label: "Assignments & Challenges" },
    { id: "content-matrix", label: "Content by Round" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Section switcher */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={clsx(
              "px-4 py-1.5 rounded-md text-xs font-semibold transition-colors",
              section === s.id
                ? "bg-[#0B3D2E] text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "setup" && (
        <ProgramConfigPage activeTab={setupTab} />
      )}
      {section === "content" && (
        <ContentManagementPage activeTab={contentTab} />
      )}
    </div>
  );
}

// Candidate Management = Participant List + Applications + Teams + Dev Path + Round Status + Gate
function CandidateManagementPage() {
  const tabs = [
    { id: "participant-list", label: "Participant List" },
    { id: "applications",     label: "Review Applications", badge: "12" },
    { id: "teams",            label: "Teams & Mentors" },
    { id: "dev-path",         label: "Development Path" },
    { id: "status-update",    label: "Round Status" },
    { id: "sub-gate",         label: "Submission Gate" },
  ];
  const [tab, setTab] = useState("participant-list");
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TabBar tabs={tabs} active={tab} onSwitch={setTab} />
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === "participant-list" && <ParticipantPage />}
        {tab !== "participant-list" && (
          <ParticipantsManagementPage activeTab={tab} hideTabBar />
        )}
      </div>
    </div>
  );
}

// Submission Review = Submissions + Grade + Scores & Scorecard — all in one page
function SubmissionReviewPage() {
  const SECTIONS = [
    { id: "submissions", label: "Submissions" },
    { id: "grading",     label: "Grading" },
    { id: "scores",      label: "Scores & Scorecard" },
  ] as const;
  type Section = typeof SECTIONS[number]["id"];
  const [section, setSection] = useState<Section>("submissions");
  const [subTab,   setSubTab]   = useState("sub-list");
  const [scoreTab, setScoreTab] = useState("score-cfg");

  const subTabs = [
    { id: "sub-list",      label: "Submission List" },
    { id: "rubrics",       label: "Scoring Rubric" },
    { id: "feedback-pg",   label: "Feedback" },
    { id: "retry-pg",      label: "Retry Request" },
    { id: "approve-score", label: "Approve & Finalize" },
  ];
  const scoreTabs = [
    { id: "score-cfg",      label: "Bonus / Deduction Rules" },
    { id: "score-approval", label: "Score Adjustments" },
    { id: "score-adjust",   label: "Manual Adjustment" },
    { id: "score-history",  label: "Change History" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Section switcher */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={clsx(
              "px-4 py-1.5 rounded-md text-xs font-semibold transition-colors",
              section === s.id
                ? "bg-[#0B3D2E] text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "submissions" && (
        <SubmissionsManagementPage activeTab={subTab} />
      )}
      {section === "grading" && <ScoringPage />}
      {section === "scores" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar tabs={[...scoreTabs, { id: "scorecard-master", label: "Master Scorecard" }]} active={scoreTab} onSwitch={setScoreTab} />
          <div className="flex-1 overflow-hidden flex flex-col">
            {scoreTab === "scorecard-master"
              ? <ScorecardPage />
              : <ScoreManagementPage activeTab={scoreTab} hideTabBar />
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MOBILE BOTTOM NAV
// ─────────────────────────────────────────────────────────────
function BottomNav({ current, onChange }: { current: Page; onChange: (p: Page) => void }) {
  // Show 5 key modules — the most-used ones
  const items = NAV_MODULES.slice(0, 5);
  return (
    <nav
      className="lg:hidden flex items-stretch shrink-0 bg-card"
      style={{ borderTop: "1px solid var(--border)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map(mod => {
        const Icon = mod.icon;
        const isActive = current === mod.id;
        return (
          <button
            key={mod.id}
            onClick={() => onChange(mod.id)}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors text-center",
              isActive ? "text-[#0B3D2E]" : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <Icon className={clsx("w-5 h-5", isActive && "text-[#0B3D2E]")} />
              {mod.badge && (
                <span className="absolute -top-1 -right-1.5 text-[9px] font-mono px-1 py-px rounded-full bg-[#FF6B00] text-white leading-none">
                  {mod.badge}
                </span>
              )}
            </div>
            <span className={clsx("text-[10px] font-medium leading-tight max-w-[56px] truncate", isActive && "font-semibold")}>
              {mod.label.split(" ")[0]}
            </span>
            {isActive && <span className="w-1 h-1 rounded-full bg-[#FF6B00]" />}
          </button>
        );
      })}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTabLabel, setActiveTabLabel] = useState<string>("");

  const navigate = (p: Page) => {
    setPage(p);
    setActiveTabLabel("");
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar
        current={page}
        onChange={navigate}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          page={page}
          activeTabLabel={activeTabLabel || undefined}
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className="flex-1 overflow-hidden flex flex-col">
          {page === "dashboard"            && <OverviewPage navigate={p => navigate(p as Page)} />}
          {page === "program-management"   && <ProgramManagementPage />}
          {page === "candidate-management" && <CandidateManagementPage />}
          {page === "submission-review"    && <SubmissionReviewPage />}
          {page === "interview-management" && <InterviewManagementPage />}
          {page === "office-matching"      && <MatchingManagementPage />}
        </main>

        {/* Mobile bottom navigation */}
        <BottomNav current={page} onChange={navigate} />
      </div>
    </div>
  );
}
