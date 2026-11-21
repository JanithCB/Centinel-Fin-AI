"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (isMounted) {
          setUserEmail(session?.user?.email ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUserEmail(null);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUserEmail(session?.user?.email ?? null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-paper border-b-[3px] border-ink">
      <div className="h-20 w-full px-6 lg:px-12 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-primary-container border-[3px] border-ink flex items-center justify-center shadow-[4px_4px_0_#151515] shrink-0">
              <span className="material-symbols-outlined text-ink text-[20px]">shield</span>
            </div>
            <span className="font-headline-sm text-headline-sm uppercase tracking-tight text-ink truncate">
              CENTINEL FIN AI <span className="text-on-surface-variant font-body-sm text-body-sm">// PARENTGUARD</span>
            </span>
          </Link>
          <span className="hidden xl:inline-flex items-center px-2 py-0.5 bg-mint border-[2px] border-ink text-ink font-label-sm text-label-sm uppercase tracking-widest shadow-[2px_2px_0_#151515] shrink-0">
            PHASE 1 FOUNDATION
          </span>
        </div>
        <nav className="flex items-center gap-2.5 lg:gap-4 shrink-0">
          <Link
            href="/centinel_dev_log_3d.html"
            target="_blank"
            className="hidden sm:flex font-label-md text-label-md uppercase tracking-wider px-3 py-2 bg-mint border-[2px] border-ink text-ink shadow-[3px_3px_0_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#151515] transition-all items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-ink animate-pulse"></span>
            <span>Architecture 3D</span>
          </Link>

          {userEmail ? (
            <>
              <Link
                href="/dashboard"
                className="font-label-md text-label-md uppercase tracking-wider px-3 py-2 bg-surface border-[2px] border-ink text-ink shadow-[3px_3px_0_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#151515] transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">dashboard</span>
                <span>Dashboard</span>
              </Link>
              <Link
                href="/dashboard/approvals"
                className="font-label-md text-label-md uppercase tracking-wider px-3 py-2 bg-sun border-[2px] border-ink text-ink shadow-[3px_3px_0_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#151515] transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">verified_user</span>
                <span>Approvals</span>
              </Link>
              <Link
                href="/dashboard"
                title={userEmail}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-surface-container border-[2px] border-ink text-ink font-mono text-xs font-bold shadow-[2px_2px_0_#151515] hover:bg-primary/30 transition-colors max-w-[200px]"
              >
                <span className="material-symbols-outlined text-sm shrink-0">account_circle</span>
                <span className="truncate">{userEmail}</span>
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
