"use client";

import { useEffect } from "react";
import { FamilyMemberDTO } from "@/lib/api-client";

interface AddChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyName?: string | null;
  familyMembers: FamilyMemberDTO[];
  loadingMembers: boolean;
  childUserIdInput: string;
  onChildUserIdChange: (value: string) => void;
  onAddChild: (e: React.FormEvent) => void;
  isAddingChild: boolean;
  addChildError: string | null;
  addChildMessage: string | null;
}

export default function AddChildModal({
  isOpen,
  onClose,
  familyName,
  familyMembers,
  loadingMembers,
  childUserIdInput,
  onChildUserIdChange,
  onAddChild,
  isAddingChild,
  addChildError,
  addChildMessage,
}: AddChildModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const linkedChildren = familyMembers.filter((member) => member.role === "CHILD");

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-child-modal-title"
    >
      <div
        className="bg-surface rounded-xl border-[4px] border-ink shadow-[8px_8px_0px_#151515] max-w-lg w-full p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary border-2 border-ink flex items-center justify-center shadow-[2px_2px_0px_#151515]">
              <span className="material-symbols-outlined text-base text-ink">group</span>
            </div>
            <div>
              <h3
                id="add-child-modal-title"
                className="font-headline-sm font-bold text-ink uppercase text-base"
              >
                Family Members
              </h3>
              <p className="font-caption text-xs text-outline">
                {familyName ? `Household: ${familyName}` : "Manage linked child accounts"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close family members dialog"
            className="p-1.5 rounded border-2 border-transparent hover:border-ink hover:bg-surface-container text-ink transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Linked Children Roster */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="font-label-sm font-bold text-ink uppercase text-[11px] tracking-wider">
              Linked Children ({linkedChildren.length})
            </span>
            {loadingMembers && (
              <span className="font-mono text-[10px] text-outline">Refreshing...</span>
            )}
          </div>

          {linkedChildren.length === 0 ? (
            <p className="font-caption text-xs text-outline italic py-3 text-center bg-surface-container/40 rounded-lg border border-dashed border-outline/40">
              No children linked yet. Enter their Child ID below to link them.
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {linkedChildren.map((member) => (
                <div
                  key={member.id}
                  className="p-2.5 bg-surface-container/60 rounded-lg border-2 border-ink shadow-[2px_2px_0px_#151515] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-sun border-2 border-ink flex items-center justify-center font-bold text-xs shrink-0 text-ink">
                      {(member.displayName || member.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-sm font-bold text-xs text-ink truncate">
                        {member.displayName}
                      </span>
                      <span className="font-caption text-[10px] text-outline truncate">
                        {member.email}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-surface border border-ink rounded font-mono text-[10px] font-bold text-ink shrink-0">
                    ID: {member.userId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Child Form */}
        <div className="border-t-2 border-ink pt-4 flex flex-col gap-3">
          {addChildError && (
            <div className="p-2.5 bg-danger/10 border-2 border-danger rounded text-danger text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span>{addChildError}</span>
            </div>
          )}

          {addChildMessage && (
            <div className="p-2.5 bg-mint/40 border-2 border-ink rounded text-ink text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
              <span>{addChildMessage}</span>
            </div>
          )}

          <form onSubmit={onAddChild} className="flex flex-col gap-2.5">
            <label
              htmlFor="child-id"
              className="font-label-sm text-ink font-bold uppercase text-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              <span>Add Child by User ID</span>
            </label>
            <div className="flex gap-2">
              <input
                id="child-id"
                type="number"
                required
                value={childUserIdInput}
                onChange={(e) => onChildUserIdChange(e.target.value)}
                placeholder="Child ID (e.g. 2)"
                className="w-full px-3 py-2 bg-paper border-2 border-ink rounded font-mono text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_#151515]"
              />
              <button
                type="submit"
                disabled={isAddingChild || !childUserIdInput.trim()}
                className="px-4 py-2 bg-primary text-ink font-bold uppercase text-xs rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:translate-x-[1px] hover:translate-y-[1px] shrink-0 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isAddingChild ? "Adding..." : "Add"}
              </button>
            </div>
            <p className="font-caption text-xs text-outline">
              Enter the numeric ID displayed on the child&apos;s waiting screen.
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t-2 border-ink/20">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-surface text-ink font-bold text-xs uppercase rounded border-2 border-ink shadow-[2px_2px_0px_#151515] hover:bg-surface-container transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
