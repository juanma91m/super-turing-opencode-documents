import { describe, expect, it } from "vitest";
import { validateGeometry } from "../src/qa/structural/geometry.js";
describe("geometry", () => { it("finds overflow and overlap", () => { const issues = validateGeometry([{ id: "a", x: 1, y: 1, w: 3, h: 2 }, { id: "b", x: 2, y: 2, w: 3, h: 2 }, { id: "c", x: 13, y: 1, w: 1, h: 1 }]); expect(issues.map((i) => i.kind)).toEqual(expect.arrayContaining(["OVERLAP", "OUT_OF_BOUNDS"])); }); });
