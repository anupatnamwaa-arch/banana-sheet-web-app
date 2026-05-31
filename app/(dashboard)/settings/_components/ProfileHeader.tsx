"use client";

import { useState } from "react";
import { EditProfileSheet } from "./EditProfileSheet";

interface Props {
  userId: string;
  initialName: string;
  initialAvatarUrl: string | null;
  email: string;
}

export function ProfileHeader({ userId, initialName, initialAvatarUrl, email }: Props) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [editOpen, setEditOpen] = useState(false);

  const initial = name.charAt(0).toUpperCase();

  return (
    <>
      {/* Profile card */}
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="flex w-full items-center gap-4 rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-5 text-left transition-opacity hover:opacity-90"
      >
        {/* Avatar */}
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-accent text-2xl font-bold text-black">
              {initial}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{name}</p>
          <p className="truncate text-sm text-fg-muted">{email}</p>
          <span className="mt-1 inline-block rounded-full bg-[var(--glass-bg)] px-2.5 py-0.5 text-xs font-medium text-fg-muted">
            แผนฟรี
          </span>
        </div>

        {/* Edit cue */}
        <span className="shrink-0 text-xs text-accent">แก้ไข</span>
      </button>

      {editOpen && (
        <EditProfileSheet
          userId={userId}
          currentName={name}
          currentAvatarUrl={avatarUrl}
          onClose={() => setEditOpen(false)}
          onSaved={(newName, newUrl) => {
            setName(newName || initialName);
            setAvatarUrl(newUrl);
          }}
        />
      )}
    </>
  );
}
