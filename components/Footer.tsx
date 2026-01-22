import { Logo } from "./Logo";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-[#0d0d0d] text-xs text-white/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 gap-x-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: logo + tagline */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs">
          <Logo />
          <span className="hidden h-3 w-px bg-white/15 sm:inline" aria-hidden="true" />
          <span className="text-white/50">Mix &amp; Master with AI</span>
        </div>

        {/* Center: inline policy/support links */}
        <nav
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs"
          aria-label="Site policies and support"
        >
          <a
            href="/terms"
            className="text-white/60 underline-offset-2 hover:text-white focus:outline-none focus-visible:text-white focus-visible:underline"
          >
            Terms
          </a>
          <span className="text-white/25" aria-hidden="true">
            •
          </span>
          <a
            href="/privacy"
            className="text-white/60 underline-offset-2 hover:text-white focus:outline-none focus-visible:text-white focus-visible:underline"
          >
            Privacy
          </a>
          <span className="text-white/25" aria-hidden="true">
            •
          </span>
          <a
            href="/cookies"
            className="text-white/60 underline-offset-2 hover:text-white focus:outline-none focus-visible:text-white focus-visible:underline"
          >
            Cookies
          </a>
          <span className="text-white/25" aria-hidden="true">
            •
          </span>
          <a
            href="/refund"
            className="text-white/60 underline-offset-2 hover:text-white focus:outline-none focus-visible:text-white focus-visible:underline"
          >
            Refund Policy
          </a>
          <span className="text-white/25" aria-hidden="true">
            •
          </span>
          <a
            href="/support"
            className="text-white/60 underline-offset-2 hover:text-white focus:outline-none focus-visible:text-white focus-visible:underline"
          >
            Support
          </a>
        </nav>

        {/* Right: social + copyright */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs">
          <div className="flex items-center gap-x-2">
            <a
              href="https://instagram.com"
              aria-label="MIXSMVRT on Instagram"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-[11px] text-white/70 hover:border-red-500/70 hover:text-white focus:outline-none focus-visible:border-red-500 focus-visible:text-white"
            >
              IG
            </a>
            <a
              href="https://x.com"
              aria-label="MIXSMVRT on X"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-[11px] text-white/70 hover:border-red-500/70 hover:text-white focus:outline-none focus-visible:border-red-500 focus-visible:text-white"
            >
              X
            </a>
          </div>
          <span className="text-white/40">
            © {year} MIXSMVRT
          </span>
        </div>
      </div>
    </footer>
  );
}
