"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ApiClient,
  UserProfile,
  PurchaseRequestDTO,
  PublicKeyResponseDTO,
} from "@/lib/api-client";
import CryptographicProofModal from "@/components/CryptographicProofModal";
import PurchaseRequestCard from "@/components/PurchaseRequestCard";
import { formatCurrencyAmount } from "@/lib/format-utils";

export default function ApprovalsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Requests state
  const [requests, setRequests] = useState<PurchaseRequestDTO[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "DENIED" | "ALL">("PENDING");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Action status
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Cryptographic Proof Modal state
  const [selectedProofRequest, setSelectedProofRequest] = useState<PurchaseRequestDTO | null>(null);
  const [publicKeyData, setPublicKeyData] = useState<PublicKeyResponseDTO | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setAuthError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/sign-in?redirect=/dashboard/approvals");
        return;
      }

      // Check if email confirmed
      const user = session.user;
      const isConfirmed = Boolean(user.email_confirmed_at || (user as any).confirmed_at);
      if (!isConfirmed) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(user.email || "")}`);
        return;
      }

      const userProfile = await ApiClient.getCurrentUser();
      setProfile(userProfile);
    } catch (err: any) {
      setAuthError(err?.message || "Failed to load session or user profile.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    setActionError(null);
    try {
      const reqs = await ApiClient.getFamilyPurchaseRequests();
      setRequests(reqs);
    } catch (err: any) {
      setActionError(err?.message || "Failed to load family purchase requests.");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const loadPublicKey = useCallback(async () => {
    try {
      const keyInfo = await ApiClient.getPublicKey();
      setPublicKeyData(keyInfo);
    } catch (err) {
      console.warn("Could not fetch RSA public key:", err);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    loadPublicKey();
  }, [fetchProfile, loadPublicKey]);

  useEffect(() => {
    if (profile && profile.role === "PARENT" && profile.familyId) {
      loadRequests();
    }
  }, [profile, loadRequests]);

  const handleApprove = async (requestId: number) => {
    setActionLoadingId(requestId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await ApiClient.approvePurchaseRequest(requestId);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, ...updated, status: "APPROVED" } : r))
      );
      setActionSuccess(
        `Request #${requestId} approved! Purchase is now unlocked for your child.`
      );
    } catch (err: any) {
      setActionError(err?.message || `Failed to approve request #${requestId}.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeny = async (requestId: number) => {
    setActionLoadingId(requestId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await ApiClient.denyPurchaseRequest(requestId);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, ...updated, status: "DENIED" } : r))
      );
      setActionSuccess(`Request #${requestId} was denied.`);
    } catch (err: any) {
      setActionError(err?.message || `Failed to deny request #${requestId}.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter and search logic (newest first within filter)
  const filteredRequests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return requests
      .filter((r) => {
        const matchesFilter = filter === "ALL" ? true : r.status === filter;
        const matchesSearch =
          !q ||
          r.itemName.toLowerCase().includes(q) ||
          r.siteDomain.toLowerCase().includes(q) ||
          (r.childName && r.childName.toLowerCase().includes(q)) ||
          (r.category && r.category.toLowerCase().includes(q)) ||
          (r.note && r.note.toLowerCase().includes(q));

        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [requests, filter, searchQuery]);

  // Counts & financial totals
  const counts = useMemo(() => {
    const pendingReqs = requests.filter((r) => r.status === "PENDING");
    const approvedReqs = requests.filter((r) => r.status === "APPROVED");
    const deniedReqs = requests.filter((r) => r.status === "DENIED");

    const pendingTotal = pendingReqs.reduce(
      (sum, r) => sum + (Number.isFinite(Number(r.amount)) ? Number(r.amount) : 0),
      0
    );
    const approvedTotal = approvedReqs.reduce(
      (sum, r) => sum + (Number.isFinite(Number(r.amount)) ? Number(r.amount) : 0),
      0
    );
    const primaryCurrency = (
      pendingReqs[0]?.currency ||
      requests[0]?.currency ||
      "USD"
    ).toUpperCase();

    return {
      pending: pendingReqs.length,
      approved: approvedReqs.length,
      denied: deniedReqs.length,
      total: requests.length,
      pendingTotal,
      approvedTotal,
      primaryCurrency,
    };
  }, [requests]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-ink border-t-primary rounded-full animate-spin"></div>
        <p className="font-mono text-xs uppercase tracking-wider text-outline">
          Loading Approvals Center...
        </p>
      </div>
    );
  }

  // Auth Error or non-parent screen
  if (authError || !profile) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-surface border-[3px] border-ink shadow-[6px_6px_0px_#151515] rounded-xl text-center">
        <span className="material-symbols-outlined text-4xl text-danger mb-2">lock</span>
        <h2 className="font-headline-sm font-bold text-ink uppercase">Authentication Error</h2>
        <p className="font-body-sm text-sm text-outline mt-2">
          {authError || "Please sign in to access approvals."}
        </p>
        <Link
          href="/auth/sign-in"
          className="inline-block mt-4 px-6 py-2.5 bg-primary text-ink font-bold text-xs uppercase tracking-wider rounded border-2 border-ink shadow-[3px_3px_0px_#151515]"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  // Guard: Role must be PARENT
  if (profile.role !== "PARENT") {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-surface border-[3px] border-ink shadow-[6px_6px_0px_#151515] rounded-xl text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-sun border-2 border-ink rounded-full flex items-center justify-center shadow-[2px_2px_0px_#151515]">
          <span className="material-symbols-outlined text-ink text-2xl">verified_user</span>
        </div>
        <h2 className="font-headline-sm font-bold text-ink uppercase">Parent Portal Restricted</h2>
        <p className="font-body-sm text-sm text-outline mt-2">
          You are signed in as a <strong className="text-ink">Child Account</strong> ({profile.email}).
          Only verified parents hold cryptographic supervisory authority to approve or deny browser checkout transactions.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-primary text-ink font-bold text-xs uppercase tracking-wider rounded border-2 border-ink shadow-[3px_3px_0px_#151515] hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            Back to Child Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Guard: Family must exist
  if (!profile.familyId) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-surface border-[3px] border-ink shadow-[6px_6px_0px_#151515] rounded-xl text-center">
        <span className="material-symbols-outlined text-4xl text-sun mb-2">group_add</span>
        <h2 className="font-headline-sm font-bold text-ink uppercase">No Family Configured</h2>
        <p className="font-body-sm text-sm text-outline mt-2">
          You must create a Family group and link your children before you can review purchase requests.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-4 px-6 py-2.5 bg-primary text-ink font-bold text-xs uppercase tracking-wider rounded border-2 border-ink shadow-[3px_3px_0px_#151515]"
        >
          Set Up Family in Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      {/* Top Breadcrumb & Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-ink/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-outline uppercase tracking-wider mb-1">
            <Link href="/dashboard" className="hover:text-ink transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">home</span>
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-ink font-bold">Approvals Queue</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold uppercase tracking-tight text-ink">
              Parent Approvals Center
            </h1>
            <span className="px-2.5 py-0.5 bg-violet border-2 border-ink text-ink font-mono text-[11px] font-bold uppercase rounded shadow-[2px_2px_0px_#151515]">
              PARENT CONTROLS
            </span>
          </div>
          <p className="font-body-sm text-xs sm:text-sm text-outline mt-1">
            Review your family&apos;s purchase requests, inspect product links, and approve or decline items in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={loadRequests}
            disabled={loadingRequests}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-surface text-ink font-bold text-xs uppercase rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:bg-surface-container flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span className={`material-symbols-outlined text-sm ${loadingRequests ? "animate-spin" : ""}`}>
              refresh
            </span>
            <span>{loadingRequests ? "Syncing..." : "Refresh"}</span>
          </button>

          <Link
            href="/dashboard"
            className="flex-1 sm:flex-none px-4 py-2 bg-primary text-ink font-bold text-xs uppercase tracking-wider rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">dashboard</span>
            <span>Family Overview</span>
          </Link>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {actionSuccess && (
        <div className="p-3 bg-mint/40 border-[2px] border-ink rounded-lg text-ink font-bold text-xs flex items-center justify-between shadow-[2px_2px_0px_#151515]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-ink text-base">check_circle</span>
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            aria-label="Dismiss success notice"
            className="text-ink hover:opacity-75 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-danger/10 border-[2px] border-danger rounded-lg text-danger font-bold text-xs flex items-center justify-between shadow-[2px_2px_0px_#151515]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-danger text-base">error</span>
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error notice"
            className="text-danger hover:opacity-75 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Card */}
        <div
          onClick={() => setFilter("PENDING")}
          className={`p-4 bg-surface rounded-xl border-[3px] border-ink shadow-[4px_4px_0px_#151515] cursor-pointer transition-all hover:-translate-y-0.5 ${
            filter === "PENDING" ? "ring-2 ring-sun bg-sun/10" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[11px] font-bold uppercase text-outline">
              Pending Review
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-sun animate-pulse"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display-lg text-2xl sm:text-3xl font-bold text-ink">
              {counts.pending}
            </span>
            <span className="text-[11px] font-mono text-outline">
              {formatCurrencyAmount(counts.pendingTotal, counts.primaryCurrency)}{" "}
              {counts.primaryCurrency} pending
            </span>
          </div>
        </div>

        {/* Approved Card */}
        <div
          onClick={() => setFilter("APPROVED")}
          className={`p-4 bg-surface rounded-xl border-[3px] border-ink shadow-[4px_4px_0px_#151515] cursor-pointer transition-all hover:-translate-y-0.5 ${
            filter === "APPROVED" ? "ring-2 ring-mint bg-mint/10" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[11px] font-bold uppercase text-outline">
              Approved
            </span>
            <span className="material-symbols-outlined text-sm text-ink">verified</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display-lg text-2xl sm:text-3xl font-bold text-ink">
              {counts.approved}
            </span>
            <span className="text-[11px] font-mono text-outline">
              {formatCurrencyAmount(counts.approvedTotal, counts.primaryCurrency)}{" "}
              {counts.primaryCurrency} authorized
            </span>
          </div>
        </div>

        {/* Denied Card */}
        <div
          onClick={() => setFilter("DENIED")}
          className={`p-4 bg-surface rounded-xl border-[3px] border-ink shadow-[4px_4px_0px_#151515] cursor-pointer transition-all hover:-translate-y-0.5 ${
            filter === "DENIED" ? "ring-2 ring-coral bg-coral/10" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[11px] font-bold uppercase text-outline">
              Denied
            </span>
            <span className="material-symbols-outlined text-sm text-coral">block</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display-lg text-2xl sm:text-3xl font-bold text-ink">
              {counts.denied}
            </span>
            <span className="text-[11px] font-mono text-outline">blocked</span>
          </div>
        </div>

        {/* Total Card */}
        <div
          onClick={() => setFilter("ALL")}
          className={`p-4 bg-surface rounded-xl border-[3px] border-ink shadow-[4px_4px_0px_#151515] cursor-pointer transition-all hover:-translate-y-0.5 ${
            filter === "ALL" ? "ring-2 ring-ink bg-surface-container" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[11px] font-bold uppercase text-outline">
              All Requests
            </span>
            <span className="material-symbols-outlined text-sm text-outline">receipt_long</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display-lg text-2xl sm:text-3xl font-bold text-ink">
              {counts.total}
            </span>
            <span className="text-[11px] font-mono text-outline">total history</span>
          </div>
        </div>
      </div>

      {/* Main Filter & Search Control Bar */}
      <div className="p-4 bg-surface rounded-xl border-[3px] border-ink shadow-[4px_4px_0px_#151515] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setFilter("PENDING")}
            className={`px-3 py-1.5 rounded-lg border-2 border-ink text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filter === "PENDING"
                ? "bg-sun text-ink shadow-[2px_2px_0px_#151515]"
                : "bg-surface hover:bg-surface-container text-outline"
            }`}
          >
            <span>Pending Review</span>
            <span className="px-1.5 py-0.2 bg-ink text-paper rounded-full text-[10px] font-mono font-bold">
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("APPROVED")}
            className={`px-3 py-1.5 rounded-lg border-2 border-ink text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filter === "APPROVED"
                ? "bg-mint text-ink shadow-[2px_2px_0px_#151515]"
                : "bg-surface hover:bg-surface-container text-outline"
            }`}
          >
            <span>Approved</span>
            <span className="px-1.5 py-0.2 bg-ink text-paper rounded-full text-[10px] font-mono font-bold">
              {counts.approved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("DENIED")}
            className={`px-3 py-1.5 rounded-lg border-2 border-ink text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filter === "DENIED"
                ? "bg-coral text-ink shadow-[2px_2px_0px_#151515]"
                : "bg-surface hover:bg-surface-container text-outline"
            }`}
          >
            <span>Denied</span>
            <span className="px-1.5 py-0.2 bg-ink text-paper rounded-full text-[10px] font-mono font-bold">
              {counts.denied}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg border-2 border-ink text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filter === "ALL"
                ? "bg-primary text-ink shadow-[2px_2px_0px_#151515]"
                : "bg-surface hover:bg-surface-container text-outline"
            }`}
          >
            <span>All</span>
            <span className="px-1.5 py-0.2 bg-ink text-paper rounded-full text-[10px] font-mono font-bold">
              {counts.total}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search domain, item, child..."
            className="w-full pl-9 pr-8 py-1.5 bg-paper border-2 border-ink rounded-lg font-body-sm text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search query"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-ink cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Requests Feed */}
      {loadingRequests ? (
        <div className="p-12 bg-surface rounded-xl border-[3px] border-ink shadow-[4px_4px_0px_#151515] flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-ink border-t-primary rounded-full animate-spin"></div>
          <p className="font-mono text-xs uppercase text-outline">Fetching purchase requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 bg-surface rounded-xl border-[3px] border-ink shadow-[4px_4px_0px_#151515] text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-surface-container border-2 border-ink flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-2xl text-outline">
              {filter === "PENDING" ? "task_alt" : "inbox"}
            </span>
          </div>
          <h3 className="font-headline-sm font-bold text-ink uppercase text-base sm:text-lg">
            {filter === "PENDING"
              ? "All Caught Up! No Pending Requests"
              : `No ${filter.toLowerCase()} purchase requests found`}
          </h3>
          <p className="font-body-sm text-xs text-outline max-w-md mt-1">
            {filter === "PENDING"
              ? "When a child attempts a checkout on Roblox, Steam, or another web store, it will appear here for cryptographic review."
              : searchQuery
              ? `No requests matching "${searchQuery}". Clear your search query to view all items.`
              : `There are currently no purchase requests with status ${filter}.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredRequests.map((req) => (
            <PurchaseRequestCard
              key={req.id}
              request={req}
              isProcessing={actionLoadingId === req.id}
              onApprove={handleApprove}
              onDeny={handleDeny}
              onInspectProof={setSelectedProofRequest}
            />
          ))}
        </div>
      )}

      {/* Cryptographic Proof Modal */}
      <CryptographicProofModal
        request={selectedProofRequest}
        publicKeyData={publicKeyData}
        onClose={() => setSelectedProofRequest(null)}
      />
    </div>
  );
}
