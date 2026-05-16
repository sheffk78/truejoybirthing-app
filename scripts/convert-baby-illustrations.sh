#!/bin/bash
# Convert pregnancy week illustrations from PNG to WebP
# Source: Kit/life/brands/TrueJoyBirthing/assets/illustrations/pregnancy-series/week-{NN}/pregnancy-week-{NN}-approved.png
# Target: frontend/assets/illustrations/pregnancy-series/pregnancy-week-{NN}-approved.webp
#
# Prerequisites: `cwebp` (from Google's libwebp package)
#   - macOS: brew install webp
#   - Ubuntu: apt install webp
#
# Usage: bash scripts/convert-baby-illustrations.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source directory (relative to workspace)
SOURCE_BASE="${PROJECT_ROOT}/../assets/illustrations/pregnancy-series"
# Target directory  
TARGET_DIR="${PROJECT_ROOT}/frontend/assets/illustrations/pregnancy-series"

mkdir -p "$TARGET_DIR"

echo "Converting pregnancy week illustrations to WebP..."
echo "Source: $SOURCE_BASE"
echo "Target: $TARGET_DIR"
echo ""

for WEEK in $(seq 4 40); do
    WEEK_PAD=$(printf "%02d" $WEEK)
    
    # Week 20 uses "anchor" variant
    if [ "$WEEK" -eq 20 ]; then
        SRC_FILE="${SOURCE_BASE}/week-${WEEK_PAD}/pregnancy-week-${WEEK_PAD}-anchor-approved.png"
        DST_FILE="${TARGET_DIR}/pregnancy-week-${WEEK_PAD}-anchor-approved.webp"
    else
        SRC_FILE="${SOURCE_BASE}/week-${WEEK_PAD}/pregnancy-week-${WEEK_PAD}-approved.png"
        DST_FILE="${TARGET_DIR}/pregnancy-week-${WEEK_PAD}-approved.webp"
    fi
    
    if [ -f "$SRC_FILE" ]; then
        echo "✓ Week $WEEK: Converting $(basename "$SRC_FILE")"
        cwebp -q 90 -resize 1600 1600 "$SRC_FILE" -o "$DST_FILE" 2>/dev/null
    else
        echo "✗ Week $WEEK: Source not found at $(basename "$SRC_FILE")"
    fi
done

echo ""
echo "Done! WebP files saved to: $TARGET_DIR"
echo ""
echo "After running this script, you'll need to:"
echo "1. Import the images in the app's asset bundling (metro.config.js or similar)"
echo "2. Update babyDevelopmentData.ts to use require() or asset references"
echo "3. Replace the image placeholder UI with actual <Image> components"