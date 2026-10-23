import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MissedQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  selected_option: string | null;
  topic_id?: string | null;
  topic_name?: string | null;
  course_id?: string | null;
  course_code?: string | null;
  course_name?: string | null;
}

export interface CourseMastery {
  courseId: string;
  courseCode: string; // e.g. "CSC 201", "MAT 201"
  courseName: string;
  attempted: number;
  correct: number;
  accuracy: number;
  avgTimeSec: number;
  totalAttempts: number;
  status: "mastered" | "proficient" | "needs_work"; // >=80% = mastered, 60-79% = proficient, <60% = needs_work
}

export interface WeakTopic {
  topicId: string;
  topicName: string;
  courseId: string;
  courseCode: string; // e.g. "CSC 201"
  courseName: string;
  attempted: number;
  correct: number;
  missed: number;
  accuracy: number; // strictly < 60%
  severity: "critical" | "warning"; // < 40% = critical, 40-59% = warning
  missedQuestions: MissedQuestion[];
}

export interface MasteryRow {
  course_id: string;
  course_name: string;
  course_code?: string;
  topic_id: string | null;
  topic_label: string;
  attempted: number;
  correct: number;
  accuracy: number;
  avg_time_sec: number;
  gap_type: "concept" | "speed" | "balanced" | "mastered";
}

export interface ProgressSummary {
  totalAttempts: number;
  totalQuestionsAttempted: number;
  totalQuestionsCorrect: number;
  overallAccuracy: number;
  weakTopicsCount: number;
  coursesCount: number;
}

const SPEED_THRESHOLD = 45; // seconds per question — above = slow

export function useMasteryBreakdown(userId: string | undefined) {
  const [rows, setRows] = useState<MasteryRow[]>([]);
  const [courseMasteries, setCourseMasteries] = useState<CourseMastery[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [summary, setSummary] = useState<ProgressSummary>({
    totalAttempts: 0,
    totalQuestionsAttempted: 0,
    totalQuestionsCorrect: 0,
    overallAccuracy: 0,
    weakTopicsCount: 0,
    coursesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Pull user's quiz attempts
      const { data: atts, error: attsErr } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, score, total_questions, correct_answers, time_spent_seconds, completed_at, started_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false });

      if (attsErr) throw attsErr;

      const attemptList = atts || [];
      const attemptIds = attemptList.map((a) => a.id);

      if (attemptIds.length === 0) {
        setRows([]);
        setCourseMasteries([]);
        setWeakTopics([]);
        setSummary({
          totalAttempts: 0,
          totalQuestionsAttempted: 0,
          totalQuestionsCorrect: 0,
          overallAccuracy: 0,
          weakTopicsCount: 0,
          coursesCount: 0,
        });
        setLoading(false);
        return;
      }

      // 2. Pull all quiz_answers for these attempts with question, course & topic relations
      const { data: ans, error: ansErr } = await supabase
        .from("quiz_answers")
        .select(`
          id, attempt_id, is_correct, time_spent_seconds, selected_option,
          questions(
            id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, topic_id, course_id,
            courses:course_id(id, code, name),
            topics:topic_id(id, name)
          )
        `)
        .in("attempt_id", attemptIds);

      if (ansErr) throw ansErr;

      // Group answers by Course and by Topic
      const courseMap = new Map<string, {
        courseId: string;
        courseCode: string;
        courseName: string;
        attempted: number;
        correct: number;
        totalTime: number;
        attemptIds: Set<string>;
      }>();

      const topicMap = new Map<string, {
        topicId: string;
        topicName: string;
        courseId: string;
        courseCode: string;
        courseName: string;
        attempted: number;
        correct: number;
        missedQuestions: MissedQuestion[];
      }>();

      let totalQs = 0;
      let totalCorrect = 0;

      (ans || []).forEach((row: any) => {
        const q = row.questions;
        if (!q) return;

        totalQs += 1;
        const isCorrect = !!row.is_correct;
        if (isCorrect) totalCorrect += 1;

        const courseId = q.course_id || "general";
        const courseCode = q.courses?.code || "GEN 101";
        const courseName = q.courses?.name || "General Course";

        const topicId = q.topic_id || `topic-${courseId}`;
        const topicName = q.topics?.name || `${courseCode} Core Topics`;

        // Update Course Map
        const curCourse = courseMap.get(courseId) || {
          courseId,
          courseCode,
          courseName,
          attempted: 0,
          correct: 0,
          totalTime: 0,
          attemptIds: new Set<string>(),
        };
        curCourse.attempted += 1;
        if (isCorrect) curCourse.correct += 1;
        curCourse.totalTime += row.time_spent_seconds || 0;
        if (row.attempt_id) curCourse.attemptIds.add(row.attempt_id);
        courseMap.set(courseId, curCourse);

        // Update Topic Map
        const topicKey = `${courseId}::${topicId}`;
        const curTopic = topicMap.get(topicKey) || {
          topicId,
          topicName,
          courseId,
          courseCode,
          courseName,
          attempted: 0,
          correct: 0,
          missedQuestions: [],
        };
        curTopic.attempted += 1;
        if (isCorrect) {
          curTopic.correct += 1;
        } else {
          // Record missed question
          curTopic.missedQuestions.push({
            id: q.id,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option,
            explanation: q.explanation || null,
            selected_option: row.selected_option || null,
            topic_id: topicId,
            topic_name: topicName,
            course_id: courseId,
            course_code: courseCode,
            course_name: courseName,
          });
        }
        topicMap.set(topicKey, curTopic);
      });

      // 3. Build Course Masteries
      const courses: CourseMastery[] = Array.from(courseMap.values()).map((c) => {
        const accuracy = c.attempted > 0 ? Math.round((c.correct / c.attempted) * 100) : 0;
        const avgTimeSec = c.attempted > 0 ? Math.round(c.totalTime / c.attempted) : 0;
        let status: CourseMastery["status"] = "proficient";
        if (accuracy >= 80) status = "mastered";
        else if (accuracy < 60) status = "needs_work";

        return {
          courseId: c.courseId,
          courseCode: c.courseCode,
          courseName: c.courseName,
          attempted: c.attempted,
          correct: c.correct,
          accuracy,
          avgTimeSec,
          totalAttempts: c.attemptIds.size,
          status,
        };
      }).sort((a, b) => a.accuracy - b.accuracy);

      // 4. Build Weak Topics (strictly score < 60%)
      const weak: WeakTopic[] = Array.from(topicMap.values())
        .map((t) => {
          const accuracy = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0;
          const missed = t.attempted - t.correct;
          const severity: WeakTopic["severity"] = accuracy < 40 ? "critical" : "warning";
          return {
            topicId: t.topicId,
            topicName: t.topicName,
            courseId: t.courseId,
            courseCode: t.courseCode,
            courseName: t.courseName,
            attempted: t.attempted,
            correct: t.correct,
            missed,
            accuracy,
            severity,
            missedQuestions: t.missedQuestions,
          };
        })
        .filter((t) => t.accuracy < 60 && t.attempted > 0)
        .sort((a, b) => a.accuracy - b.accuracy || b.missed - a.missed);

      // 5. Backwards-compatible legacy MasteryRows for any existing consumers
      const legacyRows: MasteryRow[] = courses.map((c) => {
        const slow = c.avgTimeSec > SPEED_THRESHOLD;
        let gap_type: MasteryRow["gap_type"] = "balanced";
        if (c.accuracy >= 80 && !slow) gap_type = "mastered";
        else if (c.accuracy < 60) gap_type = "concept";
        else if (slow) gap_type = "speed";

        return {
          course_id: c.courseId,
          course_name: c.courseName,
          course_code: c.courseCode,
          topic_id: null,
          topic_label: c.courseCode,
          attempted: c.attempted,
          correct: c.correct,
          accuracy: c.accuracy,
          avg_time_sec: c.avgTimeSec,
          gap_type,
        };
      });

      setRows(legacyRows);
      setCourseMasteries(courses);
      setWeakTopics(weak);
      setSummary({
        totalAttempts: attemptList.length,
        totalQuestionsAttempted: totalQs,
        totalQuestionsCorrect: totalCorrect,
        overallAccuracy: totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0,
        weakTopicsCount: weak.length,
        coursesCount: courses.length,
      });
    } catch (err) {
      console.error("Error fetching progress mastery diagnostics:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    rows,
    courseMasteries,
    weakTopics,
    summary,
    loading,
    refetch: fetchData,
  };
}
