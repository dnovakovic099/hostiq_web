import Link from "next/link";
import {
  BarChart3,
  Bot,
  Calendar,
  ShieldAlert,
  Zap,
  ArrowRight,
  Check,
  ChevronDown,
  Star,
  TrendingUp,
  Users,
  Sparkles,
  Shield,
  Activity,
  MessageSquare,
} from "lucide-react";
import { MarketingNav } from "./_marketing/nav";
import { MarketingFooter } from "./_marketing/footer";

const features = [
  {
    icon: Bot,
    color: "from-violet-500 to-purple-600",
    title: "AI Guest Communication",
    desc: "Handles 90%+ of guest messages automatically. Smart escalation with full context when human touch is needed.",
    bullets: ["Auto-reply to common inquiries", "Sentiment detection", "Complaint escalation"],
  },
  {
    icon: BarChart3,
    color: "from-indigo-500 to-blue-600",
    title: "Dynamic Pricing Engine",
    desc: "Proprietary GTO pricing algorithm trained on 150+ real units. Replace PriceLabs with something smarter.",
    bullets: ["Market comp analysis", "Seasonal rate optimization", "Last-minute discounting"],
  },
  {
    icon: Calendar,
    color: "from-cyan-500 to-teal-600",
    title: "Listing Optimization",
    desc: "AI-driven suggestions to rank higher, convert better, and capture more bookings from your existing traffic.",
    bullets: ["Photo quality scoring", "Title & description AI", "Amenity ROI calculator"],
  },
  {
    icon: ShieldAlert,
    color: "from-rose-500 to-pink-600",
    title: "Issue Resolution Hub",
    desc: "Real-time complaint detection from guest messages and reviews. Coordinate vendors directly in the platform.",
    bullets: ["Auto-detect complaints", "Vendor workflow routing", "Resolution tracking"],
  },
  {
    icon: TrendingUp,
    color: "from-emerald-500 to-green-600",
    title: "Revenue Intelligence",
    desc: "Deep financial dashboards per property. Track RevPAR, occupancy, and channel performance over time.",
    bullets: ["Per-property P&L", "Channel comparison", "Monthly trend reports"],
  },
  {
    icon: Users,
    color: "from-amber-500 to-orange-600",
    title: "Team Management",
    desc: "Role-based access for cleaners, co-hosts, and ops staff. Everyone sees exactly what they need.",
    bullets: ["Cleaner task boards", "Co-host permissions", "Audit logs"],
  },
];

const steps = [
  {
    num: "01",
    title: "Connect your PMS",
    desc: "Link Hostify in minutes. We sync all your reservations, calendars, listings, and messages automatically.",
    icon: Zap,
  },
  {
    num: "02",
    title: "Set your automation rules",
    desc: "Tell HostIQ your preferences — pricing targets, review thresholds, escalation criteria — once.",
    icon: Shield,
  },
  {
    num: "03",
    title: "Watch it run on autopilot",
    desc: "Guest messages answered, rates updated nightly, issues flagged before they become reviews.",
    icon: Activity,
  },
];

const testimonials = [
  {
    quote: "Went from spending 4 hours a day on guest messages to less than 20 minutes. The AI handles everything I used to do manually.",
    name: "Marcus T.",
    role: "8 properties · Scottsdale, AZ",
    rating: 5,
  },
  {
    quote: "Finally replaced PriceLabs and our nightly rates actually improved. The GTO algorithm understands our market better.",
    name: "Sofia R.",
    role: "12 properties · Nashville, TN",
    rating: 5,
  },
  {
    quote: "The issue detection feature alone paid for itself in the first month. Caught a hot tub complaint before it became a 1-star review.",
    name: "David K.",
    role: "5 properties · Denver, CO",
    rating: 5,
  },
];

const faqs = [
  {
    q: "What PMS systems do you integrate with?",
    a: "We currently support Hostify with deep API integration including reservations, messages, calendars, and listings. More PMS integrations are on the roadmap.",
  },
  {
    q: "How does the AI messaging work?",
    a: "HostIQ monitors all incoming guest messages and auto-responds to common inquiries (check-in info, house rules, amenities). For anything requiring human judgment, it escalates with full conversation context.",
  },
  {
    q: "Can I switch pricing plans later?",
    a: "Yes, you can switch between the Flat Plan ($199/mo) and Performance Plan (5% of revenue) at any time. No lock-in.",
  },
  {
    q: "How long does setup take?",
    a: "Most hosts are fully set up in under an hour. Connect your Hostify account, set your preferences, and HostIQ starts syncing immediately.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — 7 days free, no credit card required. You'll get full access to all features during the trial.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#06060f] text-white overflow-hidden">
      <MarketingNav />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-28 px-6 lg:px-10">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-radial from-indigo-900/50 via-violet-950/25 to-transparent blur-3xl" />
          <div className="absolute top-20 left-1/4 w-72 h-72 rounded-full bg-indigo-600/15 blur-[80px]" />
          <div className="absolute top-40 right-1/4 w-60 h-60 rounded-full bg-violet-600/15 blur-[80px]" />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(rgb(255 255 255 / 1) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 1) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.07] border border-white/[0.14] text-xs font-medium text-white/80 mb-8">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgb(52_211_153)]" />
            Built by hosts, for hosts · Backed by 150+ real units of data
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            Your properties.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
              On autopilot.
            </span>
          </h1>

          {/* ↑ Improved opacity from /50 to /75 */}
          <p className="mt-7 text-lg sm:text-xl text-white/75 max-w-2xl mx-auto leading-relaxed">
            HostIQ is the AI-powered operations platform for independent STR hosts and small PMs.
            Automate guest comms, pricing, and issue resolution — without stitching together 5 tools.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 hover:-translate-y-0.5 active:translate-y-0"
            >
              Start Free 7-Day Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/features"
              className="flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white/80 rounded-xl border border-white/[0.15] hover:border-white/30 hover:text-white hover:bg-white/[0.05] transition-all"
            >
              See all features
            </Link>
          </div>

          <p className="mt-5 text-xs text-white/50">
            No credit card required · Cancel anytime · 7-day free trial
          </p>

          {/* Stats row — improved label contrast from /40 to /65 */}
          <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.07] rounded-2xl overflow-hidden border border-white/[0.08]">
            {[
              { value: "150+", label: "Units battle-tested" },
              { value: "90%", label: "Messages automated" },
              { value: "2.4×", label: "Avg revenue lift" },
              { value: "<1hr", label: "Setup time" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/[0.03] py-7 px-5 text-center">
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="mt-1.5 text-xs text-white/65">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ────────────────────────────────── */}
      <section className="relative px-6 lg:px-10 pb-24">
        <div className="max-w-6xl mx-auto">
          {/* Outer glow */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-64 bg-indigo-600/10 blur-3xl pointer-events-none" />
          <div className="relative rounded-2xl border border-white/[0.10] bg-[#0c0c1a] overflow-hidden shadow-[0_0_100px_rgb(99_102_241/0.15),0_0_0_1px_rgba(255,255,255,0.04)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.07] bg-white/[0.02]">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              <div className="ml-3 flex-1 max-w-xs mx-auto h-5 rounded-md bg-white/[0.06] flex items-center justify-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                <span className="text-[10px] text-white/50 font-medium">app.hostiq.io/dashboard</span>
              </div>
            </div>

            {/* Mock dashboard */}
            <div className="p-6 grid grid-cols-12 gap-4 min-h-[360px]">
              {/* Sidebar mock — improved from /20 to /50 */}
              <div className="col-span-2 space-y-0.5">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-white/35 px-2 py-2">Menu</p>
                {["Dashboard", "Reservations", "Messages", "Pricing", "Revenue", "Issues"].map((item, i) => (
                  <div
                    key={item}
                    className={`h-7 rounded-lg flex items-center px-2 text-[10px] font-medium ${
                      i === 0
                        ? "bg-indigo-500/25 text-indigo-300"
                        : "text-white/50 hover:text-white/70"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Main content mock */}
              <div className="col-span-10 space-y-3">
                {/* KPI row — improved label from /30 to /55 */}
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { label: "Monthly Revenue", value: "$28,450", change: "+12%", up: true },
                    { label: "Occupancy Rate", value: "87%", change: "+4%", up: true },
                    { label: "Avg Nightly Rate", value: "$342", change: "-3%", up: false },
                    { label: "Open Issues", value: "2", change: "−1", up: true },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-lg bg-white/[0.05] border border-white/[0.08] p-3">
                      <p className="text-[9px] text-white/55 uppercase tracking-wider font-medium">{kpi.label}</p>
                      <p className="mt-1 text-lg font-bold text-white">{kpi.value}</p>
                      <div className={`mt-1 inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${kpi.up ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                        {kpi.up ? "↑" : "↓"} {kpi.change}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart mock with label */}
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold text-white/60">Revenue — last 12 months</p>
                    <span className="text-[10px] text-emerald-400 font-medium">↑ 18% YoY</span>
                  </div>
                  <div className="h-24 flex items-end gap-1.5">
                    {[45, 62, 55, 80, 71, 90, 68, 85, 92, 78, 95, 88].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${h}%`,
                          background: `rgba(99, 102, 241, ${0.25 + (h / 100) * 0.55})`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Activity feed mock — improved text from /60→/75 and times from /25→/50 */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { icon: "💬", text: "AI replied to Sarah M. re: check-in time", time: "2m ago", dot: "bg-violet-400" },
                    { icon: "💰", text: "Pricing updated · $412 → $398 (Sat)", time: "8m ago", dot: "bg-indigo-400" },
                    { icon: "⚠️", text: "Issue flagged · Unit 4B hot tub", time: "14m ago", dot: "bg-rose-400" },
                    { icon: "⭐", text: "5-star review received · Desert Villa", time: "1h ago", dot: "bg-amber-400" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] px-3 py-2.5">
                      <div className="flex-shrink-0 text-sm">{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/75 truncate font-medium">{item.text}</p>
                        <p className="text-[10px] text-white/50 mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-28 px-6 lg:px-10 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">
              How It Works
            </p>
            <h2 className="text-4xl font-bold tracking-tight">
              Up and running in under an hour
            </h2>
            {/* ↑ Improved from /40 to /65 */}
            <p className="mt-4 text-white/65 max-w-lg mx-auto">
              No complex onboarding. No 6-week implementation. Connect, configure, go.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step, i) => (
              <div key={step.num} className="relative group">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(100%-1rem)] w-full h-px bg-gradient-to-r from-white/15 to-transparent z-0" />
                )}
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.10] group-hover:border-indigo-500/40 transition-colors">
                      <step.icon className="h-6 w-6 text-indigo-400" />
                    </div>
                    {/* ↑ Step number improved from /0.07 to /0.15 */}
                    <span className="text-5xl font-black text-white/[0.15]">{step.num}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
                  {/* ↑ Improved from /40 to /65 */}
                  <p className="text-sm text-white/65 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────── */}
      <section className="py-28 px-6 lg:px-10 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">
              Features
            </p>
            <h2 className="text-4xl font-bold tracking-tight">
              Stop patching together 5 tools
            </h2>
            {/* ↑ Improved from /40 to /65 */}
            <p className="mt-4 text-white/65 max-w-lg mx-auto">
              Every piece of your operations stack — in one platform, working together.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.05] transition-all duration-300"
              >
                <div
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} mb-5 shadow-lg`}
                >
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                {/* ↑ Improved from /40 to /65 */}
                <p className="text-sm text-white/65 leading-relaxed mb-4">{f.desc}</p>
                <ul className="space-y-2">
                  {f.bullets.map((b) => (
                    /* ↑ Improved from /35 to /60 */
                    <li key={b} className="flex items-center gap-2 text-xs text-white/60">
                      <Check className="h-3 w-3 text-indigo-400 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/features"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              See full feature breakdown
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────── */}
      <section className="py-28 px-6 lg:px-10 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">
              What hosts are saying
            </p>
            <h2 className="text-4xl font-bold tracking-tight">
              Real results from real hosts
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-7 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] transition-all"
              >
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                {/* ↑ Improved from /70 to /80 */}
                <blockquote className="text-sm text-white/80 leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shrink-0">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    {/* ↑ Improved from /35 to /55 */}
                    <p className="text-xs text-white/55 mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TEASER ───────────────────────────────────── */}
      <section className="py-28 px-6 lg:px-10 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">
              Pricing
            </p>
            <h2 className="text-4xl font-bold tracking-tight">
              Simple. No surprises.
            </h2>
            {/* ↑ Improved from /40 to /65 */}
            <p className="mt-4 text-white/65">
              Start free for 7 days, then pick the plan that fits your portfolio.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Flat Plan */}
            <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-8">
              {/* ↑ Improved from /40 to /60 */}
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-4">
                Flat Plan
              </p>
              <div className="flex items-end gap-1.5 mb-2">
                <span className="text-5xl font-black text-white">$199</span>
                {/* ↑ Improved from /40 to /60 */}
                <span className="text-white/60 pb-1.5 text-sm">/month</span>
              </div>
              {/* ↑ Improved from /50 to /70 */}
              <p className="text-sm text-white/70 mb-7">
                Best for predictable budgets. One flat fee covers all properties.
              </p>
              {[
                "Up to 20 properties",
                "All AI features included",
                "Hostify sync",
                "Email & SMS alerts",
                "Team access",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 py-2.5 border-b border-white/[0.07]">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0" />
                  {/* ↑ Improved from /60 to /75 */}
                  <span className="text-sm text-white/75">{item}</span>
                </div>
              ))}
              <Link
                href="/register"
                className="mt-8 block text-center py-3.5 rounded-xl border border-white/[0.18] text-sm font-semibold text-white hover:bg-white/[0.07] hover:border-white/30 transition-all"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Performance Plan */}
            <div className="relative rounded-2xl border border-indigo-500/50 bg-gradient-to-b from-indigo-950/80 to-violet-950/60 p-8 overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
              <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                    Performance Plan
                  </p>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-500/25 text-indigo-200 border border-indigo-400/40">
                    Most Popular
                  </span>
                </div>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="text-5xl font-black text-white">5%</span>
                  {/* ↑ Improved from /40 to /60 */}
                  <span className="text-white/60 pb-1.5 text-sm">of revenue</span>
                </div>
                {/* ↑ Improved from /50 to /70 */}
                <p className="text-sm text-white/70 mb-7">
                  Best for growth-focused hosts. Pay as your revenue scales.
                </p>
                {[
                  "Unlimited properties",
                  "All AI features included",
                  "Priority Hostify sync",
                  "Dedicated onboarding",
                  "Revenue share — we win when you win",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 py-2.5 border-b border-white/[0.08]">
                    <Check className="h-4 w-4 text-indigo-300 shrink-0" />
                    {/* ↑ Improved from /60 to /75 */}
                    <span className="text-sm text-white/75">{item}</span>
                  </div>
                ))}
                <Link
                  href="/register"
                  className="mt-8 block text-center py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-sm font-semibold text-white transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>

          {/* ↑ Improved from /25 to /50 */}
          <p className="mt-6 text-center text-sm text-white/50">
            Both plans include a 7-day free trial. No credit card required.{" "}
            <Link href="/plans" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
              Full plan comparison →
            </Link>
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-28 px-6 lg:px-10 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">
              FAQ
            </p>
            <h2 className="text-4xl font-bold tracking-tight">
              Common questions
            </h2>
          </div>

          <div className="space-y-2">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-white/[0.09] bg-white/[0.03] overflow-hidden hover:border-white/[0.14] transition-colors"
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none">
                  {/* ↑ Improved from /80 to full white when open */}
                  <span className="text-sm font-medium text-white/85 group-open:text-white transition-colors">
                    {faq.q}
                  </span>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.15] text-white/50 transition-all group-open:rotate-180 group-open:border-indigo-500/40 group-open:text-indigo-400">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </summary>
                <div className="px-6 pb-5 pt-0">
                  {/* ↑ Improved from /45 to /70 */}
                  <p className="text-sm text-white/70 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="py-28 px-6 lg:px-10 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Gradient border via padding trick */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 opacity-80" />
            <div className="relative m-px rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-[#0f0c2e] via-[#120c30] to-[#140a2a] px-8 py-16 sm:py-20 text-center overflow-hidden">
              {/* Decorative orbs inside CTA */}
              <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/[0.18] text-xs font-medium text-white/80 mb-6">
                  <Sparkles className="h-3 w-3 text-indigo-300" />
                  Start your free trial today
                </div>
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5 text-white">
                  Run your portfolio on autopilot
                </h2>
                {/* ↑ Improved from /50 to /75 */}
                <p className="text-lg text-white/75 max-w-lg mx-auto mb-10 leading-relaxed">
                  Join hosts who have eliminated 90% of manual work. Set up in under an hour.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/register"
                    className="group flex items-center gap-2 px-8 py-4 text-sm font-semibold text-indigo-800 bg-white rounded-xl hover:bg-white/95 transition-all shadow-2xl hover:shadow-white/10"
                  >
                    Claim Your Free 7 Days
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-4 text-sm font-semibold text-white/85 rounded-xl border border-white/[0.20] hover:border-white/40 hover:text-white transition-all"
                  >
                    Sign in
                  </Link>
                </div>
                {/* ↑ Improved from /25 to /50 */}
                <p className="mt-6 text-xs text-white/50">
                  No credit card required · Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
