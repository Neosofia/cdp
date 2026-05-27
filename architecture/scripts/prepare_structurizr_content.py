#!/usr/bin/env python3
"""Build Structurizr viewer content from canonical repo documentation.

Canonical markdown is left untouched in the repo. This script mirrors configured
source paths into the output directory, demoting every Markdown heading by one
level (Structurizr hides ``#``), and optionally rewriting image paths for
embedded assets.
"""

from __future__ import annotations

import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

HEADING_RE = re.compile(r"^(#{1,5})\s+(.*)$")
MARKDOWN_LINK_RE = re.compile(r"(\[[^\]]*\]\()([^)]+)(\))")
MARKDOWN_SUFFIXES = {".md", ".markdown"}

# Markdown image targets like ](architecture/structurizr/images/foo.png) become
# ](foo.png) so they match Structurizr imports from structurizr/images/.
IMAGE_PATH_PREFIXES = (
    "architecture/structurizr/images/",
)

# Structurizr resolves markdown links under /workspace/1/documentation/. Parent
# segments (../) escape that namespace; collection roots have no index page.
STRUCTURIZR_DECISIONS_PATH = "/workspace/1/decisions"
VIEWER_COLLECTION_ROUTES: dict[str, str] = {
    "architecture/adrs": STRUCTURIZR_DECISIONS_PATH,
    "adrs": STRUCTURIZR_DECISIONS_PATH,
    "specs": "specs/001-chat-service.md",
}
ADR_FILE_RE = re.compile(r"^(?:architecture/)?adrs/(\d+)-[^/]+\.md$")


@dataclass(frozen=True)
class ContentSource:
    """Map a repo path (file or directory) into the Structurizr content tree."""

    src: Path
    dest: Path
    rewrite_images: bool = False


# Default CDP layout — add entries here rather than bespoke transform functions.
DEFAULT_SOURCES: tuple[ContentSource, ...] = (
    ContentSource(Path("README.md"), Path("README.md"), rewrite_images=True),
    ContentSource(Path("architecture/constitution.md"), Path("constitution.md")),
    ContentSource(Path("specs"), Path("specs")),
)


def demote_headings(text: str) -> str:
    """Demote every Markdown heading by one level (h1→h2 … h5→h6)."""
    lines = []
    for line in text.splitlines():
        match = HEADING_RE.match(line)
        if match:
            lines.append(f"#{match.group(1)} {match.group(2)}")
        else:
            lines.append(line)
    trailing = "\n" if text.endswith("\n") else ""
    return "\n".join(lines) + trailing


def rewrite_image_paths(text: str, prefixes: tuple[str, ...] = IMAGE_PATH_PREFIXES) -> str:
    for prefix in prefixes:
        text = text.replace(f"]({prefix}", "](")
    return text


def resolve_content_relative_path(link_path: str, source_rel: Path) -> str:
    """Resolve a repo-relative markdown target to a Structurizr-safe path."""
    path_part, sep, anchor = link_path.partition("#")
    if not path_part:
        return link_path

    stack = list(source_rel.parent.parts)
    for part in Path(path_part).parts:
        if part == "..":
            if stack:
                stack.pop()
        elif part != ".":
            stack.append(part)

    normalized = Path(*stack).as_posix() if stack else "."
    if normalized not in {".", ""}:
        normalized = normalized.rstrip("/")

    adr_match = ADR_FILE_RE.match(normalized)
    if adr_match:
        routed = f"{STRUCTURIZR_DECISIONS_PATH}/{int(adr_match.group(1))}"
    else:
        routed = VIEWER_COLLECTION_ROUTES.get(normalized, normalized)

    # When rendering a spec page, keep spec-to-spec links sibling-relative.
    if source_rel.parts and source_rel.parts[0] == "specs" and routed.startswith("specs/"):
        routed = routed[len("specs/") :]
    if sep:
        return f"{routed}#{anchor}"
    return routed


def rewrite_markdown_links(text: str, source_rel: Path) -> str:
    """Rewrite relative markdown links for Structurizr's documentation URL space."""

    def repl(match: re.Match[str]) -> str:
        prefix, target, suffix = match.group(1), match.group(2), match.group(3)
        if target.startswith(("http://", "https://", "mailto:", "#")):
            return match.group(0)
        if target.startswith("/"):
            return match.group(0)
        return f"{prefix}{resolve_content_relative_path(target, source_rel)}{suffix}"

    return MARKDOWN_LINK_RE.sub(repl, text)


def transform_markdown(
    text: str,
    *,
    source_rel: Path,
    rewrite_images: bool = False,
) -> str:
    text = demote_headings(text)
    text = rewrite_markdown_links(text, source_rel)
    if rewrite_images:
        text = rewrite_image_paths(text)
    return text


def iter_source_files(repo_root: Path, source: ContentSource) -> list[tuple[Path, Path]]:
    """Return (absolute_src, output_dest) pairs for a content source."""
    src_root = repo_root / source.src
    if not src_root.exists():
        raise FileNotFoundError(f"Missing content source: {src_root}")

    pairs: list[tuple[Path, Path]] = []
    if src_root.is_file():
        pairs.append((src_root, source.dest))
        return pairs

    for path in sorted(src_root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(src_root)
        pairs.append((path, source.dest / rel))
    return pairs


def clean_output_dir(output_dir: Path) -> None:
    for path in output_dir.iterdir():
        if path.name in {".gitkeep", ".gitignore"}:
            continue
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()


def prepare(
    repo_root: Path,
    output_dir: Path,
    sources: tuple[ContentSource, ...] = DEFAULT_SOURCES,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    clean_output_dir(output_dir)

    for source in sources:
        for src_path, dest_rel in iter_source_files(repo_root, source):
            dest_path = output_dir / dest_rel
            dest_path.parent.mkdir(parents=True, exist_ok=True)

            if src_path.suffix.lower() in MARKDOWN_SUFFIXES:
                text = src_path.read_text(encoding="utf-8")
                dest_path.write_text(
                    transform_markdown(
                        text,
                        source_rel=dest_rel,
                        rewrite_images=source.rewrite_images,
                    ),
                    encoding="utf-8",
                )
            else:
                shutil.copy2(src_path, dest_path)


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "Usage: prepare_structurizr_content.py <repo-root> <output-dir>",
            file=sys.stderr,
        )
        return 1

    repo_root = Path(sys.argv[1]).resolve()
    output_dir = Path(sys.argv[2]).resolve()
    prepare(repo_root, output_dir)
    print(f"Prepared Structurizr content in {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
