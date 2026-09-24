---
name: diagram-design
description: Use when converting architecture, infrastructure, process, sequence, dependency or cross-service flow information into a reproducible diagram.
---
# Diagram design

Use D2 as the primary renderer for conventional node/edge diagrams and SVG as the canonical output. Use semantic `ServiceFlowSpec` plus `artifact-service-flow` for numbered narrative cards arranged in service lanes. Use `NarratedSequenceSpec` plus `artifact-narrated-sequence` for temporal interactions that need lifelines, self-actions, persistence, status badges, code blocks and notes. These specs never contain canvas coordinates. Keep nodes concise, group related components, minimize crossings and move nonessential prose outside the diagram. Graphviz is a secondary option for dense graphs; Mermaid is interoperability fallback only.

Semantic diagram delivery is atomic. Treat its JSON report as a deterministic receipt: require every check to pass, retain its specification/artifact hashes and verify the committed set with `artifact-verify-receipt`; include the original spec whenever its receipt binds `source-bytes`. Run `artifact-validate` on the canonical SVG to measure text, canvas and semantic-group geometry in Chrome/Chromium when available. Follow only the reported diagnostic `subject`, `evidence` and `supportedFixes`. A failed render or verification preserves the last-good output and must never be reported as success. Receipts and browser geometry do not replace perceptual inspection of the rendered SVG/PNG/PDF.
