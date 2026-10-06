"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        // Log locally, but show neutral messaging to prevent user enumeration attacks (AC-73)
        console.warn("Password reset attempt error:", error.message);
      }

      // AC-73: Use neutral recovery messaging that does not reveal whether account exists
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
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

        <div className="bg-surface rounded-xl p-8 border-[3px] border-ink shadow-[6px_6px_0px_#151515] flex flex-col gap-6">
          <div className="flex flex-col gap-2 border-b-[2px] border-ink pb-4">
            <span className="bg-tertiary-container text-on-tertiary-container border-[2px] border-ink px-2 py-0.5 rounded text-label-sm font-label-sm tracking-widest uppercase self-start">
              ACCOUNT RECOVERY
            </span>
            <h1 className="font-headline-lg text-headline-lg text-ink uppercase tracking-tight mt-1">
              Reset Password
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Enter your email address to receive password reset instructions.
            </p>
          </div>

          {submitted ? (
            <div className="flex flex-col gap-4 text-center py-4">
              <div className="w-12 h-12 bg-mint rounded-full border-[2px] border-ink flex items-center justify-center mx-auto shadow-[2px_2px_0px_#151515]">
                <span className="material-symbols-outlined text-2xl text-ink">mark_email_read</span>
              </div>
              <p className="font-body-sm text-ink bg-surface-container p-4 rounded border-2 border-ink">
                If an account exists with this email address, password reset instructions have been sent. Please check your inbox.
              </p>
              <Link
                href="/auth/sign-in"
                className="w-full py-2.5 px-4 bg-primary text-on-primary-fixed font-label-md font-bold uppercase tracking-wider rounded border-[2px] border-ink shadow-[2px_2px_0px_#151515]"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {errorMessage && (
                <div className="p-3 bg-danger/10 border-2 border-danger rounded text-danger font-body-sm flex items-start gap-2">
                  <span className="material-symbols-outlined text-danger text-lg shrink-0">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5 text-left">
                <label htmlFor="email" className="font-label-sm text-label-sm uppercase tracking-wider text-ink font-bold">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-surface border-2 border-ink rounded font-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_#151515]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full mt-2 py-3 px-4 bg-primary text-on-primary-fixed font-label-md font-bold uppercase tracking-wider rounded border-[2px] border-ink shadow-[3px_3px_0px_#151515] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#151515] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send Reset Instructions"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
