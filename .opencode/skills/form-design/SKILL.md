---
name: form-design
description: Use when generating or reviewing a fillable form, performance evaluation, worksheet, checklist or structured questionnaire in PDF or DOCX.
---

# Form design

Create restrained, writable forms from semantic `DocumentSpec` blocks. Apply this skill together with `artifact-generation` and the requested format skills.

## Context and identity

- Resolve work, academic, personal or organizational context before choosing colors, logo or page furniture.
- Reuse durable user preferences only when their recorded scope matches the current context.
- Treat a remembered palette as a proposed starting point, not as a universal default or a substitute for current brand assets.
- If identity is ambiguous and materially affects the result, ask one focused question.

## Layout rules

- Prefer concise field labels, blank writable areas and semantic `fieldGrid`, `table` and `ruledLines` blocks; avoid filler such as “Completar” or “Escribir aquí”.
- Use tables only where rows and columns carry real comparison or scoring meaning.
- Keep each section title visually coupled to its divider: the divider belongs to the heading, not to the following content.
- Separate sections more strongly than title and divider; whitespace must reveal grouping without wasting the page.
- Keep handwriting lines compact and regular. Allocate more lines only where the expected answer needs them.
- Keep privacy, retention or handling notices visually secondary and separated from the writing area.
- Use restrained page furniture. Avoid repeating a large document title on later pages; a page number is usually enough for short internal forms.
- Add explicit semantic page breaks when PDF and DOCX otherwise split major sections differently.

## Cross-format QA

- Inspect every PDF and DOCX page.
- Confirm the same labels, row counts, optional markers, page grouping and writing capacity.
- Require comparable hierarchy and density, not pixel-perfect renderer parity.
- Check for duplicated fields, accidental placeholders, cramped callout padding, oversized empty areas and detached dividers.
