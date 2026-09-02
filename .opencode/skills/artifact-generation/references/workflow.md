# Standard workflow

1. Identify purpose, audience, confidentiality, organizational or academic context, and requested formats.
2. Retrieve durable user preferences when available. Apply only preferences whose scope matches the current context; never transfer a work brand into academic or unrelated material. If context is ambiguous and identity would materially change, ask instead of guessing.
3. For organizational work, resolve any approved brand profile and private template asset from durable memory. Keep only criteria, identifiers, local paths, checksums and usage constraints in memory; keep binary assets in private machine-local storage outside Git. Verify existence and checksum when recorded, and never copy a private asset into this generic addon or a project repository.
4. Select the closest approved template, form pattern and brand tokens. Treat preferences as a starting hypothesis, not permission to bypass source assets or explicit brand guidance. If no output format is specified for a distributable document, default to editable DOCX plus PDF.
5. Interpret “brief” and “concise” as removing information that does not serve the audience or purpose. Do not infer a fixed page count unless the prompt or context supplies one.
6. Build a conclusion-led storyline and `DocumentSpec`.
7. Validate sources, assets and schema.
8. Generate chart/diagram assets.
9. Render with local Typst, PptxGenJS and/or docx.js.
10. Run structural checks and generate previews.
11. Inspect every page/slide using `visual-qa`; compare requested formats for hierarchy, density and semantic parity rather than pixel identity.
12. Apply layout/content-structure fixes without changing facts.
13. Repeat at most three times and report any remaining issue.
14. Publish under `artifact-studio/artifacts/output/`.
