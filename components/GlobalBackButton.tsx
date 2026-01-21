"use client";

import { usePathname, useRouter } from "next/navigation";

export function GlobalBackButton() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide on landing page and studio page
  if (!pathname || pathname === "/" || pathname.startsWith("/studio")) {
    return null;
  }

  const handleClick = () => {
    router.back();
  };

  return (
    <div className="border-b border-white/5 bg-brand-bg/95/">{/* thin bar below navbar */}
      <div className="mx-auto flex max-w-6xl px-3 py-2 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={handleClick}
          aria-label="Go back to previous page"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-medium text-white/80 shadow-[0_0_18px_rgba(0,0,0,0.7)] backdrop-blur-md transition-colors duration-150 hover:border-white/30 hover:text-white"
        >
          <span className="text-xs">←</span>
          <span>Back</span>
        </button>
      </div>
    </div>
  );
}
