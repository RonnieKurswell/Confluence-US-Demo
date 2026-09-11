#!/usr/bin/env bash
# Unlock AI Value — upload the built demo to S3 static hosting.
#
#   ./upload-to-s3.sh my-bucket-name [optional/prefix]
#
# Content types are set explicitly per file group. This is the whole reason the
# script exists: `aws s3 sync` guesses from the extension and gets .mp4 and
# .woff2 wrong often enough that the films silently fall back to their posters
# and the headline paints in a fallback face. Guessing is not worth the risk on
# a client-facing demo.
set -euo pipefail

BUCKET="${1:?usage: ./upload-to-s3.sh <bucket> [prefix]}"
PREFIX="${2:-}"
SRC="$(cd "$(dirname "$0")/site" && pwd)"
DEST="s3://${BUCKET}${PREFIX:+/$PREFIX}"

echo "Uploading $SRC -> $DEST"

# Fingerprinted assets and media: cache hard, they never change in place.
aws s3 sync "$SRC" "$DEST" --delete \
  --exclude "*.html" \
  --exclude "*.mp4" --exclude "*.woff2" --exclude "*.jpg" --exclude "*.png" \
  --cache-control "public,max-age=31536000,immutable"

aws s3 sync "$SRC" "$DEST" --exclude "*" --include "*.mp4" \
  --content-type "video/mp4" \
  --cache-control "public,max-age=31536000,immutable"

aws s3 sync "$SRC" "$DEST" --exclude "*" --include "*.woff2" \
  --content-type "font/woff2" \
  --cache-control "public,max-age=31536000,immutable"

aws s3 sync "$SRC" "$DEST" --exclude "*" --include "*.jpg" --include "*.jpeg" \
  --content-type "image/jpeg" \
  --cache-control "public,max-age=2592000"

aws s3 sync "$SRC" "$DEST" --exclude "*" --include "*.png" \
  --content-type "image/png" \
  --cache-control "public,max-age=2592000"

# index.html last and uncached, so a redeploy is picked up rather than served
# from a stale cache pointing at assets that no longer exist.
aws s3 cp "$SRC/index.html" "$DEST/index.html" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache,must-revalidate"

echo
echo "Done. If this bucket is not set up for static hosting yet:"
echo "  aws s3 website s3://${BUCKET} --index-document index.html"
echo "and make the objects readable (bucket policy or CloudFront OAC)."
