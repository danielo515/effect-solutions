"use client";
import { motion } from "motion/react";
import { memo, useCallback, useState } from "react";
import { useOptionKey } from "@/hooks/useOptionKey";
import { cn } from "@/lib/cn";
import { taskSounds } from "@/lib/sounds/TaskSounds";
import { useLessonSfxHandlers } from "@/lib/useLessonNavSfx";
import { useVisualEffectSubscription } from "@/lib/useVisualEffect";
import type { VisualEffect } from "@/lib/VisualEffect";
import { TaskButton } from "./TaskButton";

interface HeaderViewProps<A, E> {
  effect: VisualEffect<A, E>;
  name: string;
  variant?: string;
  description?: React.ReactNode;
  exampleId?: string;
  className?: string;
}

function HeaderViewComponent({
  description,
  exampleId,
  name,
  effect: task,
  variant,
  className,
}: HeaderViewProps<unknown, unknown>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const isOptionPressed = useOptionKey();
  const { handleHover: playHoverSfx, handleClick: playClickSfx } =
    useLessonSfxHandlers();
  useVisualEffectSubscription(task);
  const { state } = task;

  const isRunning = state.type === "running";
  const isCompleted = state.type === "completed";
  const isFailed = state.type === "failed";
  const isInterrupted = state.type === "interrupted";
  const isDeath = state.type === "death";
  const canReset = isCompleted || isFailed || isInterrupted || isDeath;

  const runWithDependencies = useCallback(async () => {
    await task.run();
  }, [task]);

  const resetWithDependencies = useCallback(() => {
    task.reset();
    // Play reset sound
    taskSounds.playReset();
  }, [task]);

  const handleAction = useCallback(() => {
    // If Option is pressed and we have an exampleId, copy link
    if (isOptionPressed && exampleId) {
      const url = `${window.location.origin}/${exampleId}`;
      navigator.clipboard.writeText(url).then(() => {
        setShowCheckmark(true);
        // Play copy success sound
        taskSounds.playLinkCopied();
        // Hide checkmark after 1.5 seconds
        setTimeout(() => {
          setShowCheckmark(false);
        }, 1500);
      });
      return;
    }

    const currentState = task.state;
    const running = currentState.type === "running";
    const resettable =
      currentState.type === "completed" ||
      currentState.type === "failed" ||
      currentState.type === "interrupted" ||
      currentState.type === "death";

    if (running) {
      task.interrupt();
    } else if (resettable) {
      resetWithDependencies();
    } else {
      runWithDependencies();
    }
  }, [
    task,
    resetWithDependencies,
    runWithDependencies,
    isOptionPressed,
    exampleId,
  ]);

  return (
    <motion.div
      onMouseEnter={() => {
        setIsHovered(true);
        playHoverSfx();
      }}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={() => {
        playClickSfx();
        handleAction();
      }}
      className={cn("flex items-center gap-4 w-full cursor-default", className)}
      animate={{
        backgroundColor: isHovered
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(255, 255, 255, 0)",
      }}
      transition={{ duration: 0.05 }}
    >
      <TaskButton
        isRunning={isRunning}
        isCompleted={isCompleted}
        isFailed={isFailed}
        isInterrupted={isInterrupted}
        isDeath={isDeath}
        canReset={canReset}
        isOptionPressed={isOptionPressed}
        exampleId={exampleId}
        showCheckmark={showCheckmark}
        isHovered={isHovered}
        isPressed={isPressed}
      />

      <div className="flex-1 flex flex-col">
        <div className="text-xl font-semibold text-white flex items-baseline">
          <span>{name}</span>
          {/* <span className="text-neutral-500"> */}
          {/* <CaretDoubleRightIcon size={16} weight="bold" /> */}
          {/* </span> */}
          {variant && (
            <span className="font-medium text-neutral-500">{variant}</span>
          )}
        </div>
        {description && (
          <p className="text-sm text-neutral-400">{description}</p>
        )}
      </div>
    </motion.div>
  );
}

export const HeaderView = memo(
  HeaderViewComponent,
) as typeof HeaderViewComponent;
