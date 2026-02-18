import Link from "next/link";
import { Zap } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="bg-[#06060f] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Host<span className="text-indigo-400">IQ</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-white/55 leading-relaxed max-w-[220px]">
              The AI-powered property manager for modern hosts.
            </p>
          </div>

          {/* Product links only */}
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <Link href="/features" className="text-sm text-white/60 hover:text-white transition-colors">Features</Link>
            <Link href="/plans" className="text-sm text-white/60 hover:text-white transition-colors">Pricing</Link>
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">Sign in</Link>
            <Link href="/register" className="text-sm text-white/60 hover:text-white transition-colors">Get started</Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.06]">
          <p className="text-xs text-white/35">
            © {new Date().getFullYear()} HostIQ. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
