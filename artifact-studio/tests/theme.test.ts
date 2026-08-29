import { describe, expect, it } from "vitest";
import { resolveTheme } from "../src/theme/index.js";
describe("themes", () => { it("uses executive-light by identifier", () => expect(resolveTheme("executive-light").colors.accent).toBe("185ABD")); it("rejects unknown themes", () => expect(() => resolveTheme("rainbow")).toThrow()); });
