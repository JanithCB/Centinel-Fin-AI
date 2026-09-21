import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-paper border-b-[3px] border-ink">
      <div className="h-20 w-full px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-container border-[3px] border-ink flex items-center justify-center shadow-[4px_4px_0_#151515]">
              <span className="material-symbols-outlined text-ink text-[20px]">shield</span>
            </div>
            <span className="font-headline-sm text-headline-sm uppercase tracking-tight text-ink">
              CENTINEL FIN AI <span className="text-on-surface-variant font-body-sm text-body-sm">// PARENTGUARD</span>
            </span>
          </Link>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 bg-mint border-[2px] border-ink text-ink font-label-sm text-label-sm uppercase tracking-widest shadow-[2px_2px_0_#151515]">
            PHASE 1 FOUNDATION
          </span>
        </div>
        <nav className="flex items-center gap-4 lg:gap-6">
          <Link
            href="/"
            className="font-label-md text-label-md uppercase tracking-wider px-3 py-2 transition-colors bg-primary-container text-ink border-[2px] border-ink shadow-[4px_4px_0_#151515]"
          >
            Platform
          </Link>
          <Link
            href="/auth/sign-in"
            className="font-label-md text-label-md uppercase tracking-wider px-3 py-2 text-on-surface-variant hover:text-ink transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/sign-up"
            className="font-label-md text-label-md uppercase tracking-wider px-4 py-2 bg-primary-container border-[3px] border-ink text-ink shadow-[4px_4px_0_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#151515] active:translate-x-1 active:translate-y-1 active:shadow-[0_0_0_#151515] transition-all"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}
