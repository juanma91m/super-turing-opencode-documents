# Changelog

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
