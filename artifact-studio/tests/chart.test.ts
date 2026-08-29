import { describe, expect, it } from "vitest";
import { recommendChart } from "../src/charts/index.js";
describe("chart selection", () => { it("replaces crowded pie charts with bars", () => expect(recommendChart("pie", 7)).toBe("bar")); it("keeps meaningful small pie charts", () => expect(recommendChart("pie", 4)).toBe("pie")); });
