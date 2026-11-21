"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { ApiClient, UserProfile, PurchaseRequestDTO, PublicKeyResponseDTO } from "@/lib/api-client";

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

  // Cryptographic Proof Drawer state
  const [selectedProofRequest, setSelectedProofRequest] = useState<PurchaseRequestDTO | null>(null);
  const [publicKeyData, setPublicKeyData] = useState<PublicKeyResponseDTO | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      setActionSuccess(`Request #${requestId} approved! Cryptographic RSA-2048 signature generated.`);
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Helper for human-readable relative time
  const formatTime = (isoString?: string) => {
    if (!isoString) return "Just now";
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return isoString;
    }
  };

  // Filter and search logic
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesFilter = filter === "ALL" ? true : r.status === filter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.itemName.toLowerCase().includes(q) ||
        r.siteDomain.toLowerCase().includes(q) ||
        (r.childName && r.childName.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        (r.note && r.note.toLowerCase().includes(q));

      return matchesFilter && matchesSearch;
    });
  }, [requests, filter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const denied = requests.filter((r) => r.status === "DENIED").length;
    return { pending, approved, denied, total: requests.length };
  }, [requests]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-ink border-t-primary rounded-full animate-spin"></div>
        <p className="font-mono text-xs uppercase tracking-wider text-outline">Loading Approvals Center...</p>
      </div>
    );
  }

  // Auth Error or non-parent screen
  if (authError || !profile) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-surface border-[3px] border-ink shadow-[6px_6px_0px_#151515] rounded-xl text-center">
        <span className="material-symbols-outlined text-4xl text-danger mb-2">lock</span>
        <h2 className="font-headline-sm font-bold text-ink uppercase">Authentication Error</h2>
        <p className="font-body-sm text-sm text-outline mt-2">{authError || "Please sign in to access approvals."}</p>
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
          You are signed in as a <strong className="text-ink">Child Account</strong> ({profile.email}). Only verified parents
          hold cryptographic supervisory authority to approve or deny browser checkout transactions.
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
          <div className="flex items-center gap-3">
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold uppercase tracking-tight text-ink">
              Parent Approvals Center
            </h1>
            <span className="px-2.5 py-0.5 bg-violet border-2 border-ink text-ink font-mono text-[11px] font-bold uppercase rounded shadow-[2px_2px_0px_#151515]">
              PG-4 SUPERVISOR
            </span>
          </div>
          <p className="font-body-sm text-xs sm:text-sm text-outline mt-1">
            Real-time human-in-the-loop authorization hub. Approve requests to generate RSA-2048 cryptographic signatures.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={loadRequests}
            disabled={loadingRequests}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-surface text-ink font-bold text-xs uppercase rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:bg-surface-container flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
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
          <button onClick={() => setActionSuccess(null)} className="text-ink hover:opacity-75">
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
          <button onClick={() => setActionError(null)} className="text-danger hover:opacity-75">
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
            <span className="font-label-sm text-[11px] font-bold uppercase text-outline">Pending Review</span>
            <span className="w-2.5 h-2.5 rounded-full bg-sun animate-pulse"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display-lg text-2xl sm:text-3xl font-bold text-ink">{counts.pending}</span>
            <span className="text-[11px] font-mono text-outline">requires action</span>
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
            <span className="font-label-sm text-[11px] font-bold uppercase text-outline">Approved</span>
            <span className="material-symbols-outlined text-sm text-ink">verified</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display-lg text-2xl sm:text-3xl font-bold text-ink">{counts.approved}</span>
            <span className="text-[11px] font-mono text-outline">RSA signed</span>
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
            <span className="font-label-sm text-[11px] font-bold uppercase text-outline">Denied</span>
            <span className="material-symbols-outlined text-sm text-coral">block</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display-lg text-2xl sm:text-3xl font-bold text-ink">{counts.denied}</span>
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
            <span className="font-label-sm text-[11px] font-bold uppercase text-outline">All Requests</span>
            <span className="material-symbols-outlined text-sm text-outline">receipt_long</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display-lg text-2xl sm:text-3xl font-bold text-ink">{counts.total}</span>
            <span className="text-[11px] font-mono text-outline">total history</span>
          </div>
        </div>
      </div>

      {/* Main Filter & Search Control Bar */}
      <div className="p-4 bg-surface rounded-xl border-[3px] border-ink shadow-[4px_4px_0px_#151515] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilter("PENDING")}
            className={`px-3 py-1.5 rounded-lg border-2 border-ink text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
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
            onClick={() => setFilter("APPROVED")}
            className={`px-3 py-1.5 rounded-lg border-2 border-ink text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
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
            onClick={() => setFilter("DENIED")}
            className={`px-3 py-1.5 rounded-lg border-2 border-ink text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
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
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg border-2 border-ink text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
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
            className="w-full pl-9 pr-3 py-1.5 bg-paper border-2 border-ink rounded-lg font-body-sm text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-ink"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Requests Feed / Table */}
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
          {filteredRequests.map((req) => {
            const isPending = req.status === "PENDING";
            const isApproved = req.status === "APPROVED";
            const isDenied = req.status === "DENIED";
            const isProcessing = actionLoadingId === req.id;

            return (
              <div
                key={req.id}
                className="p-5 bg-surface rounded-xl border-[3px] border-ink shadow-[4px_4px_0px_#151515] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all hover:translate-x-0.5"
              >
                {/* Left Section: Child, Item, Store & Note */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Child Avatar */}
                  <div className="w-11 h-11 rounded-full bg-sun border-2 border-ink flex items-center justify-center font-bold text-sm text-ink shrink-0 shadow-[2px_2px_0px_#151515]">
                    {(req.childName || "C").charAt(0).toUpperCase()}
                  </div>

                  {/* Details */}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-headline-sm font-bold text-ink text-base sm:text-lg truncate">
                        {req.itemName}
                      </h3>

                      {/* Status Badges */}
                      {isPending && (
                        <span className="px-2 py-0.5 bg-sun border border-ink text-ink font-mono text-[10px] font-bold uppercase rounded shadow-[1px_1px_0px_#151515]">
                          PENDING REVIEW
                        </span>
                      )}
                      {isApproved && (
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 bg-mint border border-ink text-ink font-mono text-[10px] font-bold uppercase rounded shadow-[1px_1px_0px_#151515]">
                            APPROVED
                          </span>
                          {req.rsaSignature && (
                            <span className="px-1.5 py-0.5 bg-mint/50 border border-ink text-ink font-mono text-[9px] font-bold uppercase rounded flex items-center gap-1">
                              <span className="material-symbols-outlined text-[11px]">shield</span>
                              RSA-2048 SIGNED
                            </span>
                          )}
                        </div>
                      )}
                      {isDenied && (
                        <span className="px-2 py-0.5 bg-coral border border-ink text-ink font-mono text-[10px] font-bold uppercase rounded shadow-[1px_1px_0px_#151515]">
                          DENIED
                        </span>
                      )}

                      {/* Category Tag */}
                      {req.category && (
                        <span className="px-2 py-0.5 bg-surface-container border border-ink/40 text-outline font-mono text-[10px] uppercase rounded">
                          {req.category}
                        </span>
                      )}
                    </div>

                    {/* Metadata line: Store Domain & Child Identification */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-outline">
                      {/* Store Domain */}
                      <div className="flex items-center gap-1 font-mono text-ink font-semibold">
                        <span className="material-symbols-outlined text-xs text-outline">storefront</span>
                        <a
                          href={req.siteDomain.startsWith("http") ? req.siteDomain : `https://${req.siteDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-0.5 text-ink"
                        >
                          <span>{req.siteDomain}</span>
                          <span className="material-symbols-outlined text-[11px] text-outline">open_in_new</span>
                        </a>
                      </div>

                      <span>•</span>

                      {/* Child Name */}
                      <div className="flex items-center gap-1">
                        <span>Requested by:</span>
                        <strong className="text-ink">
                          {req.childName || `Child #${req.childId}`}
                        </strong>
                      </div>

                      <span>•</span>

                      {/* Relative Time */}
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        <span>{formatTime(req.createdAt)}</span>
                      </div>
                    </div>

                    {/* Child Justification Note */}
                    {req.note ? (
                      <div className="mt-1 p-2 bg-paper rounded border border-ink/30 text-xs text-ink/90 flex items-start gap-1.5 max-w-2xl">
                        <span className="material-symbols-outlined text-xs text-outline shrink-0 mt-0.5">format_quote</span>
                        <span className="italic font-body-sm">&quot;{req.note}&quot;</span>
                      </div>
                    ) : (
                      <p className="text-[11px] font-caption text-outline italic">No reason provided by child.</p>
                    )}
                  </div>
                </div>

                {/* Right Section: Amount & Actions */}
                <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-ink/20 shrink-0">
                  {/* Amount Badge */}
                  <div className="flex flex-col items-start lg:items-end">
                    <span className="font-mono font-bold text-xl sm:text-2xl text-ink">
                      ${req.amount.toFixed(2)}
                    </span>
                    <span className="font-mono text-[10px] text-outline uppercase">
                      {req.currency || "USD"}
                    </span>
                  </div>

                  {/* Actions for PENDING */}
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-mint text-ink font-bold text-xs uppercase tracking-wider rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:brightness-105 hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isProcessing ? (
                          <span className="w-3.5 h-3.5 border-2 border-ink border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <span className="material-symbols-outlined text-sm">done</span>
                        )}
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleDeny(req.id)}
                        disabled={isProcessing}
                        className="px-3.5 py-2 bg-coral text-ink font-bold text-xs uppercase tracking-wider rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:brightness-105 hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                        <span>Deny</span>
                      </button>
                    </div>
                  )}

                  {/* Cryptographic Inspector Button for APPROVED items */}
                  {isApproved && (
                    <button
                      onClick={() => setSelectedProofRequest(req)}
                      className="px-3 py-2 bg-paper text-ink font-bold text-xs uppercase rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:bg-surface-container flex items-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm text-mint">verified</span>
                      <span>Cryptographic Proof</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cryptographic Proof Modal / Drawer */}
      {selectedProofRequest && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface rounded-xl border-[4px] border-ink shadow-[8px_8px_0px_#151515] max-w-2xl w-full p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-mint border border-ink flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-ink">lock</span>
                </div>
                <div>
                  <h3 className="font-headline-sm font-bold text-ink uppercase text-base">
                    Cryptographic Approval Proof
                  </h3>
                  <p className="font-caption text-xs text-outline">
                    RSA-2048 Non-Repudiation Guarantee (NB6005CEM CW1 Task 1.c)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProofRequest(null)}
                className="p-1 rounded hover:bg-surface-container text-ink"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Transaction Overview */}
            <div className="p-3 bg-surface-container/50 rounded-lg border-2 border-ink flex items-center justify-between">
              <div>
                <span className="font-label-sm text-[10px] font-bold uppercase text-outline">Item & Merchant</span>
                <p className="font-headline-sm font-bold text-ink text-sm">
                  {selectedProofRequest.itemName} ({selectedProofRequest.siteDomain})
                </p>
              </div>
              <div className="text-right">
                <span className="font-label-sm text-[10px] font-bold uppercase text-outline">Amount</span>
                <p className="font-mono font-bold text-ink text-sm">
                  ${selectedProofRequest.amount.toFixed(2)} {selectedProofRequest.currency}
                </p>
              </div>
            </div>

            {/* Cryptographic Fields */}
            <div className="flex flex-col gap-3">
              {/* RSA-2048 Digital Signature */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-xs font-bold uppercase text-ink flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-mint">key</span>
                    <span>RSA-2048 Digital Signature (SHA256withRSA)</span>
                  </label>
                  {selectedProofRequest.rsaSignature && (
                    <button
                      onClick={() => copyToClipboard(selectedProofRequest.rsaSignature!, "sig")}
                      className="text-[11px] font-mono font-bold text-ink hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[12px]">content_copy</span>
                      {copiedKey === "sig" ? "Copied!" : "Copy Signature"}
                    </button>
                  )}
                </div>
                <div className="p-2.5 bg-paper rounded border-2 border-ink font-mono text-[11px] text-ink break-all max-h-24 overflow-y-auto">
                  {selectedProofRequest.rsaSignature || "Signature not recorded on this entity."}
                </div>
              </div>

              {/* SHA-256 Idempotency Hash */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-xs font-bold uppercase text-ink flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-sky">fingerprint</span>
                    <span>SHA-256 Idempotency Fingerprint</span>
                  </label>
                  {selectedProofRequest.idempotencyHash && (
                    <button
                      onClick={() => copyToClipboard(selectedProofRequest.idempotencyHash!, "hash")}
                      className="text-[11px] font-mono font-bold text-ink hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[12px]">content_copy</span>
                      {copiedKey === "hash" ? "Copied!" : "Copy Hash"}
                    </button>
                  )}
                </div>
                <div className="p-2.5 bg-paper rounded border-2 border-ink font-mono text-[11px] text-ink break-all">
                  {selectedProofRequest.idempotencyHash || "Generated on creation to prevent spam double-clicks."}
                </div>
              </div>

              {/* Public Key Discovery Status */}
              <div className="p-3 bg-mint/20 border-2 border-ink rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-ink text-base">verified</span>
                  <div>
                    <p className="font-body-sm font-bold text-xs text-ink">
                      {publicKeyData ? `${publicKeyData.algorithm} (${publicKeyData.signatureAlgorithm}) Public Key Discovered` : "Backend Key Discovery Online"}
                    </p>
                    <p className="font-caption text-[10px] text-outline">
                      Chrome Extension (PG-5) will verify this signature offline via WebCrypto API before unlocking DOM.
                    </p>
                  </div>
                </div>
                {publicKeyData && (
                  <button
                    onClick={() => copyToClipboard(publicKeyData.publicKeyPem, "pem")}
                    className="px-2.5 py-1 bg-surface border border-ink text-ink font-mono text-[10px] font-bold rounded shadow-[1px_1px_0px_#151515] hover:bg-surface-container shrink-0"
                  >
                    {copiedKey === "pem" ? "Copied PEM!" : "Copy PEM"}
                  </button>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t-2 border-ink/20">
              <button
                onClick={() => setSelectedProofRequest(null)}
                className="px-5 py-2 bg-surface text-ink font-bold text-xs uppercase rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:bg-surface-container"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
