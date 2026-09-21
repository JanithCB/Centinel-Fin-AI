import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* Interactive Protocol Simulation / Ticker */}
      <div className="w-full bg-sun border-b-[3px] border-ink px-6 lg:px-12 py-2 flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-ink animate-ping"></span>
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-ink">
            PROTOCOL STATUS: NON-CUSTODIAL GOVERNANCE ONLINE
          </span>
        </div>
        <div className="flex items-center gap-6 font-label-sm text-label-sm uppercase text-ink">
          <span className="hidden sm:inline">ZERO CARD EXPOSURE</span>
          <span>•</span>
          <span className="hidden sm:inline">MULTI-SIG PARENT APPROVAL</span>
          <span>•</span>
          <span className="font-bold">SPEC: V1.0.4 FOUNDATION</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="w-full px-6 lg:px-12 py-12 lg:py-20 border-b-[3px] border-ink bg-paper">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy & Dual Actions */}
          <div className="lg:col-span-7 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border-[2px] border-ink shadow-[3px_3px_0_#151515] mb-6">
              <span className="material-symbols-outlined text-primary text-[16px]">verified_user</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-ink">ARCHITECTURE DISCIPLINE: STRICT SAFETY</span>
            </div>
            <h1 className="font-display-lg text-display-lg uppercase tracking-tight text-ink max-w-2xl text-balance">
              FAMILY SPENDING, MADE CLEAR.
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-6 mb-8 max-w-xl leading-relaxed">
              ParentGuard helps families set clear purchase permissions. No hidden decisions. No payment processing in this app.
            </p>
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-container border-[3px] border-ink text-ink font-label-md text-label-md uppercase tracking-wider shadow-[6px_6px_0_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#151515] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0_#151515] transition-all"
              >
                <span>[ GET STARTED ]</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-surface border-[3px] border-ink text-ink font-label-md text-label-md uppercase tracking-wider shadow-[4px_4px_0_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#151515] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_#151515] transition-all"
              >
                <span>[ I ALREADY HAVE AN ACCOUNT ]</span>
              </Link>
            </div>
            {/* Live Trust Indicators */}
            <div className="grid grid-cols-3 gap-4 mt-12 pt-8 border-t-[2px] border-ink w-full max-w-xl">
              <div>
                <div className="font-headline-sm text-headline-sm text-ink">0.0%</div>
                <div className="font-caption text-caption text-on-surface-variant uppercase mt-0.5">Payment Intermediation</div>
              </div>
              <div>
                <div className="font-headline-sm text-headline-sm text-ink">100%</div>
                <div className="font-caption text-caption text-on-surface-variant uppercase mt-0.5">Audit Trail Visibility</div>
              </div>
              <div>
                <div className="font-headline-sm text-headline-sm text-ink">PARENT</div>
                <div className="font-caption text-caption text-on-surface-variant uppercase mt-0.5">Sovereign Authority</div>
              </div>
            </div>
          </div>
          {/* Right Column: Abstract Geometric Blocks Composition */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="relative w-full max-w-[420px] aspect-square bg-muted/50 border-[3px] border-ink shadow-[8px_8px_0_#151515] p-6 flex items-center justify-center overflow-hidden">
              {/* Graph Paper Grid Texture */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundSize: "24px 24px",
                  backgroundImage: "linear-gradient(to right, #151515 1px, transparent 1px), linear-gradient(to bottom, #151515 1px, transparent 1px)",
                }}
              ></div>
              {/* Abstract Neo-Brutalist Block 1: Violet Square */}
              <div className="absolute top-8 left-8 w-44 h-44 bg-violet border-[3px] border-ink shadow-[6px_6px_0_#151515] flex flex-col justify-between p-3 rotate-[-4deg] transition-transform hover:rotate-0 duration-200">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-ink font-bold">BLOCK_01</span>
                  <span className="w-3 h-3 bg-ink"></span>
                </div>
                <div className="font-headline-sm text-headline-sm uppercase text-ink leading-none">
                  PARENT<br />PORTAL
                </div>
              </div>
              {/* Abstract Neo-Brutalist Block 2: Lime Rectangle */}
              <div className="absolute bottom-10 right-6 w-52 h-28 bg-lime border-[3px] border-ink shadow-[6px_6px_0_#151515] flex flex-col justify-between p-3 rotate-[3deg] z-10 transition-transform hover:rotate-0 duration-200">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-ink font-bold">STATE: VERIFIED</span>
                  <span className="material-symbols-outlined text-ink text-[18px]">lock_open</span>
                </div>
                <div className="flex items-baseline justify-between border-t-[2px] border-ink pt-2">
                  <span className="font-label-md text-label-md text-ink">PURCHASE REQ: #892</span>
                  <span className="font-label-sm text-label-sm bg-ink text-primary-container px-1 py-0.5">APPROVED</span>
                </div>
              </div>
              {/* Abstract Neo-Brutalist Block 3: Sky Blue Pill */}
              <div className="absolute top-20 right-10 w-32 h-32 rounded-full bg-sky border-[3px] border-ink shadow-[6px_6px_0_#151515] flex items-center justify-center text-center p-2 z-0 rotate-12 transition-transform hover:rotate-0 duration-200">
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-ink text-[28px]">shield</span>
                  <span className="font-label-sm text-label-sm uppercase font-bold text-ink tracking-tight mt-1">ZERO RISK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Thick Bordered Information Strip */}
      <div className="w-full bg-ink text-paper py-5 px-6 lg:px-12 border-b-[3px] border-ink">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-primary-container text-ink font-label-sm text-label-sm uppercase font-bold">CORE DIRECTIVE</span>
            <p className="font-headline-sm text-headline-sm uppercase tracking-tight text-paper">
              PHASE 1: SECURE SIGN-IN AND FAMILY SETUP.
            </p>
          </div>
          <p className="font-body-sm text-body-sm text-muted max-w-md">
            Clear family controls. No hidden decisions. Every action is visible.
          </p>
        </div>
      </div>
    </div>
  );
}
