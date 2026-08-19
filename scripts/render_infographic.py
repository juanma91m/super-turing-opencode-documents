#!/usr/bin/env python3

"""Compile a standalone Typst technical infographic to PNG and/or PDF."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
from datetime import datetime, timezone


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render a standalone Typst infographic with the managed runtime."
    )
    parser.add_argument("--source", required=True, help="Source .typ file")
    parser.add_argument("--output-dir", required=True, help="Generated asset directory")
    parser.add_argument("--name", help="Output basename; defaults to source stem")
    parser.add_argument("--format", choices=("png", "pdf", "both"), default="both")
    parser.add_argument("--ppi", type=int, default=180, help="PNG resolution")
    parser.add_argument("--quarto", help="Explicit managed Quarto executable")
    return parser.parse_args()


def fail(message: str) -> "NoReturn":
    raise SystemExit(f"[infographic-renderer] {message}")


def discover_quarto(explicit: str | None) -> pathlib.Path:
    candidates: list[pathlib.Path] = []
    if explicit:
        candidates.append(pathlib.Path(explicit).expanduser())
    if os.environ.get("OPENCODE_DOCUMENTS_QUARTO"):
        candidates.append(pathlib.Path(os.environ["OPENCODE_DOCUMENTS_QUARTO"]).expanduser())
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


def run(command: list[str], cwd: pathlib.Path) -> subprocess.CompletedProcess[str]:
    printable = " ".join(command)
    print(f"[infographic-renderer] running: {printable}")
    completed = subprocess.run(command, cwd=cwd, text=True, capture_output=True)
    if completed.stdout.strip():
        print(completed.stdout.rstrip())
    if completed.returncode != 0:
        if completed.stderr.strip():
            print(completed.stderr.rstrip(), file=sys.stderr)
        fail(f"command failed with exit code {completed.returncode}: {printable}")
    return completed


def sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    args = parse_args()
    source = pathlib.Path(args.source).expanduser().resolve()
    if not source.is_file() or source.suffix.lower() != ".typ":
        fail(f"source must be an existing .typ file: {source}")
    if args.ppi < 72 or args.ppi > 600:
        fail("PPI must be between 72 and 600")
    output_dir = pathlib.Path(args.output_dir).expanduser().resolve()
    if output_dir in (pathlib.Path("/"), pathlib.Path.home().resolve()):
        fail(f"unsafe output directory: {output_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    basename = args.name or source.stem
    if not basename or any(char in basename for char in ("/", "\\", "\0")):
        fail("output name must be a simple filename")

    quarto = discover_quarto(args.quarto)
    version = run([str(quarto), "--version"], source.parent).stdout.strip()
    artifacts: list[pathlib.Path] = []
    if args.format in ("pdf", "both"):
        pdf = output_dir / f"{basename}.pdf"
        run(
            [str(quarto), "typst", "compile", str(source), str(pdf), "--root", str(source.parent)],
            source.parent,
        )
        artifacts.append(pdf)
    if args.format in ("png", "both"):
        png = output_dir / f"{basename}.png"
        run(
            [
                str(quarto),
                "typst",
                "compile",
                str(source),
                str(png),
                "--ppi",
                str(args.ppi),
                "--root",
                str(source.parent),
            ],
            source.parent,
        )
        artifacts.append(png)
    for artifact in artifacts:
        if not artifact.is_file() or artifact.stat().st_size == 0:
            fail(f"expected artifact was not generated: {artifact}")

    report = {
        "renderedAt": datetime.now(timezone.utc).isoformat(),
        "source": str(source),
        "sourceSha256": sha256(source),
        "quarto": {"path": str(quarto), "version": version},
        "ppi": args.ppi,
        "artifacts": [
            {"path": str(path), "bytes": path.stat().st_size, "sha256": sha256(path)}
            for path in artifacts
        ],
    }
    report_path = output_dir / f"{basename}.infographic-report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(f"[infographic-renderer] report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
