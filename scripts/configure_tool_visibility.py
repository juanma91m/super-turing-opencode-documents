#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path


TOOL_NAMES = (
    "artifact-render",
    "artifact-preview",
    "artifact-validate",
    "artifact-fonts",
    "artifact-service-flow",
)
STATE_FILENAME = ".opencode-documents-tool-visibility.json"


def load_json(path: Path) -> dict:
    if not path.exists():
        return {"$schema": "https://opencode.ai/config.json"}
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def capture_previous_state(config: dict) -> dict:
    tools = config.get("tools")
    if not isinstance(tools, dict):
        tools = {}
    return {
        "schemaVersion": 1,
        "tools": {
            tool_name: {
                "present": tool_name in tools,
                "value": tools.get(tool_name),
            }
            for tool_name in TOOL_NAMES
        },
    }


def extend_previous_state(config: dict, previous_state: dict) -> dict:
    tools = config.get("tools")
    if not isinstance(tools, dict):
        tools = {}
    saved_tools = previous_state.setdefault("tools", {})
    for tool_name in TOOL_NAMES:
        if tool_name not in saved_tools:
            saved_tools[tool_name] = {
                "present": tool_name in tools,
                "value": tools.get(tool_name),
            }
    return previous_state


def install(config: dict) -> None:
    tools = config.setdefault("tools", {})
    for tool_name in TOOL_NAMES:
        tools[tool_name] = False


def uninstall(config: dict, previous_state: dict | None) -> None:
    if previous_state is None:
        return
    tools = config.get("tools")
    if not isinstance(tools, dict):
        return
    for tool_name in TOOL_NAMES:
        if tools.get(tool_name) is not False:
            continue
        state = previous_state.get("tools", {}).get(tool_name) if previous_state else None
        if isinstance(state, dict) and state.get("present") is True:
            tools[tool_name] = state.get("value")
        else:
            tools.pop(tool_name, None)
    if not tools:
        config.pop("tools", None)


def main() -> int:
    parser = argparse.ArgumentParser(description="Configure Artifact Studio tool visibility")
    parser.add_argument("command", choices=("install", "uninstall"))
    parser.add_argument("--config", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    config_path = Path(args.config).expanduser()
    state_path = config_path.parent / STATE_FILENAME
    config = load_json(config_path)
    previous_state = None
    if args.command == "install":
        if state_path.exists():
            previous_state = extend_previous_state(config, load_json(state_path))
        else:
            previous_state = capture_previous_state(config)
        install(config)
    else:
        if state_path.exists():
            previous_state = load_json(state_path)
        uninstall(config, previous_state)

    if args.dry_run:
        print(json.dumps({
            "globallyHidden": sorted(
                name for name in TOOL_NAMES if config.get("tools", {}).get(name) is False
            ),
            "stateFile": str(state_path),
            "statePresent": state_path.exists(),
        }, indent=2))
        return 0

    if args.command == "install":
        write_json(state_path, previous_state)
    write_json(config_path, config)
    if args.command == "uninstall" and state_path.exists():
        state_path.unlink()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
