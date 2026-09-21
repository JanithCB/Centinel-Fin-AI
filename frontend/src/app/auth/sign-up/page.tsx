"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignUpPage() {
  const [role, setRole] = useState<"PARENT" | "CHILD">("PARENT");

  return (
    <div className="flex flex-col w-full items-center p-6 mt-10">
      <div className="w-full max-w-2xl flex flex-col space-y-6">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-label-md text-label-md uppercase tracking-wider text-ink hover:text-primary transition-transform active:translate-x-1 duration-150"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Back to home</span>
          </Link>
        </div>

        <div className="bg-surface rounded-xl p-6 sm:p-8 border-[3px] border-ink shadow-[6px_6px_0px_#151515] flex flex-col gap-6">
          <div className="flex flex-col gap-2 border-b-[2px] border-ink pb-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="bg-primary-container text-on-primary-fixed border-[2px] border-ink px-2 py-0.5 rounded text-label-sm font-label-sm tracking-widest uppercase">
                SECURE ONBOARDING
              </span>
              <span className="font-caption text-caption text-outline">
                STEP 01 OF 02
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-ink uppercase tracking-tight mt-1">
              Create Account
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Join ParentGuard with verified role-based access.
            </p>
          </div>

          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  className="font-label-md text-label-md text-ink uppercase tracking-wider flex items-center justify-between"
                  htmlFor="email"
                >
                  <span>Email Address</span>
                  <span className="text-danger font-caption text-caption lowercase">
                    *required
                  </span>
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-lowest text-ink font-body-sm text-body-sm rounded-lg border-[2px] border-ink px-4 py-3 outline-none focus:shadow-[4px_4px_0px_#151515] focus:bg-surface transition-all placeholder:text-outline"
                    id="email"
                    placeholder="e.g. alex@familyguard.org"
                    required
                    type="email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-label-md text-label-md text-ink uppercase tracking-wider"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest text-ink font-body-sm text-body-sm rounded-lg border-[2px] border-ink px-4 py-3 outline-none focus:shadow-[4px_4px_0px_#151515] focus:bg-surface transition-all placeholder:text-outline"
                    id="password"
                    minLength={8}
                    placeholder="••••••••••••"
                    required
                    type="password"
                  />
                  <span className="font-caption text-caption text-outline">
                    Minimum 8 characters
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-label-md text-label-md text-ink uppercase tracking-wider"
                    htmlFor="confirm-password"
                  >
                    Confirm Password
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest text-ink font-body-sm text-body-sm rounded-lg border-[2px] border-ink px-4 py-3 outline-none focus:shadow-[4px_4px_0px_#151515] focus:bg-surface transition-all placeholder:text-outline"
                    id="confirm-password"
                    minLength={8}
                    placeholder="••••••••••••"
                    required
                    type="password"
                  />
                  <span
                    className="font-caption text-caption text-outline"
                    id="match-hint"
                  >
                    Re-enter your secret
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="font-label-md text-label-md text-ink uppercase tracking-wider">
                  Who is this account for?
                </h2>
                <span className="font-caption text-caption text-outline uppercase font-semibold">
                  Select 1 Role
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  className={`group relative flex flex-col p-4 rounded-lg border-[3px] border-ink cursor-pointer shadow-[4px_4px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#151515] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_#151515] ${
                    role === "PARENT" ? "bg-primary-container/25" : "bg-surface"
                  }`}
                  onClick={() => setRole("PARENT")}
                >
                  <input
                    className="sr-only"
                    name="role"
                    type="radio"
                    value="PARENT"
                    checked={role === "PARENT"}
                    readOnly
                  />
                  <div className="flex items-start justify-between mb-2">
                    <span className="bg-secondary-container text-on-secondary-fixed border-[2px] border-ink px-2.5 py-0.5 rounded text-label-sm font-label-sm uppercase tracking-wider font-bold">
                      Parent
                    </span>
                    <span
                      className={`material-symbols-outlined text-xl ${
                        role === "PARENT" ? "text-ink" : "text-outline"
                      }`}
                    >
                      {role === "PARENT" ? "check_circle" : "radio_button_unchecked"}
                    </span>
                  </div>
                  <p className="font-headline-sm text-headline-sm text-ink uppercase mb-1">
                    Family Lead
                  </p>
                  <p className="font-caption text-caption text-on-surface-variant leading-relaxed">
                    Create and manage a family space, invite children, and set
                    future purchase boundaries.
                  </p>
                </label>
                <label
                  className={`group relative flex flex-col p-4 rounded-lg border-[3px] border-ink cursor-pointer shadow-[4px_4px_0px_#151515] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#151515] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_#151515] ${
                    role === "CHILD" ? "bg-primary-container/25" : "bg-surface"
                  }`}
                  onClick={() => setRole("CHILD")}
                >
                  <input
                    className="sr-only"
                    name="role"
                    type="radio"
                    value="CHILD"
                    checked={role === "CHILD"}
                    readOnly
                  />
                  <div className="flex items-start justify-between mb-2">
                    <span className="bg-tertiary-container text-on-tertiary-container border-[2px] border-ink px-2.5 py-0.5 rounded text-label-sm font-label-sm uppercase tracking-wider font-bold">
                      Child
                    </span>
                    <span
                      className={`material-symbols-outlined text-xl ${
                        role === "CHILD" ? "text-ink" : "text-outline"
                      }`}
                    >
                      {role === "CHILD" ? "check_circle" : "radio_button_unchecked"}
                    </span>
                  </div>
                  <p className="font-headline-sm text-headline-sm text-ink uppercase mb-1">
                    Collaborator
                  </p>
                  <p className="font-caption text-caption text-on-surface-variant leading-relaxed">
                    Request purchase permissions transparently from your family
                    without surveillance.
                  </p>
                </label>
              </div>
            </div>

            <div className="bg-surface-container rounded-lg border-[2px] border-ink p-3.5 flex items-start gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-xl shrink-0 mt-0.5">
                verified_user
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-ink font-bold">
                  Security Note
                </span>
                <p className="font-caption text-caption text-on-surface-variant leading-normal">
                  The backend enforces verified roles and family relationships.
                  Role permissions are verified on the server via Spring Boot API.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-2">
              <button
                className="w-full bg-primary-container text-ink border-[3px] border-ink shadow-[6px_6px_0px_#151515] font-label-md text-label-md tracking-wider uppercase py-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_#151515] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_#151515] transition-all cursor-pointer"
                type="submit"
              >
                <span>Continue to Setup</span>
                <span className="material-symbols-outlined text-lg font-bold">
                  arrow_forward
                </span>
              </button>

              <div className="text-center">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Already have an account?
                </span>
                <Link
                  className="ml-1.5 font-label-md text-label-md text-ink underline decoration-[2px] underline-offset-4 uppercase hover:text-primary font-bold"
                  href="/auth/sign-in"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
