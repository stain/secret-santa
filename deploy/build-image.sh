#!/bin/sh
# Builds the app's container image and saves it for deploy/site.yml to upload:
#   dist/secret-santa-image.tar.gz   the image
#   dist/secret-santa-image.id       its ID, so unchanged images aren't uploaded again
# Uses Podman, or Docker if Podman isn't installed. Pulls the latest Node.js 24
# base image, so rebuilding also picks up Node.js security releases.
# The server is x86-64 (amd64); set PLATFORM=linux/arm64 for an ARM server.
set -eu
cd "$(dirname "$0")/.."
ENGINE=${ENGINE:-$(command -v podman || command -v docker)}
PLATFORM=${PLATFORM:-linux/amd64}
IMAGE=localhost/secret-santa:latest

"$ENGINE" build --pull --platform "$PLATFORM" --tag "$IMAGE" .
mkdir -p dist
"$ENGINE" save "$IMAGE" | gzip > dist/secret-santa-image.tar.gz.new
mv dist/secret-santa-image.tar.gz.new dist/secret-santa-image.tar.gz
"$ENGINE" image inspect --format '{{.Id}}' "$IMAGE" > dist/secret-santa-image.id
echo "Built $(cat dist/secret-santa-image.id) -> dist/secret-santa-image.tar.gz ($(du -h dist/secret-santa-image.tar.gz | cut -f1))"
