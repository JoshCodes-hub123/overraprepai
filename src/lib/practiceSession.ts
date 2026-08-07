/**
 * Shape of one answered question inside a practice session.
 *
 * These records are the raw truth behind results, the mistake review, and the
 * mastery write-back — the UI never invents anything that isn't captured here.
 */
export interface PracticeResponse {
  questionId: string;
  questionText: string;
  /** Letter the student picked, e.g. "B". */
  picked: string;
  pickedText: string | null;
  /** Letter of the correct option. */
  correct: string;
  correctText: string | null;
  explanation: string | null;
  isCorrect: boolean;
}
