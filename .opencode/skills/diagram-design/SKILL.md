---
name: diagram-design
description: Use when converting architecture, infrastructure, process, sequence, dependency or cross-service flow information into a reproducible diagram.
---
# Diagram design

Use D2 as the primary renderer for conventional node/edge diagrams and SVG as the canonical output. Use semantic `ServiceFlowSpec` plus `artifact-service-flow` for numbered narrative cards arranged in service lanes. Use `NarratedSequenceSpec` plus `artifact-narrated-sequence` for temporal interactions that need lifelines, self-actions, persistence, status badges, code blocks and notes. These specs never contain canvas coordinates. Keep nodes concise, group related components, minimize crossings and move nonessential prose outside the diagram. Graphviz is a secondary option for dense graphs; Mermaid is interoperability fallback only.
