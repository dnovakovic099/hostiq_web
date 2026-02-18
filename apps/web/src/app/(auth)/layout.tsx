import Link from "next/link";
import { Zap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4338ca] via-[#6d28d9] to-[#7c3aed] animate-gradient" />

        {/* Mesh overlay */}
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(at 20% 30%, rgba(255,255,255,0.15) 0px, transparent 50%),
                              radial-gradient(at 80% 20%, rgba(255,255,255,0.1) 0px, transparent 50%),
                              radial-gradient(at 40% 80%, rgba(255,255,255,0.08) 0px, transparent 50%)`
          }}
        />

        {/* Floating orbs */}
        <div className="absolute top-[15%] right-[10%] w-72 h-72 rounded-full bg-white/[0.04] blur-xl" />
        <div className="absolute bottom-[20%] left-[5%] w-56 h-56 rounded-full bg-white/[0.03] blur-xl" />
        <div className="absolute top-[50%] left-[40%] w-32 h-32 rounded-full bg-white/[0.06] blur-2xl" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        <div className="relative flex flex-col justify-between p-12 text-white w-full">
          <div>
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 transition-all group-hover:bg-white/15">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold tracking-tight">HostIQ</span>
            </Link>
          </div>

          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight">
              Smart property management, simplified
            </h1>
            <p className="text-white/60 text-[15px] leading-relaxed">
              Automate your short-term rental operations with AI-powered tools,
              real-time sync, and intelligent automation.
            </p>
            <div className="flex gap-10 pt-4">
              <div>
                <p className="text-2xl font-semibold">344+</p>
                <p className="text-[13px] text-white/40 mt-0.5">Properties</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">7K+</p>
                <p className="text-[13px] text-white/40 mt-0.5">Reservations</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">80%</p>
                <p className="text-[13px] text-white/40 mt-0.5">Less Manual Work</p>
              </div>
            </div>
          </div>

          <p className="text-[13px] text-white/20">
            HostIQ {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight">
                Host<span className="text-indigo-600">IQ</span>
              </span>
            </Link>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card p-8 shadow-[0_4px_24px_-4px_rgb(0_0_0/0.06)]">
            {children}
          </div>

          <p className="text-center text-xs text-muted-foreground/60">
            By continuing, you agree to our Terms and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
