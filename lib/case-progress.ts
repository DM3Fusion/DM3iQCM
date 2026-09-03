import type { CaseTask } from "@/domain/models";
export interface CaseProgress { percentage: number; completedRequiredTasks: number; totalRequiredTasks: number; remainingRequiredTasks: number }
export function calculateCaseProgress(tasks: readonly CaseTask[]): CaseProgress {
  const applicable = tasks.filter((task) => task.required && task.status !== "NOT_APPLICABLE");
  const completed = applicable.filter((task) => task.status === "COMPLETED").length;
  return { percentage: applicable.length ? Math.round((completed / applicable.length) * 100) : 0, completedRequiredTasks: completed, totalRequiredTasks: applicable.length, remainingRequiredTasks: applicable.length - completed };
}
