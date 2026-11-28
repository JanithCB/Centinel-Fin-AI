"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ApiClient,
  UserProfile,
  PurchaseRequestDTO,
  FamilyMemberDTO,
  PublicKeyResponseDTO,
} from "@/lib/api-client";
import AddChildModal from "@/components/AddChildModal";
import CryptographicProofModal from "@/components/CryptographicProofModal";
import PurchaseRequestCard from "@/components/PurchaseRequestCard";
import {
  buildSafeMerchantUrl,
  formatCurrencyAmount,
  getDisplayDomain,
} from "@/lib/format-utils";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Recovery setup state
  const [recoveryRole, setRecoveryRole] = useState<"PARENT" | "CHILD">("PARENT");
  const [isRecovering, setIsRecovering] = useState<boolean>(false);

  // Family creation state (Parent onboarding)
  const [familyName, setFamilyName] = useState<string>("");
  const [isCreatingFamily, setIsCreatingFamily] = useState<boolean>(false);
  const [familyError, setFamilyError] = useState<string | null>(null);

  // Add child modal & form state (Parent with family)
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState<boolean>(false);
  const [childUserIdInput, setChildUserIdInput] = useState<string>("");
  const [isAddingChild, setIsAddingChild] = useState<boolean>(false);
  const [addChildMessage, setAddChildMessage] = useState<string | null>(null);
  const [addChildError, setAddChildError] = useState<string | null>(null);

  // Family members state
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberDTO[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);

  // Purchase requests state & parent mission control filters
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDTO[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "DENIED">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Cryptographic Proof Modal state
  const [selectedProofRequest, setSelectedProofRequest] = useState<PurchaseRequestDTO | null>(null);
  const [publicKeyData, setPublicKeyData] = useState<PublicKeyResponseDTO | null>(null);

  // Create purchase request form state (Child)
  const [siteDomain, setSiteDomain] = useState<string>("");
  const [itemName, setItemName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency] = useState<string>("USD");
  const [category] = useState<string>("EDUCATION");
  const [note, setNote] = useState<string>("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState<boolean>(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setSyncError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/sign-in");
        return;
      }

      // Check if email is verified
      const user = session.user;
      const isConfirmed = Boolean(user.email_confirmed_at || (user as any).confirmed_at);
      if (!isConfirmed) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(user.email || "")}`);
        return;
      }

      // Fetch profile from backend
      try {
        const userProfile = await ApiClient.getCurrentUser();
        setProfile(userProfile);
      } catch (err: any) {
        // If profile not found, allow recoverable sync
        setSyncError(err?.message || "Profile not initialized. Please complete setup.");
      }
    } catch (err: any) {
      setSyncError(err?.message || "Failed to load session.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadRequests = useCallback(async (userRole: "PARENT" | "CHILD") => {
    setLoadingRequests(true);
    try {
      if (userRole === "PARENT") {
        const reqs = await ApiClient.getFamilyPurchaseRequests();
        setPurchaseRequests(reqs);
      } else {
        const reqs = await ApiClient.getMyPurchaseRequests();
        setPurchaseRequests(reqs);
      }
    } catch (err: any) {
      console.warn("Failed to load purchase requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const loadFamilyMembers = useCallback(async (familyId: number) => {
    setLoadingMembers(true);
    try {
      const members = await ApiClient.getFamilyMembers(familyId);
      setFamilyMembers(members);
    } catch (err: any) {
      console.warn("Failed to load family members:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  const loadPublicKey = useCallback(async () => {
    try {
      if (typeof ApiClient.getPublicKey === "function") {
        const keyInfo = await ApiClient.getPublicKey();
        setPublicKeyData(keyInfo);
      }
    } catch (err) {
      console.warn("Could not fetch RSA public key:", err);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    loadPublicKey();
  }, [fetchProfile, loadPublicKey]);

  useEffect(() => {
    if (profile && profile.familyId) {
      loadRequests(profile.role);
      if (profile.role === "PARENT") {
        loadFamilyMembers(profile.familyId);
      }
    }
  }, [profile, loadRequests, loadFamilyMembers]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    router.push("/auth/sign-in");
    router.refresh();
  };

  const handleRecoverSync = async () => {
    setIsRecovering(true);
    setSyncError(null);

    try {
      const newProfile = await ApiClient.registerUser(recoveryRole);
      setProfile(newProfile);
    } catch (err: any) {
      setSyncError(err?.message || "Registration sync failed. Please try again.");
    } finally {
      setIsRecovering(false);
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !familyName.trim()) return;

    setIsCreatingFamily(true);
    setFamilyError(null);

    try {
      await ApiClient.createFamily(familyName.trim(), profile.id);
      await fetchProfile();
    } catch (err: any) {
      setFamilyError(err?.message || "Failed to create family group.");
    } finally {
      setIsCreatingFamily(false);
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.familyId || !childUserIdInput.trim()) return;

    const childId = parseInt(childUserIdInput.trim(), 10);
    if (isNaN(childId)) {
      setAddChildError("Please enter a valid numeric Child User ID.");
      return;
    }

    setIsAddingChild(true);
    setAddChildError(null);
    setAddChildMessage(null);

    try {
      await ApiClient.addFamilyMember(profile.familyId, childId);
      setAddChildMessage(`Successfully added child (ID #${childId}) to your family.`);
      setChildUserIdInput("");
      await loadFamilyMembers(profile.familyId);
      await loadRequests(profile.role);
    } catch (err: any) {
      setAddChildError(err?.message || "Failed to add child to family. Verify the Child User ID.");
    } finally {
      setIsAddingChild(false);
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    setActionLoadingId(requestId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await ApiClient.approvePurchaseRequest(requestId);
      setPurchaseRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, ...updated, status: "APPROVED" } : r))
      );
      setActionSuccess(
        `Request #${requestId} approved. Purchase is now unlocked for your child.`
      );
    } catch (err: any) {
      setActionError(err?.message || "Failed to approve request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDenyRequest = async (requestId: number) => {
    setActionLoadingId(requestId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await ApiClient.denyPurchaseRequest(requestId);
      setPurchaseRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, ...updated, status: "DENIED" } : r))
      );
      setActionSuccess(`Request #${requestId} was denied.`);
    } catch (err: any) {
      setActionError(err?.message || "Failed to deny request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreatePurchaseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    setRequestSuccess(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setRequestError("Please enter a valid purchase amount greater than zero.");
      return;
    }

    setIsSubmittingRequest(true);

    try {
      await ApiClient.createPurchaseRequest({
        siteDomain: siteDomain.trim(),
        itemName: itemName.trim(),
        amount: numericAmount,
        currency,
        category,
        note: note.trim() || undefined,
      });

      setRequestSuccess("Purchase request submitted for parent approval.");
      setSiteDomain("");
      setItemName("");
      setAmount("");
      setNote("");
      if (profile) loadRequests(profile.role);
    } catch (err: any) {
      setRequestError(err?.message || "Failed to submit request.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const linkedChildrenCount = useMemo(
    () => familyMembers.filter((m) => m.role === "CHILD").length,
    [familyMembers]
  );

  const requestStats = useMemo(() => {
    const pendingReqs = purchaseRequests.filter((r) => r.status === "PENDING");
    const approvedReqs = purchaseRequests.filter((r) => r.status === "APPROVED");
    const deniedReqs = purchaseRequests.filter((r) => r.status === "DENIED");

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
      purchaseRequests[0]?.currency ||
      "USD"
    ).toUpperCase();

    return {
      pendingCount: pendingReqs.length,
      approvedCount: approvedReqs.length,
      deniedCount: deniedReqs.length,
      totalCount: purchaseRequests.length,
      pendingTotal,
      approvedTotal,
      primaryCurrency,
    };
  }, [purchaseRequests]);

  const filteredSortedRequests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const statusOrder: Record<PurchaseRequestDTO["status"], number> = {
      PENDING: 0,
      APPROVED: 1,
      DENIED: 2,
    };

    return purchaseRequests
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
        const rankDiff = statusOrder[a.status] - statusOrder[b.status];
        if (rankDiff !== 0) return rankDiff;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [purchaseRequests, filter, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-ink border-t-primary rounded-full animate-spin"></div>
        <p className="font-label-md uppercase tracking-wider text-ink font-bold">
          [ AUTHENTICATING SESSION... ]
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header / Status Bar */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-surface rounded-xl border-[3px] border-ink shadow-[4px_4px_0px_#151515]">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/" className="font-headline-sm font-bold text-ink uppercase tracking-tight hover:text-primary transition-colors">
            PARENTGUARD
          </Link>
          {profile && (
            <span className={`px-2.5 py-1 rounded border-2 border-ink text-xs font-bold uppercase tracking-wider ${
              profile.role === "PARENT" ? "bg-primary text-on-primary-fixed" : "bg-sky text-ink"
            }`}>
              {profile.role} ACCOUNT
            </span>
          )}
          {profile?.familyName && (
            <span className="bg-mint text-ink font-bold text-xs px-2.5 py-1 rounded border-2 border-ink uppercase">
              FAMILY: {profile.familyName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <div className="text-right hidden md:block">
              <p className="font-label-sm font-bold text-ink leading-tight">{profile.displayName}</p>
              <p className="font-caption text-xs text-outline">{profile.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-danger/10 text-danger font-label-sm font-bold uppercase tracking-wider rounded border-2 border-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* STATE 1: Authenticated user without backend profile (AC-60, AC-95) */}
      {!profile && syncError && (
        <div className="bg-surface rounded-xl p-8 border-[3px] border-ink shadow-[6px_6px_0px_#151515] max-w-lg mx-auto flex flex-col gap-6 text-center">
          <div className="w-16 h-16 bg-sun rounded-full border-[3px] border-ink flex items-center justify-center mx-auto shadow-[3px_3px_0px_#151515]">
            <span className="material-symbols-outlined text-3xl text-ink">sync_problem</span>
          </div>
          <div>
            <span className="bg-sun text-ink border-[2px] border-ink px-2.5 py-0.5 rounded text-label-sm font-bold tracking-widest uppercase">
              PROFILE INITIALIZATION
            </span>
            <h2 className="font-headline-lg text-ink uppercase tracking-tight mt-2">
              Finalize Your Account
            </h2>
            <p className="font-body-sm text-on-surface-variant mt-1">
              Your authentication session is active. Choose your account type to initialize your ParentGuard profile.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-left">
            <label className="font-label-sm text-ink font-bold uppercase">Requested Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRecoveryRole("PARENT")}
                className={`py-3 px-4 rounded border-2 border-ink font-bold uppercase transition-all ${
                  recoveryRole === "PARENT"
                    ? "bg-primary text-ink shadow-[3px_3px_0px_#151515]"
                    : "bg-surface hover:bg-surface-container"
                }`}
              >
                Parent
              </button>
              <button
                type="button"
                onClick={() => setRecoveryRole("CHILD")}
                className={`py-3 px-4 rounded border-2 border-ink font-bold uppercase transition-all ${
                  recoveryRole === "CHILD"
                    ? "bg-sky text-ink shadow-[3px_3px_0px_#151515]"
                    : "bg-surface hover:bg-surface-container"
                }`}
              >
                Child
              </button>
            </div>
          </div>

          <button
            onClick={handleRecoverSync}
            disabled={isRecovering}
            className="w-full py-3 px-4 bg-primary text-ink font-label-md font-bold uppercase tracking-wider rounded border-[2px] border-ink shadow-[3px_3px_0px_#151515] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#151515] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50"
          >
            {isRecovering ? "Initializing Profile..." : "Complete Setup"}
          </button>
        </div>
      )}

      {/* STATE 2: Child without a family (AC-55, AC-56) */}
      {profile && profile.role === "CHILD" && !profile.familyId && (
        <div className="bg-surface rounded-xl p-8 border-[3px] border-ink shadow-[6px_6px_0px_#151515] max-w-xl mx-auto flex flex-col gap-6 text-center">
          <div className="w-16 h-16 bg-sky rounded-full border-[3px] border-ink flex items-center justify-center mx-auto shadow-[3px_3px_0px_#151515]">
            <span className="material-symbols-outlined text-3xl text-ink">hourglass_top</span>
          </div>

          <div>
            <span className="bg-sky text-ink border-[2px] border-ink px-2.5 py-0.5 rounded text-label-sm font-bold tracking-widest uppercase">
              STATUS: AWAITING FAMILY LINK
            </span>
            <h2 className="font-headline-lg text-ink uppercase tracking-tight mt-2">
              Waiting to Join Family
            </h2>
            <p className="font-body-sm text-on-surface-variant mt-2">
              Your child account is verified and ready. Ask your parent to link your account using your details below:
            </p>
          </div>

          <div className="bg-surface-container p-4 rounded-lg border-2 border-ink flex flex-col gap-2 text-left">
            <div className="flex justify-between items-center text-sm font-mono">
              <span className="text-outline uppercase">Your Child User ID:</span>
              <span className="font-bold text-ink bg-surface px-2 py-0.5 rounded border border-ink">#{profile.id}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-mono">
              <span className="text-outline uppercase">Your Email:</span>
              <span className="font-bold text-ink">{profile.email}</span>
            </div>
          </div>

          <div className="p-3 bg-mint/30 border-2 border-ink rounded text-xs text-ink text-left">
            <strong>Security Notice:</strong> Children cannot join arbitrary families by entering an unverified code. A registered parent must explicitly link your account.
          </div>

          <button
            onClick={() => fetchProfile()}
            className="w-full py-3 px-4 bg-primary text-ink font-label-md font-bold uppercase tracking-wider rounded border-[2px] border-ink shadow-[3px_3px_0px_#151515] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#151515] transition-all"
          >
            Check Status (Refresh)
          </button>
        </div>
      )}

      {/* STATE 3: Parent without a family (AC-51, AC-52) */}
      {profile && profile.role === "PARENT" && !profile.familyId && (
        <div className="bg-surface rounded-xl p-8 border-[3px] border-ink shadow-[6px_6px_0px_#151515] max-w-xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col gap-2 border-b-[2px] border-ink pb-4">
            <span className="bg-primary text-ink border-[2px] border-ink px-2.5 py-0.5 rounded text-label-sm font-bold tracking-widest uppercase self-start">
              STEP: FAMILY ONBOARDING
            </span>
            <h2 className="font-headline-lg text-ink uppercase tracking-tight mt-1">
              Create Your Family Group
            </h2>
            <p className="font-body-sm text-on-surface-variant">
              To begin managing spending allowances and approving purchase requests, give your family group a name.
            </p>
          </div>

          {familyError && (
            <div className="p-3 bg-danger/10 border-2 border-danger rounded text-danger font-body-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-danger text-lg shrink-0">error</span>
              <span>{familyError}</span>
            </div>
          )}

          <form onSubmit={handleCreateFamily} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="family-name" className="font-label-sm text-ink font-bold uppercase">
                Family Group Name
              </label>
              <input
                id="family-name"
                type="text"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="e.g., The Turner Family"
                className="w-full px-3.5 py-2.5 bg-surface border-2 border-ink rounded font-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_#151515]"
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingFamily || !familyName.trim()}
              className="w-full mt-2 py-3 px-4 bg-primary text-ink font-label-md font-bold uppercase tracking-wider rounded border-[2px] border-ink shadow-[3px_3px_0px_#151515] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#151515] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50"
            >
              {isCreatingFamily ? "Creating Family..." : "Create Family & Continue"}
            </button>
          </form>
        </div>
      )}

      {/* STATE 4: Parent with a family (Full-Width Parent Mission Control) */}
      {profile && profile.role === "PARENT" && profile.familyId && (
        <div className="flex flex-col gap-6">
          {/* Pending Decision Spend Tally & Family Controls Card */}
          <section className="p-5 bg-sun/20 border-[3px] border-ink rounded-xl shadow-[4px_4px_0px_#151515] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-xl bg-sun border-2 border-ink flex items-center justify-center shadow-[2px_2px_0px_#151515] shrink-0">
                <span className="material-symbols-outlined text-ink text-2xl">
                  account_balance_wallet
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-headline-sm font-bold text-ink uppercase text-base sm:text-lg">
                    {requestStats.pendingCount} Pending Request
                    {requestStats.pendingCount === 1 ? "" : "s"} Requiring Authorization
                  </h2>
                  <span className="px-2.5 py-0.5 bg-surface border-2 border-ink rounded font-mono text-xs font-bold text-ink shadow-[1px_1px_0px_#151515]">
                    Pending Cost:{" "}
                    {formatCurrencyAmount(
                      requestStats.pendingTotal,
                      requestStats.primaryCurrency
                    )}{" "}
                    {requestStats.primaryCurrency}
                  </span>
                </div>
                <p className="font-caption text-xs text-outline">
                  Approved Spend Total:{" "}
                  <strong className="text-ink font-mono">
                    {formatCurrencyAmount(
                      requestStats.approvedTotal,
                      requestStats.primaryCurrency
                    )}{" "}
                    {requestStats.primaryCurrency}
                  </strong>{" "}
                  across {requestStats.approvedCount} authorized purchase
                  {requestStats.approvedCount === 1 ? "" : "s"}. Review and authorize your child&apos;s purchase requests below.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddChildModalOpen(true)}
                className="px-3.5 py-2 bg-surface text-ink font-bold text-xs uppercase tracking-wider rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:bg-surface-container hover:translate-x-[1px] hover:translate-y-[1px] transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">group</span>
                <span>Manage Children ({linkedChildrenCount})</span>
                <span className="material-symbols-outlined text-sm text-outline">person_add</span>
              </button>

              <Link
                href="/dashboard/approvals"
                className="px-4 py-2 bg-sun text-ink font-bold text-xs uppercase tracking-wider rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:translate-x-[1px] hover:translate-y-[1px] transition-all inline-flex items-center gap-1.5"
              >
                <span>Open Approvals Center</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </section>

          {/* Action Feedback Alerts */}
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

          {/* Full-Width Family Purchase Requests Feed */}
          <section className="bg-surface rounded-xl p-5 sm:p-6 border-[3px] border-ink shadow-[4px_4px_0px_#151515] flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-ink pb-4">
              <div>
                <h3 className="font-headline-sm font-bold text-ink uppercase text-lg">
                  Family Purchase Requests
                </h3>
                <p className="font-caption text-xs text-outline">
                  Inspect merchant links, child notes, and exact purchase totals before authorizing.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/approvals"
                  className="px-3 py-1.5 bg-paper text-ink font-bold text-xs uppercase rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:bg-surface-container inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  <span>Full Queue</span>
                </Link>
                <button
                  type="button"
                  onClick={() => loadRequests("PARENT")}
                  disabled={loadingRequests}
                  className="p-2 bg-surface border-2 border-ink rounded hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer"
                  aria-label="Refresh requests"
                >
                  <span
                    className={`material-symbols-outlined text-sm ${
                      loadingRequests ? "animate-spin" : ""
                    }`}
                  >
                    refresh
                  </span>
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg border-2 border-ink text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    filter === "ALL"
                      ? "bg-primary text-ink shadow-[2px_2px_0px_#151515]"
                      : "bg-surface hover:bg-surface-container text-outline"
                  }`}
                >
                  <span>All</span>
                  <span className="px-1.5 py-0.2 bg-ink text-paper rounded-full text-[10px] font-mono font-bold">
                    {requestStats.totalCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("PENDING")}
                  className={`px-3 py-1.5 rounded-lg border-2 border-ink text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    filter === "PENDING"
                      ? "bg-sun text-ink shadow-[2px_2px_0px_#151515]"
                      : "bg-surface hover:bg-surface-container text-outline"
                  }`}
                >
                  <span>Pending Review</span>
                  <span className="px-1.5 py-0.2 bg-ink text-paper rounded-full text-[10px] font-mono font-bold">
                    {requestStats.pendingCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("APPROVED")}
                  className={`px-3 py-1.5 rounded-lg border-2 border-ink text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    filter === "APPROVED"
                      ? "bg-mint text-ink shadow-[2px_2px_0px_#151515]"
                      : "bg-surface hover:bg-surface-container text-outline"
                  }`}
                >
                  <span>Approved</span>
                  <span className="px-1.5 py-0.2 bg-ink text-paper rounded-full text-[10px] font-mono font-bold">
                    {requestStats.approvedCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("DENIED")}
                  className={`px-3 py-1.5 rounded-lg border-2 border-ink text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    filter === "DENIED"
                      ? "bg-coral text-ink shadow-[2px_2px_0px_#151515]"
                      : "bg-surface hover:bg-surface-container text-outline"
                  }`}
                >
                  <span>Denied</span>
                  <span className="px-1.5 py-0.2 bg-ink text-paper rounded-full text-[10px] font-mono font-bold">
                    {requestStats.deniedCount}
                  </span>
                </button>
              </div>

              <div className="relative min-w-[240px]">
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

            {loadingRequests ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-ink border-t-primary rounded-full animate-spin"></div>
                <p className="font-mono text-xs uppercase text-outline">Loading requests...</p>
              </div>
            ) : filteredSortedRequests.length === 0 ? (
              <div className="text-center py-12 bg-surface-container/50 rounded-xl border-2 border-dashed border-outline/50 px-4">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">
                  shopping_bag
                </span>
                <p className="font-body-sm text-ink font-bold">
                  {purchaseRequests.length === 0
                    ? "No purchase requests yet"
                    : `No ${filter === "ALL" ? "" : filter.toLowerCase() + " "}purchase requests match your filters`}
                </p>
                <p className="font-caption text-xs text-outline mt-1">
                  {purchaseRequests.length === 0
                    ? "Requests from linked children will appear here with clickable store verification links."
                    : "Adjust your filter tabs or search query to inspect other requests."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredSortedRequests.map((req) => (
                  <PurchaseRequestCard
                    key={req.id}
                    request={req}
                    isProcessing={actionLoadingId === req.id}
                    onApprove={handleApproveRequest}
                    onDeny={handleDenyRequest}
                    onInspectProof={setSelectedProofRequest}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Add Child & Family Roster Modal */}
          <AddChildModal
            isOpen={isAddChildModalOpen}
            onClose={() => setIsAddChildModalOpen(false)}
            familyName={profile.familyName}
            familyMembers={familyMembers}
            loadingMembers={loadingMembers}
            childUserIdInput={childUserIdInput}
            onChildUserIdChange={setChildUserIdInput}
            onAddChild={handleAddChild}
            isAddingChild={isAddingChild}
            addChildError={addChildError}
            addChildMessage={addChildMessage}
          />

          {/* Cryptographic Proof Modal */}
          <CryptographicProofModal
            request={selectedProofRequest}
            publicKeyData={publicKeyData}
            onClose={() => setSelectedProofRequest(null)}
          />
        </div>
      )}

      {/* STATE 5: Child with a family (AC-57, AC-58) */}
      {profile && profile.role === "CHILD" && profile.familyId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Create Purchase Request */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-surface rounded-xl p-6 border-[3px] border-ink shadow-[4px_4px_0px_#151515] flex flex-col gap-4">
              <div className="border-b-2 border-ink pb-3">
                <span className="bg-sky text-ink border border-ink px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  CHILD PORTAL
                </span>
                <h3 className="font-headline-sm font-bold text-ink uppercase mt-1">Ask for Purchase</h3>
              </div>

              {requestError && (
                <div className="p-2.5 bg-danger/10 border-2 border-danger rounded text-danger text-xs">
                  {requestError}
                </div>
              )}

              {requestSuccess && (
                <div className="p-2.5 bg-mint/40 border-2 border-ink rounded text-ink text-xs font-bold">
                  {requestSuccess}
                </div>
              )}

              <form onSubmit={handleCreatePurchaseRequest} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="item-name" className="font-label-sm text-xs font-bold uppercase text-ink">Item Name</label>
                  <input
                    id="item-name"
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Science Textbook"
                    className="px-3 py-2 bg-surface border-2 border-ink rounded font-body-sm text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="site-domain" className="font-label-sm text-xs font-bold uppercase text-ink">Store / Website</label>
                  <input
                    id="site-domain"
                    type="text"
                    required
                    value={siteDomain}
                    onChange={(e) => setSiteDomain(e.target.value)}
                    placeholder="e.g. amazon.com"
                    className="px-3 py-2 bg-surface border-2 border-ink rounded font-body-sm text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="amount" className="font-label-sm text-xs font-bold uppercase text-ink">Amount ($)</label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="px-3 py-2 bg-surface border-2 border-ink rounded font-mono text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="note" className="font-label-sm text-xs font-bold uppercase text-ink">Reason / Note (Optional)</label>
                  <textarea
                    id="note"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Why do you need this item?"
                    className="px-3 py-2 bg-surface border-2 border-ink rounded font-body-sm text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingRequest || !itemName || !siteDomain || !amount}
                  className="w-full mt-2 py-3 bg-primary text-ink font-label-md font-bold uppercase tracking-wider rounded border-2 border-ink shadow-[3px_3px_0px_#151515] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#151515] active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50"
                >
                  {isSubmittingRequest ? "Sending..." : "Submit for Approval"}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Child Requests Feed */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-surface rounded-xl p-6 border-[3px] border-ink shadow-[4px_4px_0px_#151515] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                <div>
                  <h3 className="font-headline-sm font-bold text-ink uppercase">My Purchase Requests</h3>
                  <p className="font-caption text-xs text-outline">Track approvals from your parents</p>
                </div>
                <button
                  onClick={() => loadRequests("CHILD")}
                  className="p-1.5 bg-surface border-2 border-ink rounded hover:bg-surface-container transition-colors"
                  aria-label="Refresh requests"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                </button>
              </div>

              {loadingRequests ? (
                <p className="text-center py-6 font-mono text-xs text-outline">Loading requests...</p>
              ) : purchaseRequests.length === 0 ? (
                <div className="text-center py-10 bg-surface-container/50 rounded-lg border-2 border-dashed border-outline/50">
                  <span className="material-symbols-outlined text-4xl text-outline mb-2">shopping_cart</span>
                  <p className="font-body-sm text-ink font-bold">No purchase requests submitted yet</p>
                  <p className="font-caption text-xs text-outline mt-1">Fill out the form on the left to ask for a purchase.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {purchaseRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 bg-surface rounded-lg border-2 border-ink shadow-[2px_2px_0px_#151515] flex items-center justify-between gap-4"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-headline-sm font-bold text-ink">{req.itemName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            req.status === "APPROVED"
                              ? "bg-mint text-ink border-ink"
                              : req.status === "DENIED"
                              ? "bg-coral text-ink border-ink"
                              : "bg-sun text-ink border-ink"
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="font-caption text-xs text-outline flex items-center gap-1.5">
                          <span>Store:</span>
                          <a
                            href={buildSafeMerchantUrl(req.siteDomain)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-ink hover:underline inline-flex items-center gap-1"
                          >
                            <span>{getDisplayDomain(req.siteDomain)}</span>
                            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                          </a>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-mono font-bold text-base text-ink">
                          {formatCurrencyAmount(req.amount, req.currency)}
                        </span>
                        <span className="font-mono text-[10px] text-outline uppercase">
                          {(req.currency || "USD").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
