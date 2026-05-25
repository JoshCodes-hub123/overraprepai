// Single source of truth for "is the student profile complete enough"?
// Used by the dashboard nudge card AND to gate paid actions.

export const REQUIRED_PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: "academic_path", label: "Academic path" },
  { key: "level", label: "Level" },
  { key: "department", label: "Department" },
  { key: "phone", label: "Phone number" },
  { key: "matric_no", label: "Matric number" },
  { key: "state_of_origin", label: "State of origin" },
  { key: "avatar_url", label: "Profile picture" },
];

export interface CompletenessResult {
  percent: number;
  missing: { key: string; label: string }[];
  isComplete: boolean;
}

export function getProfileCompleteness(profile: any | null | undefined): CompletenessResult {
  if (!profile) {
    return { percent: 0, missing: REQUIRED_PROFILE_FIELDS, isComplete: false };
  }
  const filled = REQUIRED_PROFILE_FIELDS.filter((f) => {
    const v =
      (profile as any)?.[f.key] ??
      (f.key === "avatar_url" ? (profile as any)?.profile_image_url : null);
    return v !== null && v !== undefined && String(v).trim() !== "";
  });
  const missing = REQUIRED_PROFILE_FIELDS.filter((f) => !filled.includes(f));
  const percent = Math.round((filled.length / REQUIRED_PROFILE_FIELDS.length) * 100);
  return { percent, missing, isComplete: missing.length === 0 };
}

/**
 * "Verified student" = onboarding done + has a matric number + a university on record.
 * This is the signal we use for trust-bearing UI like the branded Smart Summary PDF.
 * Centralised so we can later swap it for a real `is_verified` flag without touching callers.
 */
export function isVerifiedStudent(profile: any | null | undefined): boolean {
  if (!profile) return false;
  const matric = String(profile.matric_no ?? "").trim();
  const uni = String(profile.university ?? "").trim();
  return !!profile.onboarding_completed && matric.length > 0 && uni.length > 0;
}
