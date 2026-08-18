# super-turing-opencode-documents

Addon portable para OpenCode que convierte contenido bien redactado en
documentos presentables y listos para entregar.

## Qué agrega

- skill global `publicacion-documental`;
- comando `/publicar-documento`;
- plantillas `trabajo-practico` e `informe-profesional`;
- runtime Quarto fijado e instalado en user-space;
- publicación PDF mediante Typst;
- salida editable DOCX u ODT mediante Quarto/Pandoc;
- `reference.odt` propio con A4, tipografías y jerarquía visual coherentes;
- saltos de página portables entre Typst, DOCX y ODT;
- páginas de QA visual del PDF y, cuando está LibreOffice, de cada editable.

El PDF es el artefacto canónico. DOCX y ODT son acompañantes editables y no se
promete paridad visual exacta entre motores.

El contenido y las correcciones se mantienen en QMD. Los editables no son una
segunda fuente maestra: se regeneran desde el mismo QMD que produce el PDF.

## Instalación

```bash
bash scripts/install.sh
```

El runtime se instala, por defecto, bajo:

```text
~/.local/share/super-turing-opencode-documents/runtime/
```

No requiere `sudo` y no reemplaza una instalación global de Quarto.

## Uso

Desde OpenCode:

```text
/publicar-documento trabajo-practico sobre arquitectura de software
```

Desde terminal:

```bash
python3 ~/.config/opencode/scripts/publish_document.py \
  --source ./entrega/documento.qmd \
  --output-dir ./entrega/final \
  --editable odt
```

Para un salto explícito compatible con los tres formatos, usar un bloque raw
TeX en el QMD:

````markdown
```{=tex}
\newpage
```
````

El reporte registra el QA canónico bajo `qa` y el de editables bajo
`editableQa`. Las imágenes quedan en `qa/` y `qa-editable/` respectivamente.

## Mantenimiento del reference ODT

El binario versionado se deriva del `reference.odt` del Pandoc fijado:

```bash
python3 scripts/build_reference_odt.py \
  --quarto ~/.local/share/super-turing-opencode-documents/runtime/current/bin/quarto \
  --output documents/reference/reference.odt
```

## Lifecycle

```bash
bash scripts/status.sh
bash scripts/uninstall.sh
bash scripts/uninstall.sh --remove-runtime
```

Ver [INSTALLATION.md](./INSTALLATION.md) para opciones y dependencias.

## Licencia

MIT. Quarto, Pandoc y Typst conservan sus respectivas licencias upstream.
