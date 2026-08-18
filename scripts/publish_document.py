#!/usr/bin/env python3

"""Publish a Quarto source as a canonical PDF and optional editable formats."""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render a polished PDF, optional DOCX/ODT, and visual QA pages."
    )
    parser.add_argument("--source", required=True, help="Source .qmd file")
    parser.add_argument("--output-dir", required=True, help="Delivery directory")
    parser.add_argument(
        "--editable",
        choices=("none", "docx", "odt", "both"),
        default="none",
        help="Optional editable companion format",
    )
    parser.add_argument("--name", help="Output basename; defaults to the source stem")
    parser.add_argument("--quarto", help="Explicit managed Quarto executable")
    parser.add_argument("--reference-odt", help="Explicit Pandoc reference ODT")
    parser.add_argument("--pagebreak-filter", help="Explicit portable page-break Lua filter")
    parser.add_argument("--no-qa", action="store_true", help="Skip page rasterization")
    parser.add_argument(
        "--no-editable-qa",
        action="store_true",
        help="Skip LibreOffice QA for requested editable artifacts",
    )
    return parser.parse_args()


def fail(message: str) -> "NoReturn":
    raise SystemExit(f"[document-publisher] {message}")


def discover_quarto(explicit: str | None) -> pathlib.Path:
    candidates = []
    if explicit:
        candidates.append(pathlib.Path(explicit).expanduser())
    if os.environ.get("OPENCODE_DOCUMENTS_QUARTO"):
        candidates.append(
            pathlib.Path(os.environ["OPENCODE_DOCUMENTS_QUARTO"]).expanduser()
        )
    candidates.append(
        pathlib.Path.home()
        / ".local/share/super-turing-opencode-documents/runtime/current/bin/quarto"
    )
    system_quarto = shutil.which("quarto")
    if system_quarto:
        candidates.append(pathlib.Path(system_quarto))
    for candidate in candidates:
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate.resolve()
    fail("Quarto is not available; reinstall the Documents addon runtime")


def discover_resource(relative: str, explicit: str | None = None) -> pathlib.Path:
    candidates: list[pathlib.Path] = []
    if explicit:
        candidates.append(pathlib.Path(explicit).expanduser())
    addon_root = pathlib.Path(__file__).resolve().parent.parent
    candidates.extend(
        (
            addon_root / relative,
            pathlib.Path.home() / ".config/opencode" / relative,
        )
    )
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    fail(f"required addon resource is not available: {relative}")


def run(command: list[str], cwd: pathlib.Path) -> subprocess.CompletedProcess[str]:
    printable = " ".join(command)
    print(f"[document-publisher] running: {printable}")
    result = subprocess.run(command, cwd=cwd, text=True, capture_output=True)
    if result.stdout.strip():
        print(result.stdout.rstrip())
    if result.returncode != 0:
        if result.stderr.strip():
            print(result.stderr.rstrip(), file=sys.stderr)
        fail(f"command failed with exit code {result.returncode}: {printable}")
    return result


def copy_artifact(generated: pathlib.Path, destination: pathlib.Path) -> pathlib.Path:
    if not generated.is_file() or generated.stat().st_size == 0:
        fail(f"expected artifact was not generated: {generated}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    if generated.resolve() != destination.resolve():
        shutil.copy2(generated, destination)
    return destination


def render_quarto(
    quarto: pathlib.Path,
    source: pathlib.Path,
    output_name: str,
    output_format: str,
    pagebreak_filter: pathlib.Path,
) -> pathlib.Path:
    run(
        [
            str(quarto),
            "render",
            source.name,
            "--to",
            output_format,
            "--output",
            output_name,
            "--lua-filter",
            str(pagebreak_filter),
        ],
        source.parent,
    )
    return source.parent / output_name


def render_odt(
    quarto: pathlib.Path,
    source: pathlib.Path,
    generated: pathlib.Path,
    reference_odt: pathlib.Path,
    pagebreak_filter: pathlib.Path,
) -> pathlib.Path:
    run(
        [
            str(quarto),
            "pandoc",
            source.name,
            "--from",
            "markdown",
            "--to",
            "odt",
            "--standalone",
            "--reference-doc",
            str(reference_odt),
            "--lua-filter",
            str(pagebreak_filter),
            "--resource-path",
            str(source.parent),
            "--output",
            str(generated),
        ],
        source.parent,
    )
    return generated


def locate_typst_source(source: pathlib.Path, basename: str) -> pathlib.Path | None:
    for candidate in (
        source.parent / f"{basename}.typ",
        source.with_suffix(".typ"),
    ):
        if candidate.is_file():
            return candidate
    return None


def rasterize_pdf(
    quarto: pathlib.Path,
    pdf: pathlib.Path,
    typst_source: pathlib.Path | None,
    qa_dir: pathlib.Path,
) -> tuple[list[pathlib.Path], str]:
    if qa_dir.exists():
        shutil.rmtree(qa_dir)
    qa_dir.mkdir(parents=True)

    pdftoppm = shutil.which("pdftoppm")
    if pdftoppm:
        run(
            [pdftoppm, "-png", "-r", "120", str(pdf), str(qa_dir / "page")],
            pdf.parent,
        )
        pages = sorted(qa_dir.glob("page-*.png"))
        if pages:
            return pages, "pdftoppm"

    if typst_source:
        page_pattern = qa_dir / "page-{p}.png"
        run(
            [
                str(quarto),
                "typst",
                "compile",
                str(typst_source),
                str(page_pattern),
                "--ppi",
                "120",
                "--root",
                str(typst_source.parent),
            ],
            typst_source.parent,
        )
        pages = sorted(qa_dir.glob("page-*.png"))
        if pages:
            return pages, "quarto-typst"

    fail("could not generate visual QA pages with pdftoppm or managed Typst")


def inspect_pdf(pdf: pathlib.Path) -> dict[str, object]:
    result: dict[str, object] = {"bytes": pdf.stat().st_size}
    pdfinfo = shutil.which("pdfinfo")
    if not pdfinfo:
        return result
    completed = subprocess.run(
        [pdfinfo, str(pdf)], check=False, text=True, capture_output=True
    )
    if completed.returncode != 0:
        return result
    for line in completed.stdout.splitlines():
        if line.startswith("Pages:"):
            result["pages"] = int(line.split(":", 1)[1].strip())
        elif line.startswith("Page size:"):
            result["pageSize"] = line.split(":", 1)[1].strip()
    return result


def render_editable_qa(
    quarto: pathlib.Path,
    artifact: pathlib.Path,
    qa_root: pathlib.Path,
) -> dict[str, object]:
    office = shutil.which("libreoffice") or shutil.which("soffice")
    if not office:
        return {
            "artifact": str(artifact),
            "status": "skipped",
            "reason": "LibreOffice/soffice is not available",
            "visualInspectionRequired": True,
        }

    if qa_root.exists():
        shutil.rmtree(qa_root)
    qa_root.mkdir(parents=True)
    with tempfile.TemporaryDirectory(prefix="opencode-documents-office-") as temp:
        temp_dir = pathlib.Path(temp)
        profile = temp_dir / "profile"
        run(
            [
                office,
                "--headless",
                f"-env:UserInstallation={profile.as_uri()}",
                "--convert-to",
                "pdf",
                "--outdir",
                str(temp_dir),
                str(artifact),
            ],
            artifact.parent,
        )
        converted = temp_dir / f"{artifact.stem}.pdf"
        rendered_pdf = copy_artifact(converted, qa_root / "rendered.pdf")

    pages, rasterizer = rasterize_pdf(
        quarto,
        rendered_pdf,
        None,
        qa_root / "pages",
    )
    return {
        "artifact": str(artifact),
        "status": "generated",
        "engine": pathlib.Path(office).name,
        "renderedPdf": str(rendered_pdf),
        "pdf": inspect_pdf(rendered_pdf),
        "rasterizer": rasterizer,
        "pageCount": len(pages),
        "pages": [str(path) for path in pages],
        "visualInspectionRequired": True,
    }


def main() -> int:
    args = parse_args()
    source = pathlib.Path(args.source).expanduser().resolve()
    if not source.is_file() or source.suffix.lower() != ".qmd":
        fail(f"source must be an existing .qmd file: {source}")
    output_dir = pathlib.Path(args.output_dir).expanduser().resolve()
    if output_dir in (pathlib.Path("/"), pathlib.Path.home().resolve()):
        fail(f"unsafe output directory: {output_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    basename = args.name or source.stem
    if not basename or any(char in basename for char in ("/", "\\", "\0")):
        fail("output name must be a simple filename")

    quarto = discover_quarto(args.quarto)
    pagebreak_filter = discover_resource(
        "documents/filters/pagebreak.lua", args.pagebreak_filter
    )
    version = run([str(quarto), "--version"], source.parent).stdout.strip()
    pdf_name = f"{basename}.pdf"
    generated_pdf = render_quarto(
        quarto, source, pdf_name, "typst", pagebreak_filter
    )
    final_pdf = copy_artifact(generated_pdf, output_dir / pdf_name)

    typst_source = locate_typst_source(source, basename)
    final_typst = None
    if typst_source:
        final_typst = copy_artifact(typst_source, output_dir / f"{basename}.typ")

    editable_artifacts: list[pathlib.Path] = []
    if args.editable in ("docx", "both"):
        generated_docx = render_quarto(
            quarto, source, f"{basename}.docx", "docx", pagebreak_filter
        )
        editable_artifacts.append(
            copy_artifact(generated_docx, output_dir / f"{basename}.docx")
        )
    if args.editable in ("odt", "both"):
        reference_odt = discover_resource(
            "documents/reference/reference.odt", args.reference_odt
        )
        generated_odt = source.parent / f"{basename}.odt"
        render_odt(
            quarto,
            source,
            generated_odt,
            reference_odt,
            pagebreak_filter,
        )
        editable_artifacts.append(
            copy_artifact(generated_odt, output_dir / f"{basename}.odt")
        )

    qa_pages: list[pathlib.Path] = []
    qa_engine = "skipped"
    if not args.no_qa:
        qa_pages, qa_engine = rasterize_pdf(
            quarto, final_pdf, typst_source, output_dir / "qa"
        )

    editable_qa: list[dict[str, object]] = []
    if not args.no_qa and not args.no_editable_qa:
        for artifact in editable_artifacts:
            editable_qa.append(
                render_editable_qa(
                    quarto,
                    artifact,
                    output_dir / "qa-editable" / artifact.suffix.lstrip("."),
                )
            )

    source_copy = output_dir / source.name
    if source_copy.resolve() != source.resolve():
        shutil.copy2(source, source_copy)
    style = source.parent / "style.typ"
    if style.is_file() and style.resolve() != (output_dir / style.name).resolve():
        shutil.copy2(style, output_dir / style.name)

    report = {
        "publishedAt": datetime.now(timezone.utc).isoformat(),
        "source": str(source),
        "quarto": {"path": str(quarto), "version": version},
        "canonicalPdf": str(final_pdf),
        "pdf": inspect_pdf(final_pdf),
        "typstSource": str(final_typst) if final_typst else None,
        "editableArtifacts": [str(path) for path in editable_artifacts],
        "editableQa": editable_qa,
        "qa": {
            "engine": qa_engine,
            "pageCount": len(qa_pages),
            "pages": [str(path) for path in qa_pages],
            "visualInspectionRequired": not args.no_qa,
        },
    }
    report_path = output_dir / "publication-report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(f"[document-publisher] canonical PDF: {final_pdf}")
    print(f"[document-publisher] QA pages: {len(qa_pages)} ({qa_engine})")
    for item in editable_qa:
        print(
            "[document-publisher] editable QA: "
            f"{item['artifact']} ({item['status']})"
        )
    print(f"[document-publisher] report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
