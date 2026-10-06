"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify and try again.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMessage(error.message || "Failed to update password. Please request a new reset link.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full items-center justify-center p-6 mt-10">
      <div className="w-full max-w-md flex flex-col space-y-6">
        <div className="bg-surface rounded-xl p-8 border-[3px] border-ink shadow-[6px_6px_0px_#151515] flex flex-col gap-6">
          <div className="flex flex-col gap-2 border-b-[2px] border-ink pb-4">
            <span className="bg-mint text-ink border-[2px] border-ink px-2 py-0.5 rounded text-label-sm font-label-sm tracking-widest uppercase self-start">
              SECURITY
            </span>
            <h1 className="font-headline-lg text-headline-lg text-ink uppercase tracking-tight mt-1">
              Choose New Password
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Enter your new secure password below.
            </p>
          </div>

          {success ? (
            <div className="flex flex-col gap-3 text-center py-4">
              <div className="w-12 h-12 bg-mint rounded-full border-[2px] border-ink flex items-center justify-center mx-auto shadow-[2px_2px_0px_#151515]">
                <span className="material-symbols-outlined text-2xl text-ink">check_circle</span>
              </div>
              <p className="font-body-sm text-ink font-bold">
                Password updated successfully! Redirecting you to dashboard...
              </p>
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
                <label htmlFor="new-password" className="font-label-sm text-label-sm uppercase tracking-wider text-ink font-bold">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-3.5 py-2.5 bg-surface border-2 border-ink rounded font-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_#151515] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-ink focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label htmlFor="confirm-password" className="font-label-sm text-label-sm uppercase tracking-wider text-ink font-bold">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3.5 py-2.5 bg-surface border-2 border-ink rounded font-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_#151515]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="w-full mt-2 py-3 px-4 bg-primary text-on-primary-fixed font-label-md font-bold uppercase tracking-wider rounded border-[2px] border-ink shadow-[3px_3px_0px_#151515] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#151515] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Saving..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
