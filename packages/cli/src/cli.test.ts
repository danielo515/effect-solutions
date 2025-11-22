import { describe, expect, test } from "bun:test";
import { renderDocList, renderDocs } from "./cli";
import { DOCS } from "./docs-manifest";
import {
  getCollectLog,
  openIssue,
  resetCollectLog,
} from "./open-issue-service";

describe("effect-solutions CLI docs", () => {
  test("list output includes all docs", () => {
    const listOutput = renderDocList();
    for (const doc of DOCS) {
      expect(listOutput).toContain(doc.slug);
      expect(listOutput).toContain(doc.title);
      if (doc.description) {
        expect(listOutput).toContain(doc.description);
      }
    }
  });

  test("show renders multiple docs in order", () => {
    const firstTwo = DOCS.slice(0, 2);
    const slugs = firstTwo.map((doc) => doc.slug);
    const output = renderDocs(slugs);
    const firstSlug = slugs[0];
    const secondSlug = slugs[1];
    if (!firstSlug || !secondSlug) {
      throw new Error("Expected at least 2 docs");
    }
    expect(output.indexOf(firstSlug)).toBeLessThan(output.indexOf(secondSlug));
    expect(output).toContain(`(${firstSlug})`);
    expect(output).toContain(`(${secondSlug})`);
    expect(output).toContain("---");
  });

  test("show rejects unknown doc slugs", () => {
    expect(() => renderDocs(["unknown-doc"])).toThrowError(/Unknown doc slug/);
  });

  test("open issue uses collect strategy and logs url", () => {
    resetCollectLog();
    const result = openIssue({
      category: "Fix",
      title: "Broken link",
      description: "Example body",
      strategy: "collect",
    });

    expect(result.issueUrl).toContain(
      "https://github.com/kitlangton/effect-solutions/issues/new",
    );
    expect(result.openedWith).toBe("collect");
    expect(result.opened).toBe(true);

    const log = getCollectLog();
    expect(log.length).toBe(1);
    expect(log[0]).toBe(result.issueUrl);
  });
});
