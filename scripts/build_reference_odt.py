#!/usr/bin/env python3

"""Build the addon-owned ODT reference document from Pandoc's pinned default."""

from __future__ import annotations

import argparse
import pathlib
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile


NS = {
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
    "style": "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    "fo": "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
    "svg": "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0",
}

for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)


def qname(prefix: str, local: str) -> str:
    return f"{{{NS[prefix]}}}{local}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--quarto", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def style(root: ET.Element, name: str) -> ET.Element:
    result = root.find(
        f".//style:style[@style:name='{name}']",
        NS,
    )
    if result is None:
        raise SystemExit(f"Pandoc reference.odt has no expected style: {name}")
    return result


def child(element: ET.Element, prefix: str, name: str) -> ET.Element:
    result = element.find(f"{prefix}:{name}", NS)
    if result is None:
        result = ET.SubElement(element, qname(prefix, name))
    return result


def set_text_style(
    root: ET.Element,
    name: str,
    *,
    font: str | None = None,
    size: str | None = None,
    color: str | None = None,
    weight: str | None = None,
    italic: bool | None = None,
) -> None:
    props = child(style(root, name), "style", "text-properties")
    if font:
        props.set(qname("style", "font-name"), font)
        props.set(qname("style", "font-name-asian"), font)
        props.set(qname("style", "font-name-complex"), font)
    if size:
        props.set(qname("fo", "font-size"), size)
        props.set(qname("style", "font-size-asian"), size)
        props.set(qname("style", "font-size-complex"), size)
    if color:
        props.set(qname("fo", "color"), color)
    if weight:
        props.set(qname("fo", "font-weight"), weight)
        props.set(qname("style", "font-weight-asian"), weight)
        props.set(qname("style", "font-weight-complex"), weight)
    if italic is not None:
        value = "italic" if italic else "normal"
        props.set(qname("fo", "font-style"), value)
        props.set(qname("style", "font-style-asian"), value)
        props.set(qname("style", "font-style-complex"), value)


def set_paragraph_style(root: ET.Element, name: str, **values: str) -> None:
    props = child(style(root, name), "style", "paragraph-properties")
    for key, value in values.items():
        prefix, local = key.split("__", 1)
        props.set(qname(prefix, local.replace("_", "-")), value)


def customize(styles_xml: bytes) -> bytes:
    root = ET.fromstring(styles_xml)

    declarations = root.find("office:font-face-decls", NS)
    if declarations is None:
        raise SystemExit("Pandoc reference.odt has no font declarations")
    known = {
        item.get(qname("style", "name"))
        for item in declarations.findall("style:font-face", NS)
    }
    for font in ("Liberation Serif", "Liberation Sans", "Liberation Mono"):
        if font in known:
            continue
        face = ET.SubElement(declarations, qname("style", "font-face"))
        face.set(qname("style", "name"), font)
        face.set(qname("svg", "font-family"), font)

    default_paragraph = root.find(".//style:default-style[@style:family='paragraph']", NS)
    if default_paragraph is None:
        raise SystemExit("Pandoc reference.odt has no default paragraph style")
    default_text = child(default_paragraph, "style", "text-properties")
    default_text.set(qname("style", "font-name"), "Liberation Serif")
    default_text.set(qname("fo", "font-size"), "10pt")
    default_text.set(qname("fo", "language"), "es")
    default_text.set(qname("fo", "country"), "AR")
    default_text.set(qname("fo", "hyphenate"), "true")

    set_text_style(root, "Title", font="Liberation Sans", size="24pt", color="#17324D", weight="bold", italic=False)
    set_paragraph_style(root, "Title", fo__margin_top="0.18in", fo__margin_bottom="0.12in", fo__text_align="center")
    set_text_style(root, "Subtitle", font="Liberation Sans", size="12.5pt", color="#17324D", weight="bold", italic=False)
    set_paragraph_style(root, "Subtitle", fo__margin_top="0.04in", fo__margin_bottom="0.2in", fo__text_align="center")
    set_text_style(root, "Author", font="Liberation Serif", size="10pt", color="#647784")
    set_text_style(root, "Date", font="Liberation Serif", size="9.5pt", color="#647784")

    set_text_style(root, "Text_20_body", font="Liberation Serif", size="10pt", color="#24313A")
    set_paragraph_style(root, "Text_20_body", fo__margin_top="0.045in", fo__margin_bottom="0.045in", fo__line_height="128%", fo__text_align="start")
    set_text_style(root, "First_20_paragraph", font="Liberation Serif", size="10pt", color="#24313A")

    set_text_style(root, "Heading", font="Liberation Sans", color="#17324D", weight="bold", italic=False)
    set_text_style(root, "Heading_20_1", font="Liberation Sans", size="17pt", color="#17324D", weight="bold", italic=False)
    set_paragraph_style(root, "Heading_20_1", fo__margin_top="0.24in", fo__margin_bottom="0.1in", fo__border_bottom="0.04in solid #1B7F79", fo__padding_bottom="0.05in")
    set_text_style(root, "Heading_20_2", font="Liberation Sans", size="12.5pt", color="#1B7F79", weight="bold", italic=False)
    set_paragraph_style(root, "Heading_20_2", fo__margin_top="0.22in", fo__margin_bottom="0.09in")
    set_text_style(root, "Heading_20_3", font="Liberation Sans", size="10.5pt", color="#17324D", weight="bold", italic=False)
    set_paragraph_style(root, "Heading_20_3", fo__margin_top="0.12in", fo__margin_bottom="0.04in")

    set_text_style(root, "Caption", font="Liberation Serif", size="8.5pt", color="#647784", italic=True)
    set_paragraph_style(root, "Caption", fo__text_align="center", fo__margin_top="0.05in", fo__margin_bottom="0.08in")
    set_text_style(root, "Table_20_Contents", font="Liberation Serif", size="8.5pt", color="#24313A")
    set_text_style(root, "Table_20_Heading", font="Liberation Sans", size="8.5pt", color="#17324D", weight="bold")
    set_text_style(root, "Quotations", font="Liberation Serif", size="9.5pt", color="#24313A")
    set_paragraph_style(
        root,
        "Quotations",
        fo__margin_left="0.18in",
        fo__margin_right="0.08in",
        fo__margin_top="0.08in",
        fo__margin_bottom="0.08in",
        fo__padding="0.09in",
        fo__background_color="#EEF5F5",
        fo__border_left="0.05in solid #1B7F79",
    )

    office_styles = root.find("office:styles", NS)
    if office_styles is None:
        raise SystemExit("Pandoc reference.odt has no office:styles")
    if root.find(".//style:style[@style:name='Pagebreak']", NS) is None:
        pagebreak = ET.SubElement(office_styles, qname("style", "style"))
        pagebreak.set(qname("style", "name"), "Pagebreak")
        pagebreak.set(qname("style", "family"), "paragraph")
        pagebreak.set(qname("style", "parent-style-name"), "Standard")
        props = ET.SubElement(pagebreak, qname("style", "paragraph-properties"))
        props.set(qname("fo", "break-before"), "page")

    default_cell = root.find(
        ".//style:default-style[@style:family='table-cell']", NS
    )
    if default_cell is None:
        default_cell = ET.Element(qname("style", "default-style"))
        default_cell.set(qname("style", "family"), "table-cell")
        first_named_style = office_styles.find("style:style", NS)
        if first_named_style is None:
            office_styles.append(default_cell)
        else:
            office_styles.insert(list(office_styles).index(first_named_style), default_cell)
    cell_props = child(default_cell, "style", "table-cell-properties")
    cell_props.set(qname("fo", "padding"), "0.035in")
    cell_props.set(qname("fo", "border-bottom"), "0.5pt solid #CBD7DC")

    page_layout = root.find(".//style:page-layout-properties", NS)
    if page_layout is None:
        raise SystemExit("Pandoc reference.odt has no page layout")
    page_layout.set(qname("fo", "page-width"), "8.2677in")
    page_layout.set(qname("fo", "page-height"), "11.6929in")
    page_layout.set(qname("fo", "margin-top"), "0.71in")
    page_layout.set(qname("fo", "margin-bottom"), "0.71in")
    page_layout.set(qname("fo", "margin-left"), "0.83in")
    page_layout.set(qname("fo", "margin-right"), "0.83in")

    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def build(quarto: pathlib.Path, output: pathlib.Path) -> None:
    with tempfile.TemporaryDirectory(prefix="opencode-documents-reference-") as temp:
        default = pathlib.Path(temp) / "reference.odt"
        subprocess.run(
            [str(quarto), "pandoc", "-o", str(default), "--print-default-data-file", "reference.odt"],
            check=True,
        )
        with zipfile.ZipFile(default) as source:
            entries = {item.filename: (item, source.read(item.filename)) for item in source.infolist()}
        entries["styles.xml"] = (entries["styles.xml"][0], customize(entries["styles.xml"][1]))
        output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output, "w") as target:
            mimetype = entries.pop("mimetype")
            target.writestr(mimetype[0], mimetype[1], compress_type=zipfile.ZIP_STORED)
            for _, (info, content) in entries.items():
                target.writestr(info, content)


def main() -> int:
    args = parse_args()
    build(pathlib.Path(args.quarto).expanduser().resolve(), pathlib.Path(args.output).expanduser().resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
