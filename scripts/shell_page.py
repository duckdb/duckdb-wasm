#!/usr/bin/env python3
"""Keep the web shell page of the gh-pages branch consistent before a push.

Usage: shell_page.py rename <gh-pages checkout>
       shell_page.py check <gh-pages checkout>

rename gives each script that index.html loads from static/shell/ the first 10 hex digits of its SHA-256
in its name, updates index.html, then runs the check. Run it after every edit of such a script: the site
caches /static/ for hours and index.html for minutes, so a script changed under its old name would run
with a newer page.

check exits non-zero and lists what does not fit together.
"""

import base64
import hashlib
import re
import sys
from pathlib import Path

SHELL = "static/shell"
ASSET_ATTRIBUTES = ["data-shell-js", "data-shell-wasm", "data-worker", "data-engine"]
# Third-party files and the SHA-256 of each as its npm package ships it:
# @xterm/xterm@5.5.0 (lib/xterm.js, css/xterm.css) and @xterm/addon-fit@0.10.0 (lib/addon-fit.js).
VENDORED = {
    "static/vendor/xterm-5.5.0/xterm.js": "sha256-H5kaw7Syg+v5bmCuI6AKUnZd06Lkb6b92p8aqwMvdJU=",
    "static/vendor/xterm-5.5.0/xterm.css": "sha256-uo5phWaUiJgcz0DAzv46uoByLLbJLeetYosL1xf68rY=",
    "static/vendor/addon-fit-0.10.0/addon-fit.js": "sha256-va76Nwsb/ELuiNRv5gckAJAqTUstRc2TQ43amyPJcIk=",
}
COMMENT = re.compile(r"<!--.*?-->", re.S)
SCRIPT_TAG = re.compile(r"<script\b(?P<attributes>[^>]*)>")
SRC = re.compile(r'\bsrc="(?P<url>[^"]*)"')
SHELL_URL = re.compile(r"^(?P<prefix>\.?/)" + SHELL + r"/(?P<name>(?P<stem>[a-z0-9-]+)(?:\.[0-9a-f]{10})?\.js)$")
FILE_URL = re.compile(rb"static/(assets|shell|vendor)/")


def hashed_name(stem, data):
    return f"{stem}.{hashlib.sha256(data).hexdigest()[:10]}.js"


def script_tags(html):
    """The attributes and the src of each <script> tag outside a comment."""
    tags = []
    for tag in SCRIPT_TAG.finditer(COMMENT.sub("", html)):
        src = SRC.search(tag.group("attributes"))
        tags.append((tag.group("attributes"), src.group("url") if src else None))
    return tags


def rename(root):
    index = root / "index.html"
    html = index.read_text()
    renamed = []
    for _, url in script_tags(html):
        shell = SHELL_URL.match(url or "")
        if not shell:
            continue
        old = shell.group("name")
        new = hashed_name(shell.group("stem"), (root / SHELL / old).read_bytes())
        if new != old:
            (root / SHELL / old).rename(root / SHELL / new)
            html = html.replace(f'src="{url}"', f'src="{shell.group("prefix")}{SHELL}/{new}"')
            renamed.append((old, new))
    if renamed:
        index.write_text(html)
    return renamed


def check(root, vendored=VENDORED):
    html = (root / "index.html").read_text()
    problems = []
    loaded = {}
    for attributes, url in script_tags(html):
        shell = SHELL_URL.match(url or "")
        if url is None:
            problems.append("index.html has an inline <script>: the page policy runs scripts from files only")
        elif shell:
            loaded[shell.group("name")] = (shell.group("stem"), shell.group("prefix"), attributes)
        elif url.removeprefix("./") not in vendored:
            problems.append(f"index.html loads a script from outside {SHELL}/ and static/vendor/: {url}")

    for path in sorted((root / SHELL).iterdir()):
        if path.name not in loaded:
            problems.append(f"{SHELL}/{path.name} is not loaded by index.html")
    for name, (stem, prefix, attributes) in loaded.items():
        path = root / SHELL / name
        if not path.is_file():
            problems.append(f"index.html loads {SHELL}/{name}, which does not exist")
            continue
        data = path.read_bytes()
        if name != hashed_name(stem, data):
            problems.append(f"{SHELL}/{name} is not named after its content: run shell_page.py rename")
        if FILE_URL.search(data):
            problems.append(f"{SHELL}/{name} contains a file URL: those belong in index.html, which is cached for minutes")
        # index.html is also the document at /oauth/callback, where "./static/..." does not exist.
        if stem == "oauth-callback" and prefix != "/":
            problems.append(f"{SHELL}/{name} is loaded with a relative URL: at /oauth/callback it would not load")
        if stem == "shell-boot":
            for attribute in ASSET_ATTRIBUTES:
                value = re.search(rf'\b{attribute}="\./(static/assets/[^"]+)"', attributes)
                if not value:
                    problems.append(f"the shell-boot tag has no {attribute} with a ./static/assets/ URL")
                elif not (root / value.group(1)).is_file():
                    problems.append(f"{attribute} names a file that does not exist: {value.group(1)}")
    if "shell-boot" not in {stem for stem, _, _ in loaded.values()}:
        problems.append("index.html does not load shell-boot")

    tags = COMMENT.sub("", html)
    for file, digest in vendored.items():
        path = root / file
        if not path.is_file():
            problems.append(f"{file} does not exist")
            continue
        actual = "sha256-" + base64.b64encode(hashlib.sha256(path.read_bytes()).digest()).decode()
        if actual != digest:
            problems.append(f"{file} is not the file of its npm package: {actual}, expected {digest}")
        if f'"./{file}"' not in tags:
            problems.append(f"index.html does not load {file}")
        if not (path.parent / "LICENSE").is_file():
            problems.append(f"{Path(file).parent}/ has no LICENSE")
    return problems


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("rename", "check"):
        sys.exit(__doc__)
    try:
        if sys.argv[1] == "rename":
            for old, new in rename(Path(sys.argv[2])):
                print(f"renamed: {SHELL}/{old} -> {new}")
        problems = check(Path(sys.argv[2]))
    except OSError as error:
        sys.exit(str(error))
    if problems:
        sys.exit("\n".join(problems))
