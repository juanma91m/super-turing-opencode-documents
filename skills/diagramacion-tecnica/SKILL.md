---
name: diagramacion-tecnica
description: Usa esta skill para crear diagramas de flujo, procesos, secuencias, arquitecturas de software e infografías técnicas reproducibles para PDF, DOCX u ODT.
---

# Diagramación técnica

## Objetivo

Convertir una explicación estructurada en un diagrama legible, reproducible y
apto para publicación, conservando la fuente textual junto al documento.

## Decisión de herramienta

- usar **D2** para flujos, procesos, dependencias y arquitecturas que deban
  funcionar igual en PDF, DOCX y ODT;
- aceptar Mermaid para borradores o documentos solo PDF/HTML, pero preferir un
  asset D2 pre-renderizado cuando se entregue un editable;
- usar Graphviz solo para grafos densos donde su algoritmo aporte una ventaja;
- usar una composición Typst/SVG adicional para láminas con tarjetas, métricas
  y narrativa: un diagrama por sí solo no reemplaza una infografía editorial.

No usar capturas manuales de editores como fuente canónica.

## Plantillas

- `~/.config/opencode/documents/diagrams/templates/flujo-proceso/`
- `~/.config/opencode/documents/diagrams/templates/secuencia/`
- `~/.config/opencode/documents/diagrams/templates/arquitectura-poster/`

Copiar la plantilla elegida a `assets/diagrams/<nombre>/`, editar `diagram.d2`
y conservar ese archivo junto a los resultados.

## Render aprobado

Documento claro:

```bash
python3 ~/.config/opencode/scripts/render_diagram.py \
  --source assets/diagrams/proceso/diagram.d2 \
  --output-dir assets/generated \
  --name proceso \
  --profile document-light \
  --format both
```

Lámina técnica oscura:

```bash
python3 ~/.config/opencode/scripts/render_diagram.py \
  --source assets/diagrams/arquitectura/diagram.d2 \
  --output-dir assets/generated \
  --name arquitectura \
  --profile poster-dark \
  --format both
```

El SVG es el asset generado canónico y vectorial. PNG es complementario y
requiere Chrome, Chromium o Chrome Headless Shell. Para un documento solo PDF,
insertar SVG. Si se entrega DOCX u ODT, generar `--format both` e insertar el
PNG: LibreOffice puede interpretar de forma incompleta algunos estilos CSS de
los SVG producidos por D2, especialmente fondos de formas y temas.

## Inserción en QMD

```markdown
![Flujo de validación de solicitudes.](assets/generated/proceso.png){#fig-proceso fig-alt="El proceso valida los datos y solicita una corrección cuando están incompletos." width=95%}
```

Mantener título, texto alternativo y referencia cruzada. No repetir en el texto
cada etiqueta del dibujo: explicar su propósito, decisiones y excepciones.

## Criterios visuales

- una dirección de lectura dominante;
- entre cinco y nueve nodos principales por vista;
- verbos para actividades y sustantivos para componentes;
- decisiones expresadas como preguntas;
- colores con función consistente, no decorativa;
- contraste suficiente y texto legible al ancho real de la página;
- separar una arquitectura compleja en vistas de contexto, contenedores o flujo;
- usar `document-light` dentro de A4 y reservar `poster-dark` para láminas o
  figuras donde el fondo oscuro tenga una función editorial clara.

## Quality gate

1. Renderizar desde la fuente D2, nunca editar el SVG generado a mano.
2. Abrir el SVG o PNG y revisar conexiones, etiquetas, cortes y contraste.
3. Publicar el documento completo.
4. Revisar el diagrama en todas las páginas de QA del PDF y del editable.
5. Corregir `diagram.d2`, regenerar y volver a publicar.

Si un SVG se ve correcto en Typst pero cambia colores o rellenos en LibreOffice,
no retocar el ODT: reemplazar la referencia del QMD por el PNG generado.
