#!/bin/bash

VERSION=${1:-latest}
IMAGE_NAME="rpa4web-frontend"
FULL_IMAGE_NAME="${IMAGE_NAME}:${VERSION}"

docker build -t "${FULL_IMAGE_NAME}" -f Dockerfile .

if [ $? -eq 0 ]; then
    if [ "${VERSION}" != "latest" ]; then
        docker tag "${FULL_IMAGE_NAME}" "${IMAGE_NAME}:latest"
    fi
else
    exit 1
fi
