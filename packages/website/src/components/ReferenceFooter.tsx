"use client";

import { ArrowLeftIcon, HeartIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLessonSfxHandlers } from "@/lib/useLessonNavSfx";
import { KIT_TWITTER_URL } from "@/constants/urls";

export function ReferenceFooter() {
  const pathname = usePathname();
  const isReferencePage = pathname.startsWith("/references/");
  const { handleHover: playHoverSfx, handleClick: playClickSfx } =
    useLessonSfxHandlers();
  const [isKitHovered, setIsKitHovered] = useState(false);

  return (
    <footer className="border-t border-neutral-800 no-prose h-16">
      <div className="max-w-screen-md mx-auto flex items-center justify-between w-full px-6 border-x border-neutral-800 h-full">
        {isReferencePage ? (
          <Link
            href="/references"
            className="flex items-center gap-3 text-sm font-normal uppercase tracking-wider text-neutral-500  hover:text-neutral-300 no-underline !select-none cursor-default"
            onMouseEnter={playHoverSfx}
            onClick={playClickSfx}
          >
            <ArrowLeftIcon aria-hidden="true" className="h-5 w-5" />
            <span className="!select-none">Back to References</span>
          </Link>
        ) : (
          <div />
        )}
        <Link
          href={KIT_TWITTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-normal uppercase tracking-wider text-neutral-500 hover:text-neutral-300 no-underline !select-none cursor-default"
          onMouseEnter={() => {
            setIsKitHovered(true);
            playHoverSfx();
          }}
          onMouseLeave={() => setIsKitHovered(false)}
          onClick={playClickSfx}
        >
          <motion.div
            animate={{ scale: isKitHovered ? 1.2 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <HeartIcon
              aria-hidden="true"
              className="h-4 w-4 text-red-500"
              weight="fill"
            />
          </motion.div>
          <span className="font-weight-animated !select-none">Kit</span>
        </Link>
      </div>
    </footer>
  );
}
