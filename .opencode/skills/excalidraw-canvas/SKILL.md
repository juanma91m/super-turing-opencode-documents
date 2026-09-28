---
name: excalidraw-canvas
description: Use when creating or refining an editable Excalidraw architecture, flowchart or visual canvas with live browser feedback and a project-scoped .excalidraw source.
---

# Excalidraw live canvas

Use `excalidraw-canvas` for exploratory, manually editable diagrams. Keep D2,
`ServiceFlowSpec` and `NarratedSequenceSpec` as the preferred sources for
deterministic publication workflows.

## Workflow

1. Call `excalidraw-canvas` with `action=start` and ask the user to open
   `http://127.0.0.1:3000` when visual operations are needed.
2. Inspect an existing scene with `describe` or `query`. Do not clear it unless
   the request requires a fresh canvas; save a named snapshot before risky edits
   and pass `confirmClear=true` only after making that decision explicit.
3. Plan coordinates before creating elements. Prefer one dominant reading
   direction, 40–60 px sibling gaps and 80–120 px between tiers.
4. Add a coherent batch using agent-friendly JSON: shape labels use `text` and
   arrows bind with `startElementId` / `endElementId`.
5. Take a PNG or SVG screenshot into a project path, inspect it, and correct
   truncation, overlap, crossings, contrast and spacing. Repeat until legible.
6. Export the editable source to a project-scoped `.excalidraw` file before
   declaring completion. Export an SVG or PNG companion when requested.

## Safety and persistence

- The service is intentionally bound to `127.0.0.1:3000`; do not expose it on
  `0.0.0.0` or another interface.
- The working scene and snapshots are in memory. They are not durable until an
  `.excalidraw` or `.excalidraw.md` file is exported.
- All import, export and screenshot paths must stay inside the active project.
- No share/upload operation is exposed. Do not send organizational diagrams to
  an external service without explicit authorization.
- Browser-backed screenshots and SVG/PNG export require the canvas tab to
  remain open.
- Do not import untrusted `.excalidraw` files. Mermaid conversion and external
  share are intentionally not exposed by the approved tool.

## Minimal element example

```json
[
  {"id":"api","type":"rectangle","x":100,"y":100,"width":180,"height":70,"text":"API","fillStyle":"solid","backgroundColor":"#a5d8ff"},
  {"id":"db","type":"rectangle","x":420,"y":100,"width":180,"height":70,"text":"PostgreSQL","fillStyle":"solid","backgroundColor":"#b2f2bb"},
  {"type":"arrow","x":0,"y":0,"startElementId":"api","endElementId":"db","text":"SQL"}
]
```

Use stable element ids so later `update`, `delete` and bound-arrow adjustments
remain targeted and auditable.
