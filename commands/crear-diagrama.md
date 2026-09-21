---
description: Crea un diagrama técnico reproducible para documentos, procesos o arquitecturas.
---

Creá un diagrama a partir de: `$ARGUMENTS`.

Aplicá la skill `diagramacion-tecnica`. Confirmá solo lo que falte para decidir
el tipo de diagrama, audiencia, nivel de detalle y si se necesita perfil claro
para documento, lámina oscura, infografía `neon-blueprint`, flujo numerado por
servicios o secuencia técnica narrada. Elegí la plantilla más cercana, copiá su directorio a una carpeta de
trabajo explícita y conservá la fuente semántica.

Renderizá mediante `~/.config/opencode/scripts/render_diagram.py`. Revisá el
SVG/PNG y, si será parte de un documento, insertalo con título y texto
alternativo, publicá el documento completo y verificá las páginas de QA.

Para `infografia-neon`, renderizá primero `diagram.png` y después ejecutá
`~/.config/opencode/scripts/render_infographic.py` sobre `infographic.typ`.

No entregues únicamente una captura ni edites a mano el asset generado.

Para un flujo numerado por columnas, usá la plantilla `flujo-servicios`, editá
su `spec.json` sin agregar coordenadas y renderizá con `artifact-service-flow`
cuando estés operando como `documenter`; el SVG es canónico y el PDF alto sirve
para entregar el flujo completo sin reducir la tipografía.

Para una secuencia extensa con lifelines y anotaciones por paso, usá
`secuencia-narrada/spec.json` y renderizá con `artifact-narrated-sequence`.
