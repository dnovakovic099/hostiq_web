import Link from "next/link";
import {
  Check,
  X,
  Zap,
  ArrowRight,
  Star,
  Shield,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { MarketingNav } from "../_marketing/nav";
import { MarketingFooter } from "../_marketing/footer";

const comparisonRows = [
  { category: "Properties", feature: "Max properties", flat: "Up to 20", perf: "Unlimited" },
  { category: "Core", feature: "Reservations sync", flat: true, perf: true },
  { category: "Core", feature: "Calendar management", flat: true, perf: true },
  { category: "Core", feature: "Hostify integration", flat: true, perf: true },
  { category: "AI", feature: "AI guest messaging", flat: true, perf: true },
  { category: "AI", feature: "Sentiment detection", flat: true, perf: true },
  { category: "AI", feature: "Complaint auto-detection", flat: true, perf: true },
  { category: "AI", feature: "Listing optimization AI", flat: true, perf: true },
  { category: "AI", feature: "Photo quality scoring", flat: true, perf: true },
  { category: "Pricing", feature: "Dynamic pricing engine", flat: true, perf: true },
  { category: "Pricing", feature: "Nightly rate updates", flat: true, perf: true },
  { category: "Pricing", feature: "Amenity ROI calculator", flat: true, perf: true },
  { category: "Revenue", feature: "Revenue dashboards", flat: true, perf: true },
  { category: "Revenue", feature: "Per-property P&L", flat: true, perf: true },
  { category: "Revenue", feature: "Channel performance reports", flat: true, perf: true },
  { category: "Issues", feature: "Issue resolution hub", flat: true, perf: true },
  { category: "Issues", feature: "HostBuddy webhook", flat: true, perf: true },
  { category: "Issues", feature: "Vendor workflow routing", flat: true, perf: true },
  { category: "Team", feature: "Team & role management", flat: true, perf: true },
  { category: "Team", feature: "Cleaner task boards", flat: true, perf: true },
  { category: "Notifications", feature: "Email & SMS alerts", flat: true, perf: true },
  { category: "Support", feature: "Email support", flat: true, perf: true },
  { category: "Support", feature: "Priority onboarding", flat: false, perf: true },
  { category: "Support", feature: "Dedicated success manager", flat: false, perf: true },
];

const groupedRows = comparisonRows.reduce<Record<string, typeof comparisonRows>>((acc, row) => {
  if (!acc[row.category]) acc[row.category] = [];
  acc[row.category].push(row);
  return acc;
}, {});

const faqs = [
  {
    q: "What counts as 'revenue' for the Performance Plan?",
    a: "We track gross booking revenue synced from Hostify — the total amount guests pay before cleaning fees and platform commissions. We apply the 5% to the net revenue collected each month.",
  },
  {
    q: "Can I switch plans mid-month?",
    a: "Yes. You can switch between Flat and Performance plans at any time. Changes take effect at the start of the next billing cycle.",
  },
  {
    q: "What happens after my 7-day trial?",
    a: "You choose a plan and enter billing info. If you do nothing, your account enters read-only mode — your data stays safe and no charges are made.",
  },
  {
    q: "Do you charge per property?",
    a: "No. The Flat Plan covers up to 20 properties for one flat fee. The Performance Plan is unlimited properties at 5% of total portfolio revenue.",
  },
  {
    q: "Is there an annual option?",
    a: "Annual billing with 2 months free is on our roadmap. Reach out to discuss an early arrangement if you need it.",
  },
  {
    q: "What if Hostify has API issues?",
    a: "HostIQ has built-in resilience: we cache your last-known data, retry failed syncs automatically, and surface integration health alerts on your dashboard so you always know if something is off.",
  },
];

const testimonials = [
  {
    quote: "The Performance Plan feels like a true partnership. When I earn more, they earn more. That alignment matters.",
    name: "Jessica W.",
    role: "18 properties · Austin, TX",
    plan: "Performance Plan",
  },
  {
    quote: "Flat Plan is a no-brainer at $199. We were paying $150 just for PriceLabs alone.",
    name: "Ryan C.",
    role: "7 properties · Palm Springs, CA",
    plan: "Flat Plan",
  },
];

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-[#06060f] text-white">
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-36 pb-20 px-6 lg:px-10 text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-radial from-indigo-900/25 to-transparent blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-xs font-medium text-white/60 mb-8">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            Simple, transparent pricing
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Two plans.{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
              Zero surprises.
            </span>
          </h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
            Start with a 7-day free trial. No credit card. Full access. 
            Then choose how you want to pay.
          </p>
        </div>
      </section>

      {/* Plan cards */}
      <section className="px-6 lg:px-10 pb-10">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-5">
          {/* Flat Plan */}
          <div className="rounded-2xl border border-white/[0.10] bg-white/[0.02] p-8 flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.08]">
                  <Shield className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Flat Plan</p>
                  <p className="text-xs text-white/60">Predictable costs</p>
                </div>
              </div>
              <div className="flex items-end gap-1.5 mb-3">
                <span className="text-6xl font-black text-white">$199</span>
                <span className="text-white/65 pb-2">/mo</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                One flat fee. Up to 20 properties. Everything included. Best if you want cost certainty.
              </p>
            </div>

            <div className="space-y-1 mb-8">
              {[
                "Up to 20 properties",
                "All 6 core modules",
                "AI guest messaging",
                "Dynamic pricing engine",
                "Revenue dashboards",
                "Team management",
                "Email & SMS alerts",
                "Email support",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 py-2 border-b border-white/[0.05]">
                  <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="text-sm text-white/55">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto">
              <Link
                href="/register"
                className="block text-center py-3.5 rounded-xl border border-white/15 text-sm font-semibold text-white hover:bg-white/[0.06] hover:border-white/25 transition-all"
              >
                Start 7-Day Free Trial
              </Link>
              <p className="mt-3 text-center text-xs text-white/72">No credit card required</p>
            </div>
          </div>

          {/* Performance Plan */}
          <div className="relative rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-indigo-950/70 to-violet-950/50 p-8 flex flex-col overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
            <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

            <div className="relative mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">Performance Plan</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Most Popular
                    </span>
                  </div>
                  <p className="text-xs text-white/60">Aligned incentives</p>
                </div>
              </div>
              <div className="flex items-end gap-1.5 mb-3">
                <span className="text-6xl font-black text-white">5%</span>
                <span className="text-white/65 pb-2">of revenue</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                Pay proportionally to what you earn. Scale to unlimited properties with no ceiling.
              </p>
            </div>

            <div className="relative space-y-1 mb-8">
              {[
                "Unlimited properties",
                "All 6 core modules",
                "AI guest messaging",
                "Dynamic pricing engine",
                "Revenue dashboards",
                "Team management",
                "Email & SMS alerts",
                "Priority onboarding",
                "Dedicated success manager",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 py-2 border-b border-white/[0.06]">
                  <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="text-sm text-white/60">{item}</span>
                </div>
              ))}
            </div>

            <div className="relative mt-auto">
              <Link
                href="/register"
                className="block text-center py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-sm font-semibold text-white transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
              >
                Start 7-Day Free Trial
              </Link>
              <p className="mt-3 text-center text-xs text-white/72">No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* Full comparison table */}
      <section className="py-20 px-6 lg:px-10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Full comparison</h2>

          <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-3 bg-white/[0.03] border-b border-white/[0.08]">
              <div className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-white/55">
                Feature
              </div>
              <div className="px-6 py-4 text-center text-xs font-semibold text-white/72">
                Flat Plan<br />
                <span className="text-lg font-black text-white normal-case tracking-normal">$199</span>
                <span className="text-white/55 text-xs">/mo</span>
              </div>
              <div className="px-6 py-4 text-center text-xs font-semibold text-indigo-400">
                Performance Plan<br />
                <span className="text-lg font-black text-white normal-case tracking-normal">5%</span>
                <span className="text-white/55 text-xs"> revenue</span>
              </div>
            </div>

            {Object.entries(groupedRows).map(([category, rows]) => (
              <div key={category}>
                <div className="px-6 py-2.5 bg-white/[0.015] border-t border-white/[0.06]">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/72">
                    {category}
                  </p>
                </div>
                {rows.map((row, i) => (
                  <div
                    key={row.feature}
                    className={`grid grid-cols-3 border-t border-white/[0.05] hover:bg-white/[0.015] transition-colors`}
                  >
                    <div className="px-6 py-3.5 text-sm text-white/55">{row.feature}</div>
                    <div className="px-6 py-3.5 flex items-center justify-center">
                      {typeof row.flat === "boolean" ? (
                        row.flat ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <X className="h-4 w-4 text-white/15" />
                        )
                      ) : (
                        <span className="text-sm text-white/60">{row.flat}</span>
                      )}
                    </div>
                    <div className="px-6 py-3.5 flex items-center justify-center">
                      {typeof row.perf === "boolean" ? (
                        row.perf ? (
                          <Check className="h-4 w-4 text-indigo-400" />
                        ) : (
                          <X className="h-4 w-4 text-white/15" />
                        )
                      ) : (
                        <span className="text-sm text-indigo-300 font-medium">{row.perf}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 lg:px-10 border-t border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">What hosts say about pricing</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-7 rounded-2xl bg-white/[0.03] border border-white/[0.07]"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="text-sm text-white/65 leading-relaxed mb-5">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/60 mt-0.5">{t.role}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                    {t.plan}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 lg:px-10 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Pricing FAQs</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none">
                  <span className="text-sm font-medium text-white/75 group-open:text-white transition-colors">
                    {faq.q}
                  </span>
                  <div className="h-5 w-5 shrink-0 rounded-full border border-white/15 flex items-center justify-center transition-transform group-open:rotate-45">
                    <span className="text-white/65 text-sm leading-none">+</span>
                  </div>
                </summary>
                <div className="px-6 pb-5">
                  <p className="text-sm text-white/65 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 lg:px-10 border-t border-white/[0.05]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Try HostIQ free for 7 days</h2>
          <p className="text-white/65 mb-8">
            Full access. No credit card. Switch or cancel anytime.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white/60 rounded-xl border border-white/10 hover:border-white/20 hover:text-white transition-all"
            >
              Already have an account?
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
