"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showError, setShowError] = useState(true);

  return (
    <div className="flex flex-col w-full items-center p-6 mt-10">
      <div className="w-full max-w-md flex flex-col space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-label-md text-label-md uppercase tracking-wider text-ink hover:text-primary transition-colors group"
          >
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container rounded border-2 border-ink shadow-[2px_2px_0px_#151515]">
            <span className="w-2 h-2 rounded-full bg-mint animate-pulse"></span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-ink">
              System Online
            </span>
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="bg-surface rounded-lg border-[3px] border-ink shadow-[6px_6px_0px_#151515] p-6 md:p-8 flex flex-col relative overflow-hidden">
          {/* Decorative Neo-Brutalist Top Corner Stripe */}
          <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
            <div className="w-24 h-6 bg-sun rotate-45 transform translate-x-4 -translate-y-1 border-b-[3px] border-ink"></div>
          </div>

          {/* Header Section */}
          <div className="flex flex-col space-y-1 mb-6">
            <div className="inline-flex items-center gap-2 mb-1">
              <span
                className="material-symbols-outlined text-primary text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                shield_person
              </span>
              <span className="font-label-sm text-label-sm tracking-widest uppercase bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded border border-ink">
                ParentGuard ID
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-ink tracking-tight uppercase">
              SIGN IN
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Access your ParentGuard space.
            </p>
          </div>

          {/* Realistic Validation / Error Strip */}
          {showError && (
            <div className="mb-6 p-3 bg-coral border-[3px] border-ink shadow-[4px_4px_0px_#151515] rounded flex items-start gap-3 animate-[fadeIn_0.2s_ease-out]">
              <span
                className="material-symbols-outlined text-ink text-[20px] shrink-0 mt-0.5"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                error
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-label-sm text-label-sm uppercase tracking-wider text-ink font-bold">
                  Authentication Failed
                </p>
                <p className="font-caption text-caption text-ink font-medium leading-snug">
                  We could not sign you in with those details.
                </p>
              </div>
              <button
                aria-label="Dismiss alert"
                className="text-ink hover:opacity-75"
                onClick={() => setShowError(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          {/* Form */}
          <form className="flex flex-col space-y-5" onSubmit={(e) => e.preventDefault()}>
            {/* Email Field */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="font-label-md text-label-md uppercase text-ink flex items-center gap-1.5"
                  htmlFor="auth-email"
                >
                  <span>Email Address</span>
                  <span className="text-danger font-bold">*</span>
                </label>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  Parent or Child
                </span>
              </div>
              <div className="relative">
                <input
                  className="w-full bg-surface text-ink font-body-sm text-body-sm px-3.5 py-2.5 rounded border-[3px] border-ink focus:outline-none focus:shadow-[4px_4px_0px_#151515] transition-shadow placeholder:text-outline"
                  id="auth-email"
                  placeholder="parent@example.com or child@example.com"
                  required
                  type="email"
                  defaultValue="alex.turner@familyguard.internal"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="font-label-md text-label-md uppercase text-ink flex items-center gap-1.5"
                  htmlFor="auth-password"
                >
                  <span>Password</span>
                  <span className="text-danger font-bold">*</span>
                </label>
                <Link
                  className="font-label-sm text-label-sm uppercase tracking-wider text-secondary hover:underline font-bold"
                  href="#"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <input
                  className="w-full bg-surface text-ink font-body-sm text-body-sm px-3.5 py-2.5 rounded border-[3px] border-ink focus:outline-none focus:shadow-[4px_4px_0px_#151515] transition-shadow placeholder:text-outline pr-10"
                  id="auth-password"
                  placeholder="Enter your security passkey"
                  required
                  type={showPassword ? "text" : "password"}
                  defaultValue="12345678"
                />
                <button
                  aria-label="Toggle password visibility"
                  className="absolute right-3 text-on-surface-variant hover:text-ink flex items-center justify-center p-1"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Role Context Radio Bar */}
            <div className="p-2.5 bg-paper rounded border-2 border-ink flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                Default Portal
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    defaultChecked
                    className="accent-[#151515] w-3.5 h-3.5 cursor-pointer"
                    name="account_mode"
                    type="radio"
                    value="parent"
                  />
                  <span className="font-label-sm text-label-sm uppercase px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed border border-ink">
                    Guardian
                  </span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    className="accent-[#151515] w-3.5 h-3.5 cursor-pointer"
                    name="account_mode"
                    type="radio"
                    value="child"
                  />
                  <span className="font-label-sm text-label-sm uppercase px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed border border-ink">
                    Child
                  </span>
                </label>
              </div>
            </div>

            {/* Primary CTA Button */}
            <button
              className="w-full mt-2 bg-primary-container text-ink font-label-md text-label-md tracking-wider uppercase py-3.5 px-4 rounded border-[3px] border-ink shadow-[6px_6px_0px_#151515] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_#151515] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_#151515] transition-all flex items-center justify-center gap-2 font-bold cursor-pointer"
              type="submit"
            >
              <span>[ SIGN IN ]</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </button>
          </form>

          {/* Card Bottom Divider */}
          <div className="h-[2px] bg-ink w-full my-6"></div>

          {/* Account Switcher / Registration prompt */}
          <div className="text-center">
            <p className="font-body-sm text-body-sm text-ink">
              New to ParentGuard?
              <Link
                className="font-label-md text-label-md uppercase tracking-wider text-secondary font-bold underline decoration-2 underline-offset-4 hover:text-primary transition-colors ml-1 inline-block"
                href="/auth/sign-up"
              >
                CREATE AN ACCOUNT
              </Link>
            </p>
          </div>
        </div>

        {/* Security Badge Footer */}
        <div className="p-3 bg-surface-container rounded border-2 border-ink shadow-[4px_4px_0px_#151515] flex items-center justify-center gap-2">
          <span
            className="material-symbols-outlined text-primary text-[18px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            lock
          </span>
          <span className="font-mono font-label-sm text-label-sm tracking-wider text-ink text-center uppercase">
            POWERED BY SUPABASE AUTHENTICATION • 256-BIT ENCRYPTION
          </span>
        </div>
      </div>
    </div>
  );
}
