#!/usr/bin/env python3
"""Bundle the game into one HTML file that plays offline from the filesystem.

The app normally loads a dozen ES modules and fetches its data, which a browser
refuses to do from a file:// URL. This flattens all of it into a single document
so the game can be handed to someone who just wants to double-click it:

    python3 tools/build_standalone.py
    python3 tools/build_standalone.py --out /tmp/hra.html --scenario nebakov

Modules are ordered by their own import statements rather than by a list kept
here, so adding one does not mean editing this file. Imports and exports are then
stripped and the modules concatenated, which only works while no two of them
declare the same top-level name — that is checked, and the build fails loudly if
it ever stops being true.

Data is embedded and served to the unchanged app through a fake `fetch`, since
platform/data.js already takes one as a parameter. Card images become data URIs.
"""

import argparse
import base64
import io
import json
import os
import re
import sys

ENTRY = os.path.join("src", "ui", "app.js")
CSS = os.path.join("web", "app.css")
GAMES_DIR = "games"
CATALOGUE = os.path.join(GAMES_DIR, "scenarios.json")
DEFAULT_OUT = os.path.join("dist", "nebakov-standalone.html")

IMPORT_RE = re.compile(r'^\s*import\s+[^;]*?\s+from\s+["\']([^"\']+)["\']\s*;?\s*$',
                       re.MULTILINE | re.DOTALL)
BARE_IMPORT_RE = re.compile(r'^\s*import\s+["\'][^"\']+["\']\s*;?\s*$', re.MULTILINE)
EXPORT_LIST_RE = re.compile(r'^\s*export\s*\{[^}]*\}\s*;?\s*$', re.MULTILINE)
EXPORT_DECL_RE = re.compile(r'^(\s*)export\s+(?=(?:async\s+)?(?:function|class|const|let|var)\b)',
                            re.MULTILINE)
TOP_DECL_RE = re.compile(
    r'^(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)',
    re.MULTILINE)
MAX_IMAGE_WIDTH = 900


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def resolve(importer, spec):
    if not spec.startswith("."):
        raise SystemExit(f"{importer}: nepodporovaný import {spec!r} (jen relativní cesty)")
    return os.path.normpath(os.path.join(os.path.dirname(importer), spec))


def collect(entry):
    """Depth-first over imports, so a module lands after everything it needs."""
    order, seen, stack = [], set(), set()

    def visit(path):
        if path in order:
            return
        if path in stack:
            raise SystemExit(f"kruhový import u {path}")
        if not os.path.exists(path):
            raise SystemExit(f"{path} neexistuje")
        stack.add(path)
        source = read(path)
        for spec in IMPORT_RE.findall(source):
            visit(resolve(path, spec))
        stack.discard(path)
        seen.add(path)
        order.append(path)

    visit(entry)
    return order


def strip_module(source):
    source = IMPORT_RE.sub("", source)
    source = BARE_IMPORT_RE.sub("", source)
    source = EXPORT_LIST_RE.sub("", source)
    source = EXPORT_DECL_RE.sub(r"\1", source)
    return source


def check_collisions(modules):
    """Concatenation is only safe while top-level names are unique."""
    owner, clashes = {}, []
    for path, source in modules:
        for name in set(TOP_DECL_RE.findall(source)):
            if name in owner:
                clashes.append(f"{name}: {owner[name]} a {path}")
            else:
                owner[name] = path
    if clashes:
        raise SystemExit(
            "moduly deklarují stejné názvy na nejvyšší úrovni, bundle by je "
            "přepsal:\n  " + "\n  ".join(clashes))


def data_uri(path):
    ext = os.path.splitext(path)[1].lower()
    mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
            ".webp": "image/webp", ".svg": "image/svg+xml"}.get(ext, "application/octet-stream")
    raw = open(path, "rb").read()
    if ext in (".jpg", ".jpeg", ".png", ".webp"):
        try:
            from PIL import Image
            im = Image.open(io.BytesIO(raw))
            if im.width > MAX_IMAGE_WIDTH:
                im.thumbnail((MAX_IMAGE_WIDTH, MAX_IMAGE_WIDTH * 4))
                buf = io.BytesIO()
                im.convert("RGB").save(buf, format="JPEG", quality=82)
                raw, mime = buf.getvalue(), "image/jpeg"
        except ImportError:
            pass
    return f"data:{mime};base64," + base64.b64encode(raw).decode("ascii")


def gather_data(scenario_ids):
    """Every JSON the app fetches, keyed by the path it asks for."""
    catalogue = json.loads(read(CATALOGUE))
    files = {CATALOGUE.replace(os.sep, "/"): catalogue}
    missing_images = []

    for entry in catalogue:
        # preview images are embedded for every entry, including the ones whose
        # data is left out, because the picker still lists them
        preview = entry.get("image")
        if preview and os.path.exists(preview):
            entry["image"] = data_uri(preview)
        elif preview:
            missing_images.append(f"{entry.get('id')}/náhled {os.path.basename(preview)}")
            entry.pop("image", None)

        if scenario_ids and entry.get("id") not in scenario_ids:
            continue
        path = entry.get("file")
        if not path or not os.path.exists(path):
            print(f"  varování: {entry.get('id')} nemá data ({path})", file=sys.stderr)
            continue
        scenario = json.loads(read(path))
        folder = os.path.dirname(path)

        for name in (scenario.get("events"), scenario.get("roleSet"), scenario.get("legend")):
            if not name:
                continue
            companion = os.path.join(folder, name)
            if os.path.exists(companion):
                files[companion.replace(os.sep, "/")] = json.loads(read(companion))

        # card images become data URIs, so imageBase can be empty
        images_dir = os.path.join(folder, "images")
        for scene in scenario.get("scenes", []):
            name = scene.get("image")
            if not name:
                continue
            image_path = os.path.join(images_dir, name)
            if os.path.exists(image_path):
                scene["image"] = data_uri(image_path)
            else:
                missing_images.append(f"{entry.get('id')}/{name}")
                scene.pop("image", None)

        files[path.replace(os.sep, "/")] = scenario

    return catalogue, files, sorted(set(missing_images))


def build(out_path, scenario_ids, version):
    paths = collect(ENTRY)
    modules = [(p, strip_module(read(p))) for p in paths]
    check_collisions(modules)

    catalogue, files, missing_images = gather_data(scenario_ids)
    css = read(CSS)

    bundle = "\n".join(
        f"/* ---- {path.replace(os.sep, '/')} ---- */\n{source}" for path, source in modules)

    payload = json.dumps(files, ensure_ascii=False, separators=(",", ":"))
    payload = payload.replace("</script", "<\\/script").replace("<!--", "<\\!--")

    boot = f'''
/* ---- standalone boot ---- */
const EMBEDDED = {payload};

/** Stands in for fetch, because a file:// page cannot make requests. */
function embeddedFetch(url) {{
  const key = String(url).replace(/^\\.\\//, "");
  if (!(key in EMBEDDED)) {{
    return Promise.resolve({{ ok: false, status: 404, json: () => Promise.reject(new Error(key)) }});
  }}
  return Promise.resolve({{
    ok: true,
    status: 200,
    json: () => Promise.resolve(structuredClone(EMBEDDED[key])),
  }});
}}

const baseLoader = createLoader({{ fetch: embeddedFetch, base: "" }});
const loader = {{
  ...baseLoader,
  // images are already data URIs in the embedded data
  loadGame: async (entry) => ({{ ...(await baseLoader.loadGame(entry)), imageBase: "" }}),
}};

const app = createApp({{
  root: document.getElementById("app"),
  base: "",
  version: {json.dumps(version)},
  loader,
}});
globalThis.rwag = app;
app.start();
'''

    html = f'''<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Tajemství Nebákova — chodící dobrodružství</title>
<meta name="theme-color" content="#7a2e22" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#100e0a" media="(prefers-color-scheme: dark)">
<style>
{css}
</style>
</head>
<body>
<div id="app"></div>
<noscript><p style="padding:1rem">Hra potřebuje JavaScript. Zapněte ho prosím v nastavení prohlížeče.</p></noscript>
<script>
{bundle}
{boot}
</script>
</body>
</html>
'''

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(html)

    print(f"{out_path}: {round(len(html.encode()) / 1024)} KB")
    print(f"  modulů: {len(modules)} | vložených souborů dat: {len(files)}")
    for path, _ in modules:
        print(f"    {path.replace(os.sep, '/')}")
    if missing_images:
        print(f"  chybějící obrázky vynechány: {', '.join(missing_images)}")
    embedded_images = sum(
        1 for payload in files.values() if isinstance(payload, dict)
        for scene in payload.get("scenes", []) if str(scene.get("image", "")).startswith("data:"))
    print(f"  vložených obrázků karet: {embedded_images}")
    return 0


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=DEFAULT_OUT, help="výstup (default: %(default)s)")
    ap.add_argument("--scenario", action="append", default=None,
                    help="omezit na daná id scénářů (lze zadat opakovaně)")
    ap.add_argument("--version", default="0.1.0-standalone")
    args = ap.parse_args()

    for path in (ENTRY, CSS, CATALOGUE):
        if not os.path.exists(path):
            print(f"chyba: {path} neexistuje (spusť z korene repozitáře)", file=sys.stderr)
            return 2
    return build(args.out, set(args.scenario or []), args.version)


if __name__ == "__main__":
    raise SystemExit(main())
