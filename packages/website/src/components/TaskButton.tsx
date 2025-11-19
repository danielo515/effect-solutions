"use client";
import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  LinkIcon,
  PlayIcon,
  StarFourIcon,
  StopIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { GLOW_COLORS, TASK_COLORS } from "@/constants/colors";

interface TaskButtonProps {
  isRunning: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isInterrupted: boolean;
  isDeath: boolean;
  canReset: boolean;
  isOptionPressed: boolean;
  exampleId?: string;
  showCheckmark: boolean;
  isHovered: boolean;
  isPressed: boolean;
}

export function TaskButton({
  isRunning,
  isCompleted,
  isFailed,
  isInterrupted,
  isDeath,
  canReset,
  isOptionPressed,
  exampleId,
  showCheckmark,
  isHovered,
  isPressed,
}: TaskButtonProps) {
  const getIcon = () => {
    // Show checkmark after copying
    if (showCheckmark) {
      return (
        <motion.div
          key="check"
          initial={{ scale: 0, rotate: -180, filter: "blur(10px)" }}
          animate={{ scale: 1, rotate: 0, filter: "blur(0px)" }}
          exit={{ scale: 0, rotate: 180, filter: "blur(10px)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <CheckIcon size={24} weight="bold" />
        </motion.div>
      );
    }

    // Show link icon when Option is pressed AND hovering
    if (isOptionPressed && isHovered && exampleId) {
      return (
        <motion.div
          key="link"
          initial={{ scale: 0, rotate: -180, filter: "blur(10px)" }}
          animate={{ scale: 1, rotate: 0, filter: "blur(0px)" }}
          exit={{ scale: 0, rotate: 180, filter: "blur(10px)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <LinkIcon size={24} weight="bold" />
        </motion.div>
      );
    }

    if (isHovered) {
      if (isRunning) {
        return (
          <motion.div
            key="stop"
            initial={{ scale: 0, rotate: -180, filter: "blur(10px)" }}
            animate={{ scale: 1, rotate: 0, filter: "blur(0px)" }}
            exit={{ scale: 0, rotate: 180, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <StopIcon size={24} weight="fill" />
          </motion.div>
        );
      } else if (canReset) {
        return (
          <motion.div
            key="reset"
            initial={{ scale: 0, rotate: -180, filter: "blur(10px)" }}
            animate={{ scale: 1, rotate: 0, filter: "blur(0px)" }}
            exit={{ scale: 0, rotate: 180, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <ArrowCounterClockwiseIcon size={24} weight="bold" />
          </motion.div>
        );
      } else {
        return (
          <motion.div
            key="play"
            initial={{ scale: 0, rotate: -180, filter: "blur(10px)" }}
            animate={{ scale: 1, rotate: 0, filter: "blur(0px)" }}
            exit={{ scale: 0, rotate: 180, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <PlayIcon size={24} weight="fill" />
          </motion.div>
        );
      }
    }

    return (
      <motion.div
        key="star"
        initial={{ scale: 0, filter: "blur(10px)" }}
        animate={
          isRunning
            ? { rotate: 360, scale: 1, filter: "blur(0px)" }
            : { rotate: 0, scale: 1, filter: "blur(0px)" }
        }
        exit={{ scale: 0, filter: "blur(10px)" }}
        transition={
          isRunning
            ? {
                rotate: {
                  duration: 1,
                  repeat: Infinity,
                  ease: "circInOut",
                },
                scale: { type: "spring", stiffness: 300, damping: 20 },
                filter: { type: "spring", stiffness: 300, damping: 20 },
              }
            : {
                type: "spring",
                stiffness: 300,
                damping: 20,
              }
        }
      >
        <StarFourIcon size={24} weight="fill" />
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={false}
      animate={{
        scale: isPressed ? 0.95 : isHovered ? 1.05 : 1,
        background: showCheckmark
          ? "#4f46e5" // indigo-600 for success state
          : isOptionPressed && isHovered && exampleId
            ? "#6366f1" // indigo-500 for link copy mode
            : isRunning
              ? TASK_COLORS.running
              : isInterrupted
                ? TASK_COLORS.interrupted
                : isCompleted
                  ? TASK_COLORS.success
                  : isFailed
                    ? TASK_COLORS.error
                    : isDeath
                      ? TASK_COLORS.death
                      : TASK_COLORS.idle,
      }}
      transition={{
        scale: { type: "spring", stiffness: 300, damping: 20 },
        background: { duration: 0.2, ease: "easeInOut" },
      }}
      className="w-10 h-10 rounded-md flex items-center justify-center text-white relative overflow-hidden !select-none cursor-default"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {getIcon()}
      </AnimatePresence>

      {isRunning && (
        <motion.div
          className="absolute -inset-0.5 -z-10"
          style={{
            background: `radial-gradient(circle, ${GLOW_COLORS.running} 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Glow effect for link copy mode */}
      {isOptionPressed && isHovered && exampleId && !showCheckmark && (
        <motion.div
          className="absolute -inset-0.5 -z-10"
          style={{
            background: `radial-gradient(circle, #6366f1 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Glow effect for success checkmark */}
      {showCheckmark && (
        <motion.div
          className="absolute -inset-0.5 -z-10"
          style={{
            background: `radial-gradient(circle, #4f46e5 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.div>
  );
}
