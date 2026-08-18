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
- páginas de QA visual y validación básica del artefacto final.

El PDF es el artefacto canónico. DOCX y ODT son acompañantes editables y no se
promete paridad visual exacta entre motores.

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

## Lifecycle

```bash
bash scripts/status.sh
bash scripts/uninstall.sh
bash scripts/uninstall.sh --remove-runtime
```

Ver [INSTALLATION.md](./INSTALLATION.md) para opciones y dependencias.

## Licencia

MIT. Quarto, Pandoc y Typst conservan sus respectivas licencias upstream.
