// Central feature flags. Flip to true to re-enable.
export const FEATURES = {
  jamb: false,        // JAMB track paused — focus on University + School
  marketingSite: false, // Hide marketing landing; `/` becomes native app entry
  school: true,       // School Management System
  liveClassrooms: false, // LiveKit live classrooms paused — show Coming soon
} as const;
