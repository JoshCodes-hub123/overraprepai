import { useEffect, useCallback } from "react";

interface AutoSaveData {
  quizId: string;
  answers: Record<string, string>;
  flagged: string[];
  currentIndex: number;
  timeLeft: number;
  /** Absolute end timestamp (ms since epoch) for the running timer. */
  endsAt: number | null;
  attemptId: string | null;
}

const STORAGE_KEY = "quiz_autosave";

export const useQuizAutoSave = (quizId: string) => {
  // Save quiz state
  const saveState = useCallback((data: Omit<AutoSaveData, "quizId">) => {
    if (!quizId) return;
    
    const saveData: AutoSaveData = {
      quizId,
      ...data,
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    } catch (error) {
      console.error("Failed to save quiz state:", error);
    }
  }, [quizId]);

  // Load saved state
  const loadState = useCallback((): Omit<AutoSaveData, "quizId"> | null => {
    if (!quizId) return null;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      
      const data: AutoSaveData = JSON.parse(saved);
      
      // Only return if it's for the same quiz
      if (data.quizId !== quizId) return null;
      
      return {
        answers: data.answers,
        flagged: data.flagged,
        currentIndex: data.currentIndex,
        timeLeft: data.timeLeft,
        attemptId: data.attemptId,
      };
    } catch {
      return null;
    }
  }, [quizId]);

  // Clear saved state
  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear quiz state:", error);
    }
  }, []);

  // Check if there's a saved state for this quiz
  const hasSavedState = useCallback((): boolean => {
    const saved = loadState();
    return saved !== null && saved.attemptId !== null;
  }, [loadState]);

  return {
    saveState,
    loadState,
    clearState,
    hasSavedState,
  };
};
