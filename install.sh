#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH."
  exit 1
fi

echo "Installing extension dependencies..."
cd "${SCRIPT_DIR}"
npm install

echo "Compiling extension..."
npm run compile

echo "Installing prompt-service backend dependencies..."
"${SCRIPT_DIR}/install-service.sh"

if command -v code >/dev/null 2>&1; then
  echo "Packaging extension VSIX..."
  set +e
  npm run vsix:build
  PACKAGE_EXIT=$?
  set -e

  if [[ ${PACKAGE_EXIT} -eq 0 ]]; then
    VSIX_PATH="$(ls -t "${SCRIPT_DIR}"/*.vsix | head -n 1)"

    if [[ -n "${VSIX_PATH}" ]]; then
      echo "Installing VSIX: ${VSIX_PATH}"
      code --install-extension "${VSIX_PATH}" --force
      echo "Extension installed in VS Code."
    else
      echo "No VSIX was produced. Skipping VS Code install step."
    fi
  else
    echo "VSIX packaging failed (likely Node runtime mismatch)."
    echo "Dependencies and compile steps completed; install manually after upgrading Node if needed."
  fi
else
  echo "VS Code CLI (code) not found. Skipping VSIX install step."
fi

echo "Smart Copilot prompt-library setup complete."
