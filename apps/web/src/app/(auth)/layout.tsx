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
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white p-12 flex-col justify-between overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/[0.04] rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/[0.03] rounded-full translate-y-1/3 -translate-x-1/4" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">HostIQ</span>
          </Link>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Smart property management for the modern host
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Automate your short-term rental operations with AI-powered tools,
            real-time sync, and intelligent automation.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-2xl font-bold">344+</p>
              <p className="text-sm text-white/50 mt-0.5">Properties</p>
            </div>
            <div>
              <p className="text-2xl font-bold">7K+</p>
              <p className="text-sm text-white/50 mt-0.5">Reservations</p>
            </div>
            <div>
              <p className="text-2xl font-bold">80%</p>
              <p className="text-sm text-white/50 mt-0.5">Less Manual Work</p>
            </div>
          </div>
        </div>

        <p className="relative text-sm text-white/30">
          HostIQ {new Date().getFullYear()}
        </p>
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
              <span className="text-lg font-bold tracking-tight">
                Host<span className="text-indigo-600">IQ</span>
              </span>
            </Link>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-card">
            {children}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
