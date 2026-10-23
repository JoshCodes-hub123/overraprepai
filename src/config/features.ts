// Central feature flags.
export const FEATURES = {
  jamb: false,          // JAMB / UTME disabled — app is 100% focused on University higher education
  marketingSite: false, // Native app entry
  school: false,        // Secondary school management removed
  liveClassrooms: true, // LiveKit interactive classrooms enabled
} as const;
