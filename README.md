# Smart Copilot Assistant

An intelligent VS Code extension that enhances GitHub Copilot with smart prompt suggestions, team collaboration, and RAG-powered error resolution.

## 🚀 Features

### 🔍 Smart Prompt Search
- Intelligent prompt suggestions based on context
- Filter prompts by type (test, deploy, build, docs)
- Usage tracking and popularity ranking
- Copy to clipboard or send directly to Copilot

### 📊 Team Collaboration
- Monitor team events and failures
- One-click error remediation with enhanced context
- RAG-powered similar case suggestions
- Automated log fetching and analysis

### 🤖 AI-Powered Error Resolution
- Automatic error parsing and classification
- Similar case search using vector embeddings
- Context-aware prompt enhancement
- Intelligent remediation suggestions

## 📦 Installation

### 1. Install the VS Code Extension
```bash
# Install from .vsix file
code --install-extension smart-copilot-assistant.vsix
```

### 2. Install the Python Service
```bash
# Option A: Use the installation script
./install-service.sh

# Option B: Manual installation
pip install smart-copilot-service

# Option C: Install from source
cd smart-copilot-service
pip install -e .
```

### 3. Set Up Database (Optional)
```bash
# Create PostgreSQL database
createdb smart_copilot_db

# Initialize schema
psql -d smart_copilot_db -f sql/postgres_schema.sql
```

## ⚙️ Configuration

### VS Code Settings
```json
{
  "smartCopilot.user.id": "your-user-id",
  "smartCopilot.user.teamId": "your-team-id",
  "smartCopilot.features.promptSearch": true,
  "smartCopilot.features.teamEvents": true,
  "smartCopilot.cache.syncInterval": 24,
  "smartCopilot.database.postgresUrl": "postgresql://localhost:5432/smart_copilot_db",
  "smartCopilot.service.type": "local",
  "smartCopilot.service.localUrl": "http://127.0.0.1:8000"
}
```

### Python Service Environment Variables
```bash
export SMART_COPILOT_POSTGRES_URL="postgresql://localhost:5432/smart_copilot_db"
export SMART_COPILOT_API_HOST="127.0.0.1"
export SMART_COPILOT_API_PORT="8000"
export SMART_COPILOT_LOG_LEVEL="INFO"
```

## 🏗️ Architecture

### Local Service Mode (Recommended)
```
VS Code Extension ←→ Python Service ←→ PostgreSQL
                        ↓
                   RAG Vector Store
```

### Serverless Mode
```
VS Code Extension ←→ Cloud API ←→ PostgreSQL
                          ↓
                   RAG Vector Store
```

## 🛠️ Development

### Extension Development
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Start development mode
npm run watch

# Debug in VS Code
# Press F5 to launch Extension Development Host
```

### Python Service Development
```bash
cd smart-copilot-service

# Install in development mode
pip install -e .

# Run service
python -m smart_copilot_service.main

# Run tests
pytest
```

## 🌐 Deployment Options

### 1. Local Development
- Python service runs locally
- Direct database connection
- Full feature set available

### 2. Serverless Deployment
- Deploy Python service to AWS Lambda/Vercel
- Use cloud database
- Reduced latency, always available

### 3. Hybrid Approach
- Local fallback with cloud features
- Best of both worlds

## 📋 Requirements

### Extension
- VS Code 1.74.0 or higher
- Node.js 16.x or higher

### Python Service
- Python 3.8 or higher
- PostgreSQL 13+ (optional)
- 512MB RAM minimum

## 🚀 Quick Start

1. **Install the extension** in VS Code
2. **Install the Python service**: `pip install smart-copilot-service`
3. **Configure settings** in VS Code preferences
4. **Open the Smart Copilot panel** from the Explorer or status bar
5. **Start using** smart prompts and error resolution!

## 🔧 Troubleshooting

### Service Not Starting
```bash
# Check if service is installed
pip show smart-copilot-service

# Start manually
smart-copilot-service

# Check logs
export SMART_COPILOT_LOG_LEVEL=DEBUG
smart-copilot-service
```

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -d smart_copilot_db -c "SELECT 1;"

# Check connection string format
# postgresql://username:password@host:port/database
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: [Wiki](https://github.com/your-repo/wiki)
- **Discussions**: GitHub Discussions
