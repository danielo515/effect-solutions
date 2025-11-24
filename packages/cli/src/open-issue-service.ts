import { spawn } from "bun";

export type OpenIssueCategory = "Topic Request" | "Fix" | "Improvement";

export type BrowserOpenStrategy = "system" | "stub" | "collect" | "noop";

export type OpenIssueInput = {
  category?: OpenIssueCategory;
  title?: string;
  description?: string;
  strategy?: BrowserOpenStrategy;
};

export type OpenIssueResult = {
  issueUrl: string;
  message: string;
  opened: boolean;
  openedWith: string;
};

// In-memory log used for tests when strategy === "collect"
const collectLog: string[] = [];

export const resetCollectLog = () => {
  collectLog.length = 0;
};

export const getCollectLog = () => [...collectLog];

const openInBrowser = (
  url: string,
  strategy: BrowserOpenStrategy,
): { opened: boolean; openedWith: string } => {
  if (strategy === "stub") {
    return { opened: true, openedWith: "stub" };
  }

  if (strategy === "collect") {
    collectLog.push(url);
    return { opened: true, openedWith: "collect" };
  }

  if (strategy === "noop") {
    return { opened: false, openedWith: "noop" };
  }

  const platform = process.platform;
  let command: string[] | null = null;

  if (platform === "darwin") {
    command = ["open", url];
  } else if (platform === "win32") {
    command = ["cmd", "/c", "start", "", url];
  } else {
    command = ["xdg-open", url];
  }

  try {
    const child = spawn(command, {
      stdout: "ignore",
      stderr: "ignore",
    });
    void child.exited;
    return { opened: true, openedWith: "system" };
  } catch {
    return { opened: false, openedWith: "system" };
  }
};

export const openIssue = ({
  category,
  title,
  description,
  strategy,
}: OpenIssueInput): OpenIssueResult => {
  const repoUrl = "https://github.com/kitlangton/effect-solutions";

  // If no args provided, just open to the new issue page
  if (!category && !title && !description) {
    const issueUrl = `${repoUrl}/issues/new`;
    const resolvedStrategy =
      strategy ||
      (process.env.EFFECT_SOLUTIONS_OPEN_STRATEGY as BrowserOpenStrategy) ||
      "system";

    const openResult = openInBrowser(issueUrl, resolvedStrategy);

    return {
      issueUrl,
      opened: openResult.opened,
      openedWith: openResult.openedWith,
      message: openResult.opened
        ? `Opened GitHub new issue page in browser (${openResult.openedWith}): ${issueUrl}`
        : `Generated GitHub new issue page URL (browser not opened: ${openResult.openedWith}): ${issueUrl}`,
    };
  }

  const fullTitle = category && title ? `[${category}] ${title}` : title || "";
  const body = description
    ? `## Description\n\n${description}\n\n---\n*Created via [Effect Solutions CLI](${repoUrl})*`
    : `---\n*Created via [Effect Solutions CLI](${repoUrl})*`;

  const params = new URLSearchParams();
  if (fullTitle) params.set("title", fullTitle);
  if (body) params.set("body", body);

  const issueUrl = `${repoUrl}/issues/new?${params.toString()}`;

  const resolvedStrategy =
    strategy ||
    (process.env.EFFECT_SOLUTIONS_OPEN_STRATEGY as BrowserOpenStrategy) ||
    "system";

  const openResult = openInBrowser(issueUrl, resolvedStrategy);

  return {
    issueUrl,
    opened: openResult.opened,
    openedWith: openResult.openedWith,
    message: openResult.opened
      ? `Opened GitHub issue in browser (${openResult.openedWith}): ${issueUrl}`
      : `Generated GitHub issue URL (browser not opened: ${openResult.openedWith}): ${issueUrl}`,
  };
};
