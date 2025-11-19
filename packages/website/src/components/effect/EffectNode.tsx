import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useState } from "react";
import { cn } from "@/lib/cn";
import {
  useVisualEffectNotification,
  useVisualEffectState,
} from "@/lib/useVisualEffect";
import type { VisualEffect } from "@/lib/VisualEffect";
import { DeathBubble } from "../feedback/DeathBubble";
import { FailureBubble } from "../feedback/FailureBubble";
import { NotificationBubble } from "../feedback/NotificationBubble";
import { EffectContainer } from "./EffectContainer";
import { EffectContent } from "./EffectContent";
import { EffectLabel } from "./EffectLabel";
import { EffectOverlay } from "./EffectOverlay";
import {
  useEffectAnimations,
  useEffectMotion,
  useRunningAnimation,
  useStateAnimations,
} from "./useEffectMotion";

function EffectNodeComponent<A, E>({
  style = {},
  effect,
  labelEffect,
  className,
}: {
  effect: VisualEffect<A, E>;
  style?: React.CSSProperties;
  labelEffect?: VisualEffect<unknown, unknown>;
  className?: string;
}) {
  const notification = useVisualEffectNotification(effect);
  const state = useVisualEffectState(effect);
  const effectMotion = useEffectMotion();
  const isRunning = state.type === "running";
  const isFailedOrDeath = state.type === "failed" || state.type === "death";

  // State for error bubble visibility
  const [showErrorBubble, setShowErrorBubble] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Apply all animations
  useRunningAnimation(isRunning, effectMotion);
  useStateAnimations(state, effectMotion);
  useEffectAnimations(state, effectMotion, isHovering, setShowErrorBubble);

  // Stable mouse handlers to avoid creating new functions on every render
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    if (isFailedOrDeath) setShowErrorBubble(true);
  }, [isFailedOrDeath]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  return (
    <div
      className={cn("relative flex flex-col items-center", className)}
      style={style}
    >
      {/* Error bubble positioned outside container */}
      <AnimatePresence>
        {isFailedOrDeath &&
          showErrorBubble &&
          (state.type === "failed" ? (
            <FailureBubble error={state.error} />
          ) : (
            <DeathBubble error={state.error} />
          ))}
      </AnimatePresence>

      {/* Notification bubbles - hidden when error bubbles are shown */}
      <AnimatePresence>
        {!isFailedOrDeath && notification && (
          <NotificationBubble
            key={notification.id}
            notification={notification}
          />
        )}
      </AnimatePresence>

      <motion.div
        style={{
          width: effectMotion.nodeWidth,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <EffectContainer
          state={state}
          motionValues={effectMotion}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <EffectOverlay isRunning={isRunning} motionValues={effectMotion} />
          <EffectContent state={state} motionValues={effectMotion} />
        </EffectContainer>
      </motion.div>
      <EffectLabel effect={labelEffect ?? effect} />
    </div>
  );
}

export const EffectNode = memo(
  EffectNodeComponent,
) as typeof EffectNodeComponent;
