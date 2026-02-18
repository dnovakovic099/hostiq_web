import Link from "next/link";
import { Zap } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/plans" },
    { label: "Dashboard", href: "/login" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
  Support: [
    { label: "Help Center", href: "#" },
    { label: "Contact Us", href: "#" },
    { label: "Status", href: "#" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="bg-[#06060f] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Host<span className="text-indigo-400">IQ</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-white/55 leading-relaxed max-w-[180px]">
              The AI-powered property manager for modern hosts.
            </p>
            <p className="mt-6 text-xs text-white/40">
              © {new Date().getFullYear()} HostIQ. All rights reserved.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/45 mb-4">
                {group}
              </p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/65 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
