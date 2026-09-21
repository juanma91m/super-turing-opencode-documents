---
name: diagram-design
description: Use when converting architecture, infrastructure, process, sequence, dependency or cross-service flow information into a reproducible diagram.
---
# Diagram design

Use D2 as the primary renderer for conventional node/edge diagrams and SVG as the canonical output. Use a semantic `ServiceFlowSpec` plus `artifact-service-flow` when the explanation needs numbered narrative cards arranged in service lanes; the spec contains lanes, components, ordered steps, optional code snippets and connector preference, never canvas coordinates. Keep nodes concise, group related components, minimize crossings and move nonessential prose outside the diagram. Graphviz is a secondary option for dense graphs; Mermaid is interoperability fallback only.
