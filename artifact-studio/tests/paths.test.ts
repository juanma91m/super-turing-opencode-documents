import { describe, expect, it } from "vitest";
import { resolveInside } from "../src/core/paths.js";

describe("path containment", () => {
  it("accepts descendants when the allowed root is the filesystem root", () => {
    expect(resolveInside("/", "/home/example")).toBe("/home/example");
  });

  it("rejects traversal outside a scoped project", () => {
    expect(() => resolveInside("/workspace/project", "../secret")).toThrow(/escapes allowed root/);
  });
});
