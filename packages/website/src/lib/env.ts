export type Environment = "production" | "preview" | "development";

function getEnvironment(): Environment {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  return "development";
}

export const env = {
  get current(): Environment {
    return getEnvironment();
  },
  get isProduction(): boolean {
    return getEnvironment() === "production";
  },
  get isPreview(): boolean {
    return getEnvironment() === "preview";
  },
  get isDevelopment(): boolean {
    return getEnvironment() === "development";
  },
} as const;
