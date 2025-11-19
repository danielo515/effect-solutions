"use client";

import {
  ArrowLeftIcon,
  BookOpenIcon,
  SpeakerSimpleHighIcon,
  SpeakerSimpleSlashIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FocusEvent, useCallback, useState } from "react";
import { useLessonSfxHandlers } from "@/lib/useLessonNavSfx";
import { useSoundSettings } from "@/lib/useSoundSettings";
import VerticalCutReveal from "./VerticalCutReveal";

interface ReferenceHeaderProps {
  referenceTitles: Record<string, string>;
}

const iconAnimationConfig = {
  initial: {
    opacity: 0,
    x: 20,
    scale: 0.5,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: {
    opacity: 0,
    x: -20,
    scale: 0.5,
    filter: "blur(4px)",
  },
  transition: { type: "spring" as const, visualDuration: 0.2, bounce: 0 },
};

export function ReferenceHeader({ referenceTitles }: ReferenceHeaderProps) {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [hoverAnimationId, setHoverAnimationId] = useState(0);
  const {
    handleHover: playHoverSfx,
    handleClick: playClickSfx,
    handleFocusVisible,
  } = useLessonSfxHandlers();
  const { isMuted, toggleMute } = useSoundSettings();

  const updateHoverState = useCallback(
    (nextHovered: boolean) => {
      setIsHovered((previous) => {
        if (previous === nextHovered) {
          return previous;
        }
        setHoverAnimationId((id) => id + 1);
        return nextHovered;
      });
    },
    [setHoverAnimationId, setIsHovered],
  );

  const handleMouseEnter = useCallback(() => {
    updateHoverState(true);
    playHoverSfx();
  }, [playHoverSfx, updateHoverState]);

  const handleMouseLeave = useCallback(() => {
    updateHoverState(false);
  }, [updateHoverState]);

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLAnchorElement>) => {
      updateHoverState(true);
      if (event.currentTarget.matches(":focus-visible")) {
        handleFocusVisible();
      }
    },
    [handleFocusVisible, updateHoverState],
  );

  const handleBlur = useCallback(() => {
    updateHoverState(false);
  }, [updateHoverState]);

  const handleClick = useCallback(() => {
    playClickSfx();
  }, [playClickSfx]);

  const handleMuteButtonHover = useCallback(() => {
    playHoverSfx();
  }, [playHoverSfx]);

  let displayTitle = "EFFECT BEST PRACTICES";

  const isReferencesPage = pathname === "/references";

  if (pathname.startsWith("/references/")) {
    const slug = pathname.split("/references/")[1];
    if (slug && slug !== "") {
      const referenceTitle = referenceTitles[slug];
      if (referenceTitle) {
        displayTitle = referenceTitle;
      }
    }
  }

  const iconKey = `${
    isHovered && !isReferencesPage ? "arrow" : "book"
  }-${hoverAnimationId}`;

  return (
    <header className="border-b border-neutral-800 h-16">
      <div className="max-w-screen-md mx-auto border-x border-neutral-800 flex items-center justify-between h-full">
        <Link
          href="/references"
          className="flex-1 cursor-default"
          onBlur={handleBlur}
          onClick={handleClick}
          onFocus={handleFocus}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center px-6 py-6 hover:bg-neutral-900/50">
            <div className="flex items-center text-sm font-normal uppercase tracking-wider">
              <div className="relative w-5 h-5">
                <AnimatePresence mode="popLayout" initial={false}>
                  {isHovered && !isReferencesPage ? (
                    <motion.div
                      key={iconKey}
                      className="absolute inset-0"
                      style={{ willChange: "transform, opacity, filter" }}
                      {...iconAnimationConfig}
                    >
                      <ArrowLeftIcon
                        aria-hidden="true"
                        className="h-5 w-5"
                        weight="bold"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={iconKey}
                      className="absolute inset-0"
                      style={{ willChange: "transform, opacity, filter" }}
                      {...iconAnimationConfig}
                    >
                      <BookOpenIcon
                        aria-hidden="true"
                        className="h-5 w-5"
                        weight="fill"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence mode="popLayout" initial={false}>
                <div className="ml-3" key={displayTitle}>
                  <VerticalCutReveal
                    splitBy="characters"
                    staggerDuration={0.025}
                    staggerFrom="first"
                    transition={{
                      type: "spring",
                      stiffness: 190,
                      damping: 22,
                    }}
                  >
                    {displayTitle}
                  </VerticalCutReveal>
                </div>
              </AnimatePresence>
            </div>
          </div>
        </Link>
        <button
          type="button"
          onClick={toggleMute}
          onMouseEnter={handleMuteButtonHover}
          className="flex items-center justify-center h-16 w-16 py-6 border-l border-neutral-800 hover:bg-neutral-900/50"
          aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
        >
          {isMuted ? (
            <SpeakerSimpleSlashIcon className="h-4 w-4" weight="regular" />
          ) : (
            <SpeakerSimpleHighIcon className="h-4 w-4" weight="regular" />
          )}
        </button>
      </div>
    </header>
  );
}
