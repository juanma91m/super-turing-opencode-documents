import { describe, expect, it } from "vitest";
import { parseDocumentSpec } from "../src/spec/index.js";
describe("DocumentSpec", () => { it("rejects fabricated source references", () => expect(() => parseDocumentSpec({ version: "1.0", meta: { title: "X" }, sections: [{ title: "S", blocks: [{ type: "chart", chart: { kind: "bar", title: "C", sourceId: "missing", series: [{ name: "A", values: [{ category: "x", value: 1 }] }] } }] }] })).toThrow(/Unknown sourceId/)); });
