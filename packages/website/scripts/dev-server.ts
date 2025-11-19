import path from "node:path";

type ManagedProcess = {
  name: string;
  process: Bun.Subprocess;
};

const projectRoot = path.resolve(import.meta.dir, "..");

function startProcess(command: string[], name: string): ManagedProcess {
  const child = Bun.spawn(command, {
    cwd: projectRoot,
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });

  return { name, process: child };
}

const processes: ManagedProcess[] = [
  startProcess(["bun", "x", "next", "dev"], "next"),
  startProcess(["bun", "./scripts/content-watcher.ts"], "watcher"),
];

let shuttingDown = false;

async function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  for (const { process } of processes) {
    if (process.exitCode === null) {
      process.kill("SIGTERM");
    }
  }

  await Promise.allSettled(processes.map(({ process }) => process.exited));
  process.exit(exitCode);
}

const signals = ["SIGINT", "SIGTERM"] as const;
for (const signal of signals) {
  process.on(signal, () => {
    void shutdown(0);
  });
}

const firstExit = await Promise.race(
  processes.map(async ({ name, process }) => ({
    name,
    code: await process.exited,
  })),
);

if (firstExit.code !== 0) {
  console.error(
    `[dev-server] ${firstExit.name} exited unexpectedly with code ${firstExit.code}`,
  );
}

await shutdown(firstExit.code ?? 0);
