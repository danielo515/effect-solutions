"use client";

import NumberFlow from "@number-flow/react";

type NumberOdometerProps = {
  readonly value: number;
  readonly className?: string;
};

export function NumberOdometer({ value, className }: NumberOdometerProps) {
  return (
    <NumberFlow
      value={value}
      className={className}
      trend={(oldValue, newValue) =>
        Math.sign(Math.abs(newValue) - Math.abs(oldValue))
      }
    />
  );
}
