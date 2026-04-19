#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_SERVICE_DIR="${SCRIPT_DIR}/../prompt-service"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but was not found in PATH."
  exit 1
fi

if ! command -v pip3 >/dev/null 2>&1; then
  echo "pip3 is required but was not found in PATH."
  exit 1
fi

echo "Installing prompt-service dependencies..."

if [[ ! -d "${PROMPT_SERVICE_DIR}" ]]; then
  echo "prompt-service directory not found at ${PROMPT_SERVICE_DIR}"
  exit 1
fi

if [[ ! -f "${PROMPT_SERVICE_DIR}/requirements.txt" ]]; then
  echo "requirements.txt not found in ${PROMPT_SERVICE_DIR}"
  exit 1
fi

pip3 install -r "${PROMPT_SERVICE_DIR}/requirements.txt"

echo "prompt-service dependency installation complete."
echo "Run service with: uvicorn app.main:app --host 0.0.0.0 --port 8090 --reload"
