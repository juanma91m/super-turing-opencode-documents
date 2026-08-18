#!/usr/bin/env python3

"""Render a reproducible D2 diagram for document and poster workflows."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone


PROFILES = {
    "document-light": {"theme": "4", "pad": "28"},
    "poster-dark": {"theme": "200", "pad": "36"},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render D2 source to SVG and optional high-resolution PNG."
    )
    parser.add_argument("--source", required=True, help="Source .d2 file")
    parser.add_argument("--output-dir", required=True, help="Generated asset directory")
    parser.add_argument("--name", help="Output basename; defaults to source stem")
    parser.add_argument(
        "--profile",
        choices=tuple(PROFILES),
        default="document-light",
        help="Visual profile",
    )
    parser.add_argument(
        "--layout", choices=("elk", "dagre"), default="elk", help="D2 layout engine"
    )
    parser.add_argument(
        "--format", choices=("svg", "png", "both"), default="svg"
    )
    parser.add_argument("--sketch", action="store_true", help="Use D2 sketch mode")
    parser.add_argument("--d2", help="Explicit managed D2 executable")
    return parser.parse_args()


def fail(message: str) -> "NoReturn":
    raise SystemExit(f"[diagram-renderer] {message}")


def discover_d2(explicit: str | None) -> pathlib.Path:
    candidates: list[pathlib.Path] = []
    if explicit:
        candidates.append(pathlib.Path(explicit).expanduser())
    if os.environ.get("OPENCODE_DOCUMENTS_D2"):
        candidates.append(pathlib.Path(os.environ["OPENCODE_DOCUMENTS_D2"]).expanduser())
    candidates.append(
        pathlib.Path.home()
        / ".local/share/super-turing-opencode-documents/runtime/d2-current/bin/d2"
    )
    system_d2 = shutil.which("d2")
    if system_d2:
        candidates.append(pathlib.Path(system_d2))
    for candidate in candidates:
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate.resolve()
    fail("D2 is not available; reinstall the Documents addon runtime")


def run(command: list[str], cwd: pathlib.Path) -> subprocess.CompletedProcess[str]:
    printable = " ".join(command)
    print(f"[diagram-renderer] running: {printable}")
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


def discover_browser() -> pathlib.Path:
    for name in (
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
        "chrome-headless-shell",
    ):
        executable = shutil.which(name)
        if executable:
            return pathlib.Path(executable).resolve()
    fail("PNG output requires Chrome, Chromium, or chrome-headless-shell; SVG was generated successfully")


def svg_viewbox(svg: pathlib.Path) -> tuple[int, int]:
    root = ET.parse(svg).getroot()
    viewbox = root.get("viewBox")
    if not viewbox:
        fail(f"generated SVG has no viewBox: {svg}")
    values = [float(value) for value in viewbox.replace(",", " ").split()]
    if len(values) != 4 or values[2] <= 0 or values[3] <= 0:
        fail(f"generated SVG has an invalid viewBox: {viewbox}")
    return math.ceil(values[2]), math.ceil(values[3])


def main() -> int:
    args = parse_args()
    source = pathlib.Path(args.source).expanduser().resolve()
    if not source.is_file() or source.suffix.lower() != ".d2":
        fail(f"source must be an existing .d2 file: {source}")
    output_dir = pathlib.Path(args.output_dir).expanduser().resolve()
    if output_dir in (pathlib.Path("/"), pathlib.Path.home().resolve()):
        fail(f"unsafe output directory: {output_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    basename = args.name or source.stem
    if not basename or any(char in basename for char in ("/", "\\", "\0")):
        fail("output name must be a simple filename")

    d2 = discover_d2(args.d2)
    version = run([str(d2), "--version"], source.parent).stdout.strip()
    profile = PROFILES[args.profile]
    svg = output_dir / f"{basename}.svg"
    command = [
        str(d2),
        "--theme",
        profile["theme"],
        "--layout",
        args.layout,
        "--pad",
        profile["pad"],
    ]
    if args.sketch:
        command.append("--sketch")
    command.extend((str(source), str(svg)))
    run(command, source.parent)
    if not svg.is_file() or svg.stat().st_size == 0:
        fail(f"D2 did not generate the expected SVG: {svg}")

    artifacts = [svg]
    png_renderer = None
    if args.format in ("png", "both"):
        browser = discover_browser()
        width, height = svg_viewbox(svg)
        png = output_dir / f"{basename}.png"
        with tempfile.TemporaryDirectory(prefix="opencode-documents-chrome-") as temp:
            run(
                [
                    str(browser),
                    "--headless",
                    "--disable-gpu",
                    "--hide-scrollbars",
                    "--force-device-scale-factor=2",
                    f"--window-size={width},{height}",
                    f"--user-data-dir={temp}",
                    f"--screenshot={png}",
                    svg.as_uri(),
                ],
                output_dir,
            )
        if not png.is_file() or png.stat().st_size == 0:
            fail(f"headless browser did not generate the expected PNG: {png}")
        artifacts.append(png)
        png_renderer = str(browser)

    report = {
        "renderedAt": datetime.now(timezone.utc).isoformat(),
        "source": str(source),
        "sourceSha256": sha256(source),
        "d2": {"path": str(d2), "version": version},
        "profile": args.profile,
        "layout": args.layout,
        "sketch": args.sketch,
        "pngRenderer": png_renderer,
        "artifacts": [
            {"path": str(path), "bytes": path.stat().st_size, "sha256": sha256(path)}
            for path in artifacts
        ],
    }
    report_path = output_dir / f"{basename}.diagram-report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(f"[diagram-renderer] report: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
