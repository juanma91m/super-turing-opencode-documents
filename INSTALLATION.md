# Instalación del addon Documents

## Requisitos de bootstrap

- Linux x86_64;
- `bash`;
- `python3`;
- `curl`;
- `tar`;
- `sha256sum`.
- Node.js 22 LTS o superior;
- `corepack` (pnpm se fija en el lockfile).

El installer descarga y verifica versiones fijadas de Quarto y D2. Quarto
incluye los ejecutables de Pandoc y Typst utilizados por el pipeline; D2 genera
los diagramas vectoriales. El installer ejecuta además `pnpm install
--frozen-lockfile` para Artifact Studio y solo permite scripts de build
auditados (`esbuild`, `sharp`).

Las copias de seguridad de archivos administrados se guardan junto al estado
propio del addon, bajo `~/.local/share/super-turing-opencode-documents/backups/`;
no se dejan backups residuales dentro de `~/.config/opencode/`.

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
- `qpdf`: validación PDF fuerte (se usa `pdfinfo` como fallback);
- `unzip`: validación estructural OOXML para PPTX/DOCX;
- `fontconfig`: detección de IBM Plex y Noto Sans;
- `graphviz`: fallback opcional para grafos densos;
- `google-chrome`, `chromium` o `chrome-headless-shell`: salida PNG de alta
  resolución para diagramas; SVG no requiere esta dependencia.

Ninguna dependencia de sistema se instala silenciosamente. Si `pdftoppm` no
está disponible, el publisher intenta generar las páginas de QA con el Typst
incluido en Quarto.

IBM Plex es la tipografía preferida. El addon no instala fuentes con `sudo` ni
descarga binarios desde orígenes no auditados; si IBM Plex no está disponible,
Artifact Studio usa Noto Sans. Verificá el estado con:

```bash
corepack pnpm --dir artifact-studio tsx scripts/check-fonts.ts
```

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
