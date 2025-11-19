#!/bin/bash
set -euo pipefail

# Package the Effect Best Practices skill for distribution

ROOT_DIR=$(cd -- "$(dirname -- "$0")/.." && pwd)
SKILL_NAME="effect-best-practices"
DIST_DIR="${ROOT_DIR}/dist"
SKILL_DIR="${DIST_DIR}/${SKILL_NAME}"
REFERENCES_DIR="${ROOT_DIR}/packages/website/references"

if [[ ! -d "${REFERENCES_DIR}" ]]; then
  echo "References directory not found at ${REFERENCES_DIR}" >&2
  exit 1
fi

# Sync the CLI reference manifest with the current markdown files
node "${ROOT_DIR}/scripts/update-reference-manifest.mjs"

rm -rf "${DIST_DIR}"
mkdir -p "${SKILL_DIR}/references"

cp "${ROOT_DIR}/SKILL.md" "${SKILL_DIR}/"

find "${REFERENCES_DIR}" -type f \( -name '*.md' -o -name '*.mdx' \) -print0 \
  | while IFS= read -r -d '' file; do
    rel_path=${file#"${REFERENCES_DIR}/"}
    dest_dir="${SKILL_DIR}/references/$(dirname "${rel_path}")"
    mkdir -p "${dest_dir}"
    cp "${file}" "${dest_dir}/"
  done

(
  cd "${DIST_DIR}"
  zip -r "${SKILL_NAME}.zip" "${SKILL_NAME}" >/dev/null
)

echo "✓ Skill packaged to ${DIST_DIR}/${SKILL_NAME}.zip"
echo
echo "To install:"
echo "  1. Extract ${SKILL_NAME}.zip"
echo "  2. Move ${SKILL_NAME}/ to ~/.claude/skills/"
echo "  3. Restart Claude Code"
