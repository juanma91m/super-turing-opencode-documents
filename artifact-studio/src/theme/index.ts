export interface Theme {
  id: "executive-light" | "executive-dark" | "technical-light";
  colors: { background: string; surface: string; text: string; muted: string; accent: string; accentSoft: string; positive: string; warning: string; risk: string; border: string };
  typography: { sans: string; serif: string; mono: string; titlePt: number; headingPt: number; bodyPt: number; captionPt: number };
  spacing: readonly number[]; radii: { sm: number; md: number }; borders: { thin: number; medium: number };
  chartPalette: readonly string[]; page: { widthMm: number; heightMm: number; marginMm: number }; slide: { widthIn: number; heightIn: number; marginIn: number; safeIn: number };
  tables: { headerFill: string; alternateFill: string }; callouts: Record<"info" | "success" | "warning" | "risk", string>;
}

const base = { typography: { sans: "IBM Plex Sans", serif: "IBM Plex Serif", mono: "IBM Plex Mono", titlePt: 34, headingPt: 24, bodyPt: 18, captionPt: 11 }, spacing: [0, 4, 8, 12, 16, 24, 32, 48] as const, radii: { sm: 2, md: 4 }, borders: { thin: 0.5, medium: 1 }, page: { widthMm: 210, heightMm: 297, marginMm: 20 }, slide: { widthIn: 13.333, heightIn: 7.5, marginIn: 0.65, safeIn: 0.2 } };
export const themes: Record<Theme["id"], Theme> = {
  "executive-light": { ...base, id: "executive-light", colors: { background: "F7F8FA", surface: "FFFFFF", text: "172033", muted: "5E6878", accent: "185ABD", accentSoft: "E8F0FB", positive: "217A55", warning: "9A6700", risk: "B42318", border: "D9DEE7" }, chartPalette: ["185ABD", "5B8DEF", "217A55", "C67C00", "7A5AF8", "B42318"], tables: { headerFill: "E8F0FB", alternateFill: "F7F8FA" }, callouts: { info: "E8F0FB", success: "E9F6EF", warning: "FFF4D6", risk: "FDECEC" } },
  "executive-dark": { ...base, id: "executive-dark", colors: { background: "111827", surface: "1F2937", text: "F8FAFC", muted: "CBD5E1", accent: "60A5FA", accentSoft: "1E3A5F", positive: "5EE0A0", warning: "F5C451", risk: "FB7185", border: "475569" }, chartPalette: ["60A5FA", "5EE0A0", "F5C451", "A78BFA", "FB7185", "94A3B8"], tables: { headerFill: "1E3A5F", alternateFill: "1F2937" }, callouts: { info: "1E3A5F", success: "163A2B", warning: "443510", risk: "4A1D27" } },
  "technical-light": { ...base, id: "technical-light", colors: { background: "F8FAFC", surface: "FFFFFF", text: "102A43", muted: "52667A", accent: "007C91", accentSoft: "DFF4F6", positive: "147D64", warning: "A45C00", risk: "B42318", border: "CBD5E1" }, chartPalette: ["007C91", "2563EB", "147D64", "A45C00", "6D4AFF", "B42318"], tables: { headerFill: "DFF4F6", alternateFill: "F1F5F9" }, callouts: { info: "DFF4F6", success: "E4F5EF", warning: "FFF3DD", risk: "FDECEC" } }
};
export function resolveTheme(id: string): Theme { const theme = themes[id as Theme["id"]]; if (!theme) throw new Error(`Unknown theme: ${id}`); return theme; }
