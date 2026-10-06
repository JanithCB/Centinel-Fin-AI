"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState<string>(emailParam || "");
  const [cooldown, setCooldown] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  useEffect(() => {
    // If email is not in query params, attempt to get it from current session
    if (!email) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) {
          setEmail(user.email);
        }
      });
    }

    if (errorParam === "invalid_token" || errorParam === "expired") {
      setErrorMessage("The confirmation link is invalid or has expired. Please request a new one below.");
    }
  }, [email, errorParam]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      setErrorMessage("Please enter your email address to resend the confirmation link.");
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (error) {
        setErrorMessage(error.message || "Failed to resend confirmation email. Please try again later.");
      } else {
        setMessage("A fresh confirmation email has been sent. Please check your inbox and spam folder.");
        setCooldown(60); // 60s cooldown to prevent throttling (AC-37, AC-38)
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred while resending the email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col w-full items-center justify-center p-6 mt-10">
      <div className="w-full max-w-md flex flex-col space-y-6">
        <div className="mb-2">
          <Link
            href="/auth/sign-in"
            className="inline-flex items-center gap-2 font-label-md text-label-md uppercase tracking-wider text-ink hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Sign In</span>
          </Link>
        </div>

        <div className="bg-surface rounded-xl p-8 border-[3px] border-ink shadow-[6px_6px_0px_#151515] flex flex-col gap-6 text-center">
          <div className="w-16 h-16 bg-sky rounded-full border-[3px] border-ink flex items-center justify-center mx-auto shadow-[3px_3px_0px_#151515]">
            <span className="material-symbols-outlined text-3xl text-ink">mark_email_unread</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="bg-primary-container text-on-primary-fixed border-[2px] border-ink px-2.5 py-0.5 rounded text-label-sm font-label-sm tracking-widest uppercase self-center">
              EMAIL VERIFICATION REQUIRED
            </span>
            <h1 className="font-headline-lg text-headline-lg text-ink uppercase tracking-tight mt-1">
              Check Your Inbox
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              We have sent a secure confirmation link to:
            </p>
            {email ? (
              <p className="font-headline-sm font-bold text-ink bg-surface-container py-2 px-3 rounded border-2 border-ink break-all">
                {email}
              </p>
            ) : (
              <div className="mt-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-surface border-2 border-ink rounded font-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-danger/10 border-2 border-danger rounded text-danger font-body-sm text-left flex items-start gap-2">
              <span className="material-symbols-outlined text-danger text-lg shrink-0">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {message && (
            <div className="p-3 bg-mint/30 border-2 border-ink rounded text-ink font-body-sm text-left flex items-start gap-2">
              <span className="material-symbols-outlined text-ink text-lg shrink-0">check_circle</span>
              <span>{message}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={isSending || cooldown > 0}
              className="w-full py-3 px-4 bg-primary text-on-primary-fixed font-label-md font-bold uppercase tracking-wider rounded border-[2px] border-ink shadow-[3px_3px_0px_#151515] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#151515] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? "Sending..." : cooldown > 0 ? `Resend Available in ${cooldown}s` : "Resend Confirmation Email"}
            </button>

            <Link
              href="/dashboard"
              className="w-full py-2.5 px-4 bg-surface text-ink font-label-md font-semibold uppercase tracking-wider rounded border-[2px] border-ink hover:bg-surface-container transition-colors"
            >
              I Have Confirmed My Email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
