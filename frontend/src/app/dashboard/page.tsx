"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ApiClient, UserProfile, PurchaseRequestDTO } from "@/lib/api-client";

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

  // Add child state (Parent with family)
  const [childUserIdInput, setChildUserIdInput] = useState<string>("");
  const [isAddingChild, setIsAddingChild] = useState<boolean>(false);
  const [addChildMessage, setAddChildMessage] = useState<string | null>(null);
  const [addChildError, setAddChildError] = useState<string | null>(null);

  // Purchase requests state
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDTO[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);

  // Create purchase request form state (Child)
  const [siteDomain, setSiteDomain] = useState<string>("");
  const [itemName, setItemName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [category, setCategory] = useState<string>("EDUCATION");
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

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile && profile.familyId) {
      loadRequests(profile.role);
    }
  }, [profile, loadRequests]);

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
      setAddChildMessage(`Successfully added child (ID #${childId}) to your family!`);
      setChildUserIdInput("");
      await loadRequests(profile.role);
    } catch (err: any) {
      setAddChildError(err?.message || "Failed to add child to family. Verify the Child User ID.");
    } finally {
      setIsAddingChild(false);
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      await ApiClient.approvePurchaseRequest(requestId);
      if (profile) loadRequests(profile.role);
    } catch (err: any) {
      alert(err?.message || "Failed to approve request.");
    }
  };

  const handleDenyRequest = async (requestId: number) => {
    try {
      await ApiClient.denyPurchaseRequest(requestId);
      if (profile) loadRequests(profile.role);
    } catch (err: any) {
      alert(err?.message || "Failed to deny request.");
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

      setRequestSuccess("Purchase request submitted for parent approval!");
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
    <div className="flex flex-col w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Top Header / Status Bar */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-surface rounded-xl border-[3px] border-ink shadow-[4px_4px_0px_#151515]">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/" className="font-headline-sm font-bold text-ink uppercase tracking-tight hover:text-primary transition-colors">
            PARENTGUARD
          </Link>
          <span className="bg-surface-container text-ink font-mono text-xs px-2.5 py-1 rounded border-2 border-ink font-bold">
            v1.0-MVP
          </span>
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

      {/* STATE 4: Parent with a family (AC-53, AC-54) */}
      {profile && profile.role === "PARENT" && profile.familyId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Family Management */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-surface rounded-xl p-6 border-[3px] border-ink shadow-[4px_4px_0px_#151515] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                <h3 className="font-headline-sm font-bold text-ink uppercase">Family Members</h3>
                <span className="material-symbols-outlined text-ink">group</span>
              </div>

              {addChildError && (
                <div className="p-2.5 bg-danger/10 border-2 border-danger rounded text-danger text-xs">
                  {addChildError}
                </div>
              )}

              {addChildMessage && (
                <div className="p-2.5 bg-mint/40 border-2 border-ink rounded text-ink text-xs font-bold">
                  {addChildMessage}
                </div>
              )}

              <form onSubmit={handleAddChild} className="flex flex-col gap-3">
                <label htmlFor="child-id" className="font-label-sm text-ink font-bold uppercase">
                  Add Child by User ID
                </label>
                <div className="flex gap-2">
                  <input
                    id="child-id"
                    type="number"
                    required
                    value={childUserIdInput}
                    onChange={(e) => setChildUserIdInput(e.target.value)}
                    placeholder="Child ID (e.g. 2)"
                    className="w-full px-3 py-2 bg-surface border-2 border-ink rounded font-mono text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_#151515]"
                  />
                  <button
                    type="submit"
                    disabled={isAddingChild || !childUserIdInput.trim()}
                    className="px-4 py-2 bg-primary text-ink font-bold uppercase text-xs rounded border-2 border-ink shadow-[2px_2px_0px_#151515] shrink-0 disabled:opacity-50"
                  >
                    {isAddingChild ? "Adding..." : "Add"}
                  </button>
                </div>
                <p className="font-caption text-xs text-outline">
                  Enter the numeric ID displayed on the child&apos;s waiting screen.
                </p>
              </form>
            </div>
          </div>

          {/* Right Column: Family Purchase Requests Feed */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-surface rounded-xl p-6 border-[3px] border-ink shadow-[4px_4px_0px_#151515] flex flex-col gap-4">
              <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                <div>
                  <h3 className="font-headline-sm font-bold text-ink uppercase">Family Purchase Requests</h3>
                  <p className="font-caption text-xs text-outline">Review and approve items requested by children</p>
                </div>
                <button
                  onClick={() => loadRequests("PARENT")}
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
                  <span className="material-symbols-outlined text-4xl text-outline mb-2">shopping_bag</span>
                  <p className="font-body-sm text-ink font-bold">No purchase requests yet</p>
                  <p className="font-caption text-xs text-outline mt-1">Requests from linked children will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {purchaseRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 bg-surface rounded-lg border-2 border-ink shadow-[2px_2px_0px_#151515] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
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
                        <p className="font-caption text-xs text-outline">
                          Store: <strong className="text-ink">{req.siteDomain}</strong> | Category: {req.category || "General"}
                        </p>
                        {req.note && <p className="font-body-sm text-xs text-ink/80 italic">&quot;{req.note}&quot;</p>}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="font-mono font-bold text-base text-ink">
                          ${req.amount.toFixed(2)}
                        </span>
                        {req.status === "PENDING" && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              className="px-3 py-1 bg-mint text-ink font-bold text-xs rounded border border-ink shadow-[1px_1px_0px_#151515] hover:brightness-105 active:translate-x-[1px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDenyRequest(req.id)}
                              className="px-3 py-1 bg-coral text-ink font-bold text-xs rounded border border-ink shadow-[1px_1px_0px_#151515] hover:brightness-105 active:translate-x-[1px]"
                            >
                              Deny
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
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
                        <p className="font-caption text-xs text-outline">
                          Store: <strong className="text-ink">{req.siteDomain}</strong>
                        </p>
                      </div>

                      <span className="font-mono font-bold text-base text-ink">
                        ${req.amount.toFixed(2)}
                      </span>
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
