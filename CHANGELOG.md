# Changelog

## 1.0.6

- Agrega entrega transaccional last-good y receipts SHA-256 para
  `ServiceFlowSpec` y `NarratedSequenceSpec`, con diagnósticos deterministas.
- Incorpora `artifact verify-receipt` y la tool acotada
  `artifact-verify-receipt` para detectar artefactos o specs faltantes,
  modificados, inválidos o reemplazados por symlinks.
- Resuelve los artefactos junto al receipt para mantener portabilidad sin seguir
  rutas externas declaradas por JSON no confiable.
- Extiende `artifact check` a SVG con geometría medida en Chrome/Chromium sobre
  una copia sanitizada: bounds de texto, canvas, grupos semánticos y overlaps;
  el navegador sigue siendo una dependencia opcional.
- Corrige el patrón `qa/` del `.gitignore` para que no oculte el código fuente
  bajo `artifact-studio/src/qa/` y mantenga ignorado solo el QA generado en raíz.
- Agrega cuatro casos end-to-end reproducibles para `documenter`, cada uno con
  spec semántico y prompt de render, receipt, browser QA y revisión perceptual.

## 1.0.5

- Agrega `NarratedSequenceSpec` para secuencias técnicas extensas con lifelines,
  mensajes, self-actions, persistencia, estados, código, advertencias y notas.
- Incorpora `artifact-narrated-sequence` con salidas SVG, PNG y PDF alto, sin
  ampliar permisos de shell ni agregar dependencias externas.
- Suma plantilla, ejemplo, JSON Schema y tests para el nuevo contrato semántico.

## 1.0.4

- Agrega `ServiceFlowSpec`, un modelo semántico sin coordenadas para flujos
  numerados que avanzan entre carriles de servicios o sistemas.
- Incorpora renderer local SVG con PNG de alta resolución y PDF de una página
  alta, incluyendo variante configurable con o sin conectores.
- Expone `artifact-service-flow` únicamente a `documenter` y
  `artifact-renderer`, suma una plantilla reusable y amplía tests y
  documentación sin dependencias externas nuevas.

## 1.0.3

- Oculta globalmente las cuatro tools `artifact-*` y las reabre solo en
  `documenter`, `artifact-renderer` y, para preview/validate, `visual-qa`.
- El lifecycle instala y retira su propia política de visibilidad sin afectar
  tools ajenas del `opencode.json` compuesto, y restaura el valor previo de cada
  tool al desinstalar cuando todavía conserva el valor administrado.
- Un uninstall sin el archivo de estado propio no altera denegaciones definidas
  por el usuario ni asume ownership sobre ellas.

## 1.0.2

- Define resolución contextual de perfiles editoriales y plantillas privadas
  mediante referencias curadas en memoria durable, sin versionar activos
  organizacionales en el addon.
- Usa PDF más DOCX editable como default para documentos distribuibles cuando
  el usuario no solicita formatos concretos.
- Interpreta “breve” como economía de información según propósito y audiencia,
  sin imponer un límite fijo de páginas.

## 1.0.1

- Agrega la skill `form-design` con criterios reutilizables para formularios,
  evaluaciones y checklists editables.
- Incorpora resolución contextual de preferencias visuales: una identidad de
  trabajo no se reutiliza automáticamente en documentos académicos o ajenos.
- Amplía visual QA para revisar densidad de renglones, relación título-divisor,
  separación entre secciones y paridad semántica PDF/DOCX.

## 1.0.0

- Incorpora Artifact Studio: `DocumentSpec` validado con Zod, themes tipados y
  CLI TypeScript independiente de OpenCode.
- Agrega renderers directos Typst/PDF, PptxGenJS/PPTX editable y docx.js/DOCX,
  con adaptadores opcionales y seguros para Docxtemplater y Gamma.
- Integra Vega-Lite/Sharp para gráficos, D2 para diagramas y Lucide para iconos.
- Agrega validación estructural, geometría, previews PNG, contact sheets y
  workflow de visual QA con máximo tres ciclos.
- Agrega golden example PDF/PPTX/DOCX, tests unitarios e integración real.
- Agrega overlay OpenCode aditivo con agente principal, seis subagentes, ocho
  skills, seis comandos y cuatro custom tools.
- Mantiene el pipeline Quarto/QMD anterior como capability compatible; Artifact
  Studio pasa a ser el camino profesional para nuevos artefactos multiformato.

## 0.1.0

- Addon inicial con runtime Quarto 1.10.18 fijado y verificado por SHA-256.
- Skill y comando global de publicación documental.
- Plantillas para trabajos prácticos e informes profesionales.
- Pipeline PDF, DOCX/ODT y QA visual.
- Lifecycle `install`, `preflight`, `status` y `uninstall`.
