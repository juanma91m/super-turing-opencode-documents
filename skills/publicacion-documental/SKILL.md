---
name: publicacion-documental
description: Usa esta skill para crear informes, trabajos prácticos, documentos académicos o profesionales y entregables PDF, DOCX u ODT con maquetación, plantillas y revisión visual final.
---

# Publicación documental

## Objetivo

Convertir contenido correcto en un artefacto editorial terminado, no limitarse
a devolver Markdown o recomendaciones de formato.

## Modelo de trabajo

1. Confirmar audiencia, tipo de documento, formato exigido y datos de portada.
2. Elegir la plantilla más cercana sin inventar una identidad visual nueva.
3. Crear una carpeta de trabajo explícita y copiar allí la plantilla completa.
4. Redactar el contenido en el `template.qmd` copiado, conservando su metadata.
   Si necesita flujos, procesos o arquitecturas, aplicar también la skill
   `diagramacion-tecnica` y generar assets reproducibles antes de publicar.
5. Tratar el PDF como artefacto canónico salvo requisito explícito distinto.
6. Publicar mediante el wrapper aprobado.
7. Leer las imágenes de QA de todas las páginas del PDF y de los editables
   solicitados cuando estén disponibles.
8. Corregir y volver a publicar si hay defectos.
9. Entregar artefacto final, fuente y formatos editables solicitados.

## Plantillas disponibles

- `~/.config/opencode/documents/templates/trabajo-practico/`
- `~/.config/opencode/documents/templates/informe-profesional/`

Copiar el directorio completo porque `template.qmd` referencia `style.typ`.

## Publicación aprobada

```bash
python3 ~/.config/opencode/scripts/publish_document.py \
  --source /ruta/al/documento.qmd \
  --output-dir /ruta/a/entrega \
  --editable none
```

Valores de `--editable`: `none`, `docx`, `odt`, `both`.

El wrapper aplica automáticamente el `reference.odt` institucional y el filtro
de saltos portables. Para forzar un salto de página desde el QMD, usar:

````markdown
```{=tex}
\newpage
```
````

No usar bloques raw Typst para este fin: funcionarían en el PDF pero se
perderían en ODT/DOCX. No corregir el ODT manualmente como sustituto del QMD;
corregir la fuente y regenerar todos los artefactos.

## Criterios editoriales

- usar jerarquía semántica de títulos, no tamaño manual como sustituto;
- portada sobria con título, autor, institución y fecha cuando correspondan;
- índice solo cuando la extensión lo justifique;
- párrafos legibles, sin bloques artificialmente largos;
- tablas con encabezados claros y ancho razonable;
- figuras con título, fuente y texto alternativo;
- diagramas con fuente `.d2` conservada y asset generado, nunca como captura
  manual sin procedencia;
- numeración y referencias cruzadas consistentes;
- evitar emojis, adornos arbitrarios y colores sin función;
- usar español correcto y mantener el registro pedido por el usuario;
- no inventar bibliografía, citas, resultados ni datos personales faltantes.

## Quality gate obligatorio

La compilación exitosa no alcanza. Antes de cerrar:

- verificar que el PDF exista y no esté vacío;
- inspeccionar todas las imágenes bajo `qa/`;
- si se solicitó DOCX u ODT, inspeccionar también `qa-editable/<formato>/pages/`;
- buscar texto cortado, tablas desbordadas, imágenes borrosas, páginas vacías,
  encabezados huérfanos, saltos incómodos y densidad visual irregular;
- confirmar que portada, índice, numeración y bibliografía sean coherentes;
- corregir el fuente y volver a renderizar cuando haya defectos materiales.

Si no se pudo hacer QA visual, declararlo explícitamente; no afirmar que el
documento está listo para entregar.

La revisión del editable busca legibilidad, saltos, tablas, figuras y jerarquía
correctas. No exige paridad píxel a píxel con Typst: el PDF sigue siendo el
artefacto canónico.

## Entrega esperada

- PDF final;
- fuente `.qmd` y assets necesarios para reproducirlo;
- DOCX u ODT solo cuando se soliciten;
- nota breve de validación realizada y cualquier limitación real.
