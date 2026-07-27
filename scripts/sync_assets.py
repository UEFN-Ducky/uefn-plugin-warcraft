#!/usr/bin/env python3
"""Sync warcraftcn-ui assets into ui/assets, build spinner.svg, fetch Cinzel woff2.

Source repo: https://github.com/TheOrcDev/warcraftcn-ui (MIT).
Run once after cloning/updating the source repo:

  py plugins/uefn-plugin-warcraft/scripts/sync_assets.py [--src <warcraftcn-ui dir>]
"""

from __future__ import annotations

import argparse
import re
import shutil
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UI = ROOT / "ui"
DEFAULT_SRC = Path.home() / "Desktop" / "warcraftcn-ui-main"

SPINNER_VIEW_BOX = "14 15.946284 187.21483 333.9404"

CINZEL_CSS_URL = (
    "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap"
)
# Chrome UA so Google serves woff2 sources.
WOFF2_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


def copy_assets(src_repo: Path) -> None:
    src = src_repo / "components" / "ui" / "warcraftcn" / "assets"
    if not src.is_dir():
        raise SystemExit(f"warcraftcn assets not found: {src}")
    dest = UI / "assets"
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns("*.ts"))
    n = sum(1 for p in dest.rglob("*") if p.is_file())
    kb = sum(p.stat().st_size for p in dest.rglob("*") if p.is_file()) // 1024
    print(f"copied {n} assets ({kb} KB) -> {dest}")


def build_spinner_svg(src_repo: Path) -> None:
    ts = src_repo / "components" / "ui" / "warcraftcn" / "assets" / "spinner-path.ts"
    text = ts.read_text(encoding="utf-8")
    m = re.search(r'"([^"]+)"', text, re.S)
    if not m:
        raise SystemExit(f"could not extract SPINNER_PATH from {ts}")
    d = m.group(1)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{SPINNER_VIEW_BOX}" '
        f'preserveAspectRatio="xMidYMid meet">'
        f'<path d="{d}" fill="#000"/></svg>'
    )
    out = UI / "assets" / "svg" / "spinner.svg"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(svg, encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size} bytes)")


def fetch(url: str, ua: str = WOFF2_UA) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def fetch_cinzel() -> None:
    fonts = UI / "fonts"
    fonts.mkdir(parents=True, exist_ok=True)
    css = fetch(CINZEL_CSS_URL).decode("utf-8")
    # Parse each @font-face block; keep the latin block per weight.
    wanted = {"400": "cinzel-400.woff2", "700": "cinzel-700.woff2"}
    got: set[str] = set()
    for block in re.findall(r"@font-face\s*\{([^}]*)\}", css, re.S):
        wm = re.search(r"font-weight:\s*(\d+)", block)
        um = re.search(r"src:\s*url\((https://[^)]+\.woff2)\)", block)
        if not wm or not um:
            continue
        if "U+0000-00FF" not in block:
            continue
        weight = wm.group(1)
        name = wanted.get(weight)
        if not name or weight in got:
            continue
        data = fetch(um.group(1))
        (fonts / name).write_bytes(data)
        got.add(weight)
        print(f"wrote {fonts / name} ({len(data)} bytes)")
    missing = set(wanted) - got
    if missing:
        raise SystemExit(f"failed to fetch Cinzel weights: {sorted(missing)}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    parser.add_argument("--skip-fonts", action="store_true")
    args = parser.parse_args()

    copy_assets(args.src)
    build_spinner_svg(args.src)
    if not args.skip_fonts:
        fetch_cinzel()
    print("sync_assets done")


if __name__ == "__main__":
    main()
