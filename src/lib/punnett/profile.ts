export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  updated_at: string;
};

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function needsProfileNames(profile: Pick<Profile, "first_name" | "last_name">): boolean {
  return !profile.first_name?.trim() || !profile.last_name?.trim();
}

export function validateNames(first: string, last: string): string | null {
  for (const name of [first.trim(), last.trim()]) {
    if (!name || [...name].length > 100 || /\p{Cc}/u.test(name)) return "Enter a first name and last name of 1 to 100 characters each.";
  }
  return null;
}

export function validatePhoto(file: { size: number; type: string }): string | null {
  if (file.size > MAX_PHOTO_BYTES) return "Choose a photo smaller than 2 MB.";
  if (file.size === 0 || !PHOTO_TYPES.includes(file.type)) return "Choose a JPEG, PNG, or WebP photo.";
  return null;
}

export function parseProfile(value: unknown): Profile {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid profile response.");
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.updated_at !== "string" ||
    ![row.first_name, row.last_name, row.avatar_path].every((field) => field === null || typeof field === "string")) throw new Error("Invalid profile response.");
  return row as Profile;
}
