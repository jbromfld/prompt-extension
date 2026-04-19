# Smart Copilot Assistant

Prompt-library-first VS Code extension for GitHub Copilot.

## Architecture

Microservice boundary:
- `prompt-extension` (VS Code extension UI and Copilot insertion)
- `prompt-service` (prompt search, categories, usage, feedback)

```text
VS Code Extension (prompt-extension)
  -> HTTP API calls
prompt-service (prompt + feedback)
  -> PostgreSQL
```

## Installation

### 1. One-command setup

```bash
./install.sh
```

This command:
- Installs extension dependencies
- Compiles the extension
- Installs `prompt-service` Python dependencies
- Packages and installs the VSIX (if `code` CLI is available)

### 2. Backend dependencies only

```bash
./install-service.sh
```

## Configure

Set these VS Code settings:

```json
{
  "smartCopilot.promptService.url": "http://127.0.0.1:8090",
  "smartCopilot.user.id": "your-user-id"
}
```

- `smartCopilot.promptService.url`: required endpoint for prompt APIs
- `smartCopilot.user.id`: optional attribution for usage and ratings

## Development

```bash
npm install
npm run compile
npm run watch
```

Start backend API from `prompt-service`:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8090 --reload
```

## Prompt-Service Contract Used

- `GET /health`
- `GET /categories`
- `GET /prompts/search?q=...&limit=...&category=...`
- `GET /prompts/popular?limit=...&category=...`
- `POST /prompts/usage`
- `POST /prompts/{prompt_id}/rate?rating=...&actor=...`
