import type { DocumentSpec } from "../spec/index.js";
import type { Theme } from "../theme/index.js";
export interface RenderContext { spec: DocumentSpec; theme: Theme; outputDir: string; basename: string; assets: Map<string, string>; }
export interface ArtifactRenderer { readonly format: "pdf" | "pptx" | "docx"; render(context: RenderContext): Promise<string>; }
