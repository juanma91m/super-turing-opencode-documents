# Instalación del addon Documents

## Requisitos de bootstrap

- Linux x86_64;
- `bash`;
- `python3`;
- `curl`;
- `tar`;
- `sha256sum`.

El installer descarga y verifica versiones fijadas de Quarto y D2. Quarto
incluye los ejecutables de Pandoc y Typst utilizados por el pipeline; D2 genera
los diagramas vectoriales.

## Instalación normal

```bash
bash scripts/install.sh
```

Opciones:

```text
--target-dir <path>    Config global destino
--runtime-dir <path>   Runtime user-space administrado
--assets-only          Instalar assets sin descargar runtime
--dry-run              Mostrar acciones sin escribir
--no-validate          Omitir opencode debug config
```

## Dependencias opcionales

- `libreoffice`: renderizado de DOCX/ODT a PDF para su QA visual;
- `pdfinfo`: inspección adicional del PDF;
- `pdftoppm`: rasterización rápida para QA visual;
- `google-chrome`, `chromium` o `chrome-headless-shell`: salida PNG de alta
  resolución para diagramas; SVG no requiere esta dependencia.

Ninguna dependencia de sistema se instala silenciosamente. Si `pdftoppm` no
está disponible, el publisher intenta generar las páginas de QA con el Typst
incluido en Quarto.

Sin LibreOffice, los editables se generan pero su QA queda registrado como
`skipped` en `publication-report.json`; el publisher no simula esa validación.

## Validación

```bash
bash scripts/status.sh
```

Para una prueba real de publicación:

```bash
bash tests/test_publish.sh
```
