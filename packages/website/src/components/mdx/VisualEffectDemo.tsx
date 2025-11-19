import { codeToHtml } from "shiki";
import { CalloutAlignedHtml } from "./CalloutAlignedHtml";
import { VisualEffectRunner } from "./VisualEffectRunner";

export async function VisualEffectDemo() {
  const code = `Effect.gen(function* () {
  yield* Effect.sleep("1 second");
  return "Success!";
})`;

  // Server-side syntax highlighting
  const html = await codeToHtml(code.trim(), {
    lang: "typescript",
    theme: "github-dark-default",
  });
  const sanitizedHtml = html
    .replace(/background-color:[^;"]*;?/gi, "")
    .replace(/\s*tabindex="[^"]*"/gi, ""); // remove focusability from generated pre

  return (
    <div className="not-prose flex flex-col items-center border-y border-neutral-800 bg-neutral-950">
      <VisualEffectRunner
        name="Simple Effect"
        description="Runs for 1 second then completes"
      />
      <div className="w-full bg-neutral-800 h-px" />
      <CalloutAlignedHtml html={sanitizedHtml} className="w-full" />
    </div>
  );
}
