import { useState, useEffect } from "react";

const ONBOARDING_KEY = "overraprep_onboarding_completed";

const safeGet = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
};

const safeSet = (ids: string[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(ids));
  } catch {
    /* private mode / quota — onboarding will just re-show, no crash */
  }
};

export const useOnboarding = (userId: string | undefined) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    if (!userId) {
      setShowOnboarding(false);
      setIsChecked(true);
      return;
    }
    const completed = safeGet();
    setShowOnboarding(!completed.includes(userId));
    setIsChecked(true);
  }, [userId]);

  const completeOnboarding = () => {
    if (!userId) {
      setShowOnboarding(false);
      return;
    }
    const completed = safeGet();
    if (!completed.includes(userId)) {
      completed.push(userId);
      safeSet(completed);
    }
    setShowOnboarding(false);
  };

  return { showOnboarding, isChecked, completeOnboarding };
};
