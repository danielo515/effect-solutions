"use client";

import { useSyncExternalStore } from "react";
import type { VisualEffect } from "./VisualEffect";

// Granular React hooks for better performance

// Subscribe only to state changes
export function useVisualEffectState<A, E>(effect: VisualEffect<A, E>) {
  return useSyncExternalStore(
    effect.subscribe.bind(effect),
    () => effect.state,
    () => effect.state,
  );
}

// Subscribe only to notification changes
export function useVisualEffectNotification<A, E>(effect: VisualEffect<A, E>) {
  return useSyncExternalStore(
    effect.subscribeToNotifications.bind(effect),
    () => effect.getCurrentNotification(),
    () => effect.getCurrentNotification(),
  );
}

// Subscribe for re-renders only (no return value)
export function useVisualEffectSubscription<A, E>(effect: VisualEffect<A, E>) {
  useSyncExternalStore(
    effect.subscribe.bind(effect),
    () => effect.state,
    () => effect.state,
  );
}
