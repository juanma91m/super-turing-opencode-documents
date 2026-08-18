---
description: Crea y publica un documento presentable con plantilla, PDF final y revisión visual.
---

Publicá un documento listo para entregar a partir de: `$ARGUMENTS`.

Aplicá la skill `publicacion-documental`. Antes de escribir, confirmá solamente
los datos críticos que falten: tipo de documento, audiencia, datos de portada,
extensión aproximada y si se requiere PDF, DOCX u ODT.

Usá una carpeta de trabajo explícita, copiá la plantilla adecuada completa y
preservá su `style.typ`. Generá el PDF mediante
`~/.config/opencode/scripts/publish_document.py`, inspeccioná visualmente todas
las páginas de QA del PDF y de cada editable solicitado. Corregí siempre el QMD
y regenerá; no conviertas el ODT o DOCX en una fuente maestra paralela.

No cierres con un borrador Markdown si el usuario pidió un artefacto final. No
inventes citas, bibliografía, resultados ni datos de portada.
