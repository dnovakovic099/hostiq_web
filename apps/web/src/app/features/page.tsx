import Link from "next/link";
import {
  Bot,
  BarChart3,
  Calendar,
  ShieldAlert,
  TrendingUp,
  Users,
  MessageSquare,
  Star,
  Zap,
  ArrowRight,
  Check,
  Clock,
  DollarSign,
  Activity,
  Bell,
  Settings,
  RefreshCw,
  Lock,
  ChevronRight,
} from "lucide-react";
import { MarketingNav } from "../_marketing/nav";
import { MarketingFooter } from "../_marketing/footer";

const modules = [
  {
    id: "ai-comms",
    icon: Bot,
    gradient: "from-violet-500 to-purple-600",
    label: "AI Guest Communication",
    headline: "Let AI handle your inbox — automatically.",
    description:
      "HostIQ monitors every incoming guest message and responds instantly to common inquiries. Check-in instructions, house rules, amenity questions, local recommendations — the AI handles it all with your tone and preferences. Only truly complex or escalation-worthy issues ever reach you.",
    bullets: [
      { icon: Zap, text: "Instant auto-replies to common questions" },
      { icon: Bell, text: "Smart escalation with full conversation context" },
      { icon: Activity, text: "Sentiment analysis to detect frustrated guests early" },
      { icon: MessageSquare, text: "Multi-channel: Airbnb, VRBO, Direct, Booking.com" },
      { icon: Settings, text: "Customize tone, response templates, and escalation rules" },
    ],
    stat: { value: "90%", label: "of messages handled without human input" },
  },
  {
    id: "pricing",
    icon: BarChart3,
    gradient: "from-indigo-500 to-blue-600",
    label: "Dynamic Pricing Engine",
    headline: "Proprietary pricing trained on 150+ real units.",
    description:
      "Stop paying $150/mo for PriceLabs or guessing manually. HostIQ's GTO Pricing Tool was built in-house from real operational data across 150+ short-term rentals. It accounts for seasonality, local events, comp set performance, last-minute demand, and your own booking velocity — updating rates every night.",
    bullets: [
      { icon: TrendingUp, text: "Market comp analysis and competitive positioning" },
      { icon: Calendar, text: "Seasonal and event-based rate automation" },
      { icon: Clock, text: "Last-minute discount thresholds you control" },
      { icon: DollarSign, text: "Minimum nightly rates by property and season" },
      { icon: RefreshCw, text: "Nightly sync to Hostify calendar" },
    ],
    stat: { value: "2.4×", label: "average revenue lift vs manual pricing" },
  },
  {
    id: "listing",
    icon: Calendar,
    gradient: "from-cyan-500 to-teal-600",
    label: "Listing Optimization",
    headline: "Rank higher. Convert better. Earn more.",
    description:
      "Your listing is your storefront. HostIQ audits your photos, title, description, and amenity set against top performers in your market — then gives you a concrete action plan. The Amenity ROI Calculator even estimates the payback period before you spend a dollar.",
    bullets: [
      { icon: Star, text: "Photo quality scoring and upgrade recommendations" },
      { icon: MessageSquare, text: "AI-powered title and description suggestions" },
      { icon: DollarSign, text: "Amenity ROI calculator (e.g., hot tub payback in nights)" },
      { icon: TrendingUp, text: "Competitor benchmarking and gap analysis" },
      { icon: Check, text: "Listing health score with priority action items" },
    ],
    stat: { value: "+23%", label: "avg conversion rate improvement" },
  },
  {
    id: "issues",
    icon: ShieldAlert,
    gradient: "from-rose-500 to-pink-600",
    label: "Issue Resolution Hub",
    headline: "Catch problems before they become 1-star reviews.",
    description:
      "HostBuddy's webhook delivers guest-reported issues directly into HostIQ's Issue Hub. The AI also proactively detects complaints buried in message threads and flags them automatically. Assign vendors, track resolution status, and close the loop — all without leaving the platform.",
    bullets: [
      { icon: Bell, text: "Real-time complaint detection from guest messages" },
      { icon: Activity, text: "HostBuddy webhook integration for guest-reported issues" },
      { icon: Users, text: "Vendor assignment and follow-up workflows" },
      { icon: Clock, text: "Resolution time tracking and SLA alerts" },
      { icon: Lock, text: "Full audit trail for every issue" },
    ],
    stat: { value: "85%", label: "of issues resolved before review is left" },
  },
  {
    id: "revenue",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-green-600",
    label: "Revenue Intelligence",
    headline: "Know exactly what every property earns and why.",
    description:
      "Deep financial dashboards that go beyond Hostify's basic reporting. Track RevPAR, occupancy, ADR, and channel performance per property — over any time range. Spot underperformers, identify your best months, and make data-driven portfolio decisions.",
    bullets: [
      { icon: DollarSign, text: "Per-property P&L with all fee breakdowns" },
      { icon: BarChart3, text: "RevPAR, ADR, and occupancy trend charts" },
      { icon: TrendingUp, text: "Channel performance comparison (Airbnb vs VRBO vs Direct)" },
      { icon: Calendar, text: "Monthly and YoY comparisons" },
      { icon: Activity, text: "Anomaly detection on revenue dips" },
    ],
    stat: { value: "100%", label: "financial visibility per property" },
  },
  {
    id: "team",
    icon: Users,
    gradient: "from-amber-500 to-orange-600",
    label: "Team & Access Management",
    headline: "Give your team exactly what they need.",
    description:
      "HostIQ supports multiple roles — Owner, Co-Host, Cleaner, and Internal Ops. Each role sees only the data relevant to their job. Cleaners get their task boards. Co-hosts get reservation access. Ops staff get full visibility. Invite with one click, revoke instantly.",
    bullets: [
      { icon: Lock, text: "Role-based access control (Owner / Co-Host / Cleaner / Ops)" },
      { icon: Users, text: "Cleaner task boards with checkout/turnover assignments" },
      { icon: Bell, text: "Automated notifications per role" },
      { icon: Activity, text: "Full audit logs for every action" },
      { icon: Settings, text: "Custom permissions per property" },
    ],
    stat: { value: "4", label: "roles built to match real hosting operations" },
  },
];

const integrations = [
  { name: "Hostify", desc: "Full PMS sync — reservations, messages, calendars, listings", status: "Live" },
  { name: "HostBuddy AI", desc: "Guest issue webhooks for real-time problem intake", status: "Live" },
  { name: "OpenPhone", desc: "SMS notifications for escalations and issue alerts", status: "Live" },
  { name: "Resend", desc: "Transactional email for team notifications", status: "Live" },
  { name: "OpenAI GPT-4", desc: "Powering all AI messaging, sentiment, and suggestions", status: "Live" },
  { name: "Airbnb", desc: "Direct API integration for reviews and messaging", status: "Roadmap" },
  { name: "VRBO", desc: "Direct channel connection", status: "Roadmap" },
  { name: "Stripe", desc: "Subscription billing and payment management", status: "Roadmap" },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#06060f] text-white">
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-6 lg:px-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-radial from-indigo-900/30 to-transparent blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-xs font-medium text-white/60 mb-8">
            <Zap className="h-3 w-3 text-indigo-400" />
            Full Platform Breakdown
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Everything your portfolio needs,{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
              in one place.
            </span>
          </h1>
          <p className="text-lg text-white/45 max-w-2xl mx-auto leading-relaxed">
            Six deeply integrated modules — all talking to each other, all connected to your PMS data, 
            all working while you sleep.
          </p>
        </div>
      </section>

      {/* Modules — alternating layout */}
      <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-20 space-y-6">
        {modules.map((mod, index) => (
          <div
            key={mod.id}
            id={mod.id}
            className={`group rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/[0.12] transition-all duration-300 overflow-hidden`}
          >
            <div className={`grid md:grid-cols-2 gap-0 ${index % 2 === 1 ? "md:[&>*:first-child]:order-last" : ""}`}>
              {/* Text */}
              <div className="p-8 lg:p-10">
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${mod.gradient} mb-5 shadow-lg`}>
                  <mod.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
                  {mod.label}
                </p>
                <h2 className="text-2xl font-bold text-white mb-4 leading-snug">
                  {mod.headline}
                </h2>
                <p className="text-sm text-white/45 leading-relaxed mb-7">
                  {mod.description}
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Try it free
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Visual / bullets */}
              <div className="border-t md:border-t-0 md:border-l border-white/[0.06] p-8 lg:p-10 flex flex-col justify-between">
                <ul className="space-y-4">
                  {mod.bullets.map((b) => (
                    <li key={b.text} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                        <b.icon className="h-3.5 w-3.5 text-indigo-400" />
                      </div>
                      <span className="text-sm text-white/55">{b.text}</span>
                    </li>
                  ))}
                </ul>
                {/* Stat */}
                <div className="mt-8 pt-7 border-t border-white/[0.06]">
                  <p className="text-4xl font-black text-white">{mod.stat.value}</p>
                  <p className="text-sm text-white/35 mt-1">{mod.stat.label}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Integrations */}
      <section className="py-28 px-6 lg:px-10 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">
              Integrations
            </p>
            <h2 className="text-4xl font-bold tracking-tight">
              Connects to your stack
            </h2>
            <p className="mt-4 text-white/40 max-w-md mx-auto">
              Deep integrations with the tools you already use, plus more coming soon.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {integrations.map((int) => (
              <div
                key={int.name}
                className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">{int.name}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      int.status === "Live"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                        : "bg-white/[0.06] text-white/30 border border-white/[0.08]"
                    }`}
                  >
                    {int.status}
                  </span>
                </div>
                <p className="text-xs text-white/35 leading-relaxed">{int.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 lg:px-10 border-t border-white/[0.05]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-5">Ready to try every feature free?</h2>
          <p className="text-white/40 mb-8">
            7-day free trial. No credit card. Full access to every module.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
