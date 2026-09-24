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
- `~/.config/opencode/documents/diagrams/templates/secuencia-narrada/`
- `~/.config/opencode/documents/diagrams/templates/flujo-servicios/`
- `~/.config/opencode/documents/diagrams/templates/arquitectura-poster/`
- `~/.config/opencode/documents/diagrams/templates/infografia-neon/`

Copiar la plantilla elegida a `assets/diagrams/<nombre>/` y conservar la fuente
junto a los resultados. Las plantillas D2 usan `diagram.d2`; `flujo-servicios`
usa un `ServiceFlowSpec` en `spec.json`, sin coordenadas de renderer.
`secuencia-narrada` usa un `NarratedSequenceSpec` con participantes y pasos.

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

Infografía técnica `neon-blueprint`:

```bash
python3 ~/.config/opencode/scripts/render_diagram.py \
  --source diagram.d2 \
  --output-dir . \
  --name diagram \
  --profile neon-blueprint \
  --format both

python3 ~/.config/opencode/scripts/render_infographic.py \
  --source infographic.typ \
  --output-dir output \
  --name infografia-neon \
  --format both
```

La plantilla neon es 16:9 y combina un diagrama D2 con título, tarjetas,
controles e indicadores compuestos en Typst. Editar los textos en
`infographic.typ`; no rasterizar texto con un generador de imágenes.

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
- usar `neon-blueprint` para una infografía técnica completa, no como estilo
  predeterminado de cada figura de un informe.

## Flujo numerado entre servicios

Usar `flujo-servicios` cuando el relato avance por columnas de sistemas o
servicios y cada paso necesite una tarjeta numerada, texto narrativo y un bloque
técnico opcional. Definir en `spec.json`:

- `lanes`: servicios y componentes internos visibles en el encabezado;
- `steps`: secuencia ordenada, carril, actor, explicación y `code` opcional;
- `connectors`: `true` para flechas o `false` cuando la numeración sea suficiente.

Desde Artifact Studio:

```bash
corepack pnpm --dir ~/.local/src/super-turing-opencode-documents/artifact-studio \
  artifact service-flow assets/diagrams/flujo/spec.json \
  --output assets/generated \
  --name flujo-servicios \
  --format all
```

El renderer genera siempre SVG canónico, además de PNG y un PDF de página alta
cuando se pide `all`. Para insertar un flujo muy extenso en un informe, preferir
el PDF independiente o dividirlo en fases antes que reducirlo hasta volver
ilegible el texto.

## Secuencia técnica narrada

Usar `secuencia-narrada` cuando una interacción temporal necesite lifelines,
mensajes entre participantes, procesamiento interno, persistencia, estados como
`EXISTENTE` o `NUEVO`, bloques técnicos y notas. Definir participantes y pasos
en `spec.json`; el renderer decide toda la geometría.

```bash
corepack pnpm --dir ~/.local/src/super-turing-opencode-documents/artifact-studio \
  artifact narrated-sequence assets/diagrams/secuencia/spec.json \
  --output assets/generated \
  --name secuencia-narrada \
  --format all
```

## Quality gate

1. Renderizar desde la fuente D2, `ServiceFlowSpec` o `NarratedSequenceSpec`; nunca editar el SVG generado a mano.
2. Para los specs semánticos, exigir que el receipt JSON reporte todos los checks aprobados y conservar sus hashes de fuente/artefactos.
3. Verificar el conjunto comprometido con `artifact-verify-receipt`; incluir el `spec.json` original cuando el receipt use `source-bytes`.
4. Ejecutar `artifact-validate` sobre el SVG canónico para medir texto, canvas y grupos semánticos con Chrome/Chromium cuando esté disponible; si no hay navegador, registrar el check como omitido.
5. Si la entrega o verificación falla, seguir `subject`, `evidence` y `supportedFixes`; el target anterior puede ser el último resultado válido y no demuestra que el candidato rechazado haya pasado.
6. Abrir el SVG o PNG y revisar conexiones, etiquetas, cortes y contraste. El receipt y la geometría de navegador no sustituyen esta revisión perceptual.
7. Publicar el documento completo.
8. Revisar el diagrama en todas las páginas de QA del PDF y del editable.
9. Corregir `diagram.d2` o `spec.json`, regenerar y volver a publicar.

Si un SVG se ve correcto en Typst pero cambia colores o rellenos en LibreOffice,
no retocar el ODT: reemplazar la referencia del QMD por el PNG generado.
