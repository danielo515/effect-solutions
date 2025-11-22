"use client";

import { CursorClickIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useLessonNavSfx } from "@/lib/useLessonNavSfx";
import { CTA_BUTTON_BASE_CLASSES } from "./ctaButtonClass";

const CURSOR_CONFIG_B64 =
  "eyJjb21tYW5kIjoiYnVueCIsImFyZ3MiOlsiZWZmZWN0LXNvbHV0aW9ucy1tY3BAbGF0ZXN0Il19";

const CURSOR_INSTALL_URL = `cursor://anysphere.cursor-deeplink/mcp/install?name=Effect%20Solutions&config=${CURSOR_CONFIG_B64}`;

export function CursorInstallButton() {
  const { playHoverTone, playTapTone } = useLessonNavSfx();

  return (
    <motion.a
      layout
      href={CURSOR_INSTALL_URL}
      className={cn(
        CTA_BUTTON_BASE_CLASSES,
        "select-none",
        "active:bg-neutral-800/70",
      )}
      onMouseEnter={playHoverTone}
      onFocus={playHoverTone}
      onClick={playTapTone}
      aria-label="Add Effect Solutions MCP server to Cursor"
    >
      <CursorClickIcon
        size={16}
        weight="bold"
        className="text-neutral-400 shrink-0"
      />
      <span className="whitespace-nowrap">Add To Cursor</span>
    </motion.a>
  );
}
