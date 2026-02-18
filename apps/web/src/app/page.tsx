import Link from "next/link";
import {
  BarChart3,
  Bot,
  Camera,
  Calculator,
  Calendar,
  MessageSquare,
  ShieldAlert,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Automated Pricing",
    desc: "Dynamic rates powered by your in-house GTO Pricing Tool, so you can replace PriceLabs workflows.",
  },
  {
    icon: Bot,
    title: "Guest Communication AI",
    desc: "Handles around 90% of guest messages and escalates the rest with full conversation context.",
  },
  {
    icon: Calendar,
    title: "Listing Optimization",
    desc: "AI suggestions to improve listing performance using market comps and booking trends.",
  },
  {
    icon: ShieldAlert,
    title: "Issue Resolution",
    desc: "Detects complaints in real time and helps coordinate vendors until the issue is resolved.",
  },
  {
    icon: Camera,
    title: "Marketing Photo Suggestions",
    desc: "Identifies weak visuals and recommends photo updates based on top performers in your market.",
  },
  {
    icon: Calculator,
    title: "Amenity ROI Calculator",
    desc: "See expected payback before spending, like hot tub ROI estimates in nights and revenue lift.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Host<span className="text-indigo-600">IQ</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/30"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 lg:px-12 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-indigo-100/60 via-violet-50/40 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-blue-100/40 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-6 border border-indigo-100">
            <Zap className="h-3 w-3" />
            Built by FullHouse Labs
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
            Your
            <span className="mx-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
              Digital PM
            </span>
            for modern hosting
            <br />
            with AI on autopilot
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            The Digital PM packages the exact systems Luxury Lodging uses across
            150+ units into one SaaS. Built for independent hosts (1-20
            properties) and small property managers tired of stitching tools
            together.
          </p>
          <p className="mt-3 text-sm text-gray-600 font-medium">
            7-day free trial. No credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              Start 7-Day Free Trial
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-gray-700 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-3xl mx-auto mt-20 grid grid-cols-3 gap-4">
          {[
            { value: "150+", label: "Units Battle-Tested" },
            { value: "90%", label: "Guest Messages Automated" },
            { value: "$199", label: "Flat Monthly Plan" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center py-5 px-4 rounded-xl bg-white border border-gray-100 shadow-soft"
            >
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 lg:px-12 bg-gray-50/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Stop patching together 5 different tools
            </h2>
            <p className="mt-3 text-gray-500 max-w-lg mx-auto">
              One digital property manager that handles pricing, guest ops,
              listing updates, and issue workflows end to end.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-xl bg-white border border-gray-100 shadow-soft transition-all hover:shadow-card hover:border-indigo-100 hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 mb-4 group-hover:bg-indigo-100 transition-colors">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 lg:px-12 border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Simple pricing that scales with you
          </h2>
          <p className="mt-4 text-gray-500">
            Start free for 7 days, then choose what fits your business.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-left shadow-soft">
              <p className="text-sm text-gray-500">Flat Plan</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">$199</p>
              <p className="text-sm text-gray-500">per month</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-6 text-left shadow-soft">
              <p className="text-sm text-indigo-700">Performance Plan</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">5%</p>
              <p className="text-sm text-gray-500">of monthly revenue</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            No credit card required to start your trial.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 lg:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Ready for a supercharged digital PM?
          </h2>
          <p className="mt-4 text-gray-500">
            Automate pricing without PriceLabs, keep guest replies moving, and
            get AI guidance for listings, photos, amenities, and issue
            resolution in one place.
          </p>
          <Link
            href="/register"
            className="inline-flex mt-8 px-8 py-3.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
          >
            Claim Your Free 7 Days
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 lg:px-12 border-t border-gray-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-gray-400">
          <p>HostIQ {new Date().getFullYear()}</p>
          <div className="flex gap-6">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
