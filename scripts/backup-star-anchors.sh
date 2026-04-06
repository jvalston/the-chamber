#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-/mnt/c/Users/natza/Desktop/mission-control/agents}"
ROOT="${2:-$HOME/constellation-archives/mission-control/star-anchors}"
TS="$(date +%Y%m%d-%H%M%S)"
SNAP="$ROOT/snapshots/$TS"
LATEST="$ROOT/latest"

if [ ! -d "$SRC" ]; then
  echo "Source agents directory not found: $SRC"
  exit 1
fi

mkdir -p "$SNAP"

# Copy only anchor files (IDENTITY/SOUL/USER).
while IFS= read -r -d '' f; do
  rel="${f#$SRC/}"
  dir="$(dirname "$rel")"
  mkdir -p "$SNAP/$dir"
  cp -f "$f" "$SNAP/$rel"
done < <(find "$SRC" -mindepth 2 -maxdepth 2 -type f \( -name "IDENTITY.md" -o -name "SOUL.md" -o -name "USER.md" \) -print0)

count="$(find "$SNAP" -type f | wc -l | tr -d ' ')"
sha="$(tar -cf - -C "$SNAP" . | sha256sum | awk '{print $1}')"

cat > "$SNAP/MANIFEST.json" <<EOF
{
  "snapshot": "$TS",
  "createdAt": "$(date -Iseconds)",
  "source": "$SRC",
  "fileCount": $count,
  "integritySha256": "$sha"
}
EOF

rm -rf "$LATEST"
mkdir -p "$LATEST"
cp -a "$SNAP/." "$LATEST/"

echo "Backup complete."
echo "Snapshot: $SNAP"
echo "Latest:   $LATEST"
cat "$SNAP/MANIFEST.json"
