import { SHADOW_COLORS } from "@/constants/colors";
import { theme } from "@/lib/theme";
import type { VisualEffect } from "@/lib/VisualEffect";

type TaskState = VisualEffect<unknown, unknown>["state"];

export function getTaskShadow(state: TaskState): string {
  switch (state.type) {
    case "running":
      return SHADOW_COLORS.running;
    default:
      return theme.shadow.sm;
  }
}
