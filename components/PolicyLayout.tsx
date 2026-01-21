import type { ReactNode } from "react";

type PolicyLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function PolicyLayout({ title, description, children }: PolicyLayoutProps) {
  return (
    <main className="min-h-screen bg-brand-bg text-brand-text">
      <article className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6 sm:pt-12 lg:max-w-4xl lg:px-0">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-text sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-brand-muted sm:text-[15px]">
            {description}
          </p>
        </header>
        <div className="space-y-8 text-sm leading-relaxed text-brand-muted sm:text-[15px]">
          {children}
        </div>
      </article>
    </main>
  );
}
