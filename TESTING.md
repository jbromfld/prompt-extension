# Smart Copilot Testing Guide

This guide explains how to test the Smart Copilot system locally using the provided test scripts.

## Quick Start

### 1. Start Everything
```bash
./test-setup.sh start
```
This will:
- Start the Smart Copilot Service
- Compile the VS Code extension
- Test database connection
- Verify service is running

### 2. Run Tests
```bash
./test-scenarios.sh all
```
This will run comprehensive tests covering all functionality.

## Test Scripts

### `test-setup.sh` - Main Setup Script

**Commands:**
- `./test-setup.sh start` - Start service and compile extension
- `./test-setup.sh test` - Run automated tests
- `./test-setup.sh interactive` - Interactive testing mode
- `./test-setup.sh stop` - Stop the service
- `./test-setup.sh logs` - Show service logs
- `./test-setup.sh status` - Check service status

**Interactive Mode:**
```bash
./test-setup.sh interactive
```
Available commands in interactive mode:
- `search <query> [category_id]` - Search prompts
- `categories` - List all categories
- `events <team_id>` - Get team events
- `health` - Check service health
- `quit` - Exit

### `test-scenarios.sh` - Specific Test Scenarios

**Run All Tests:**
```bash
./test-scenarios.sh all
```

**Individual Tests:**
```bash
./test-scenarios.sh health           # Service health check
./test-scenarios.sh basic-search     # Basic prompt search
./test-scenarios.sh category-search # Category-specific search
./test-scenarios.sh empty-search   # Empty search query
./test-scenarios.sh invalid-category # Invalid category ID
./test-scenarios.sh categories      # Categories endpoint
./test-scenarios.sh team-events      # Team events
./test-scenarios.sh error-handling  # Error handling
./test-scenarios.sh performance     # Performance test
./test-scenarios.sh edge-cases      # Edge cases
```

## Test Scenarios Covered

### 1. Basic Functionality
- ✅ Service health check
- ✅ Database connection
- ✅ Basic prompt search
- ✅ Category-specific search
- ✅ Categories listing

### 2. Error Handling
- ✅ Invalid category IDs
- ✅ Empty search queries
- ✅ Malformed requests
- ✅ Service unavailability

### 3. Performance
- ✅ Multiple concurrent requests
- ✅ Response time validation
- ✅ Resource usage

### 4. Edge Cases
- ✅ Long queries
- ✅ Special characters
- ✅ Unicode handling
- ✅ Large result sets

## Example Test Output

### Successful Test Run:
```
[TEST] Testing service health...
[PASS] Service is healthy

[TEST] Testing basic prompt search...
[PASS] Basic search returned 3 prompts

[TEST] Testing category-specific search...
[PASS] Category search returned 2 prompts

========================================
Test Results:
  Passed: 10
  Failed: 0
  Total:  10

All tests passed! 🎉
```

### Interactive Testing:
```bash
$ ./test-setup.sh interactive

[INFO] Starting interactive test mode...

Available test commands:
1. search <query> [category_id] - Search prompts
2. categories - List all categories
3. events <team_id> - Get team events
4. health - Check service health
5. quit - Exit test mode

Enter command: search test
{
  "prompts": [
    {
      "id": "10000000-0000-0000-0000-000000000011",
      "prompt": "Write a unit test for the following function...",
      "category_name": "test"
    }
  ]
}

Enter command: categories
{
  "categories": [
    {
      "id": 1,
      "name": "test",
      "display_name": "Test",
      "icon": "🧪"
    }
  ]
}

Enter command: quit
[INFO] Exiting test mode
```

## Troubleshooting

### Service Won't Start
```bash
# Check if port 8000 is in use
lsof -i :8000

# Check service logs
./test-setup.sh logs

# Stop and restart
./test-setup.sh stop
./test-setup.sh start
```

### Database Connection Issues
```bash
# Test database connection directly
psql -h localhost -U readonly_user -d smart_copilot_db -c "SELECT 1;"

# Check if PostgreSQL is running
brew services list | grep postgresql
```

### Extension Compilation Issues
```bash
# Check Node.js version
node --version

# Install dependencies
npm install

# Clean and recompile
rm -rf out/
npm run compile
```

## Service Configuration

The service uses these environment variables:
- `SMART_COPILOT_POSTGRES_URL` - Database connection string
- `SMART_COPILOT_POSTGRES_READONLY_URL` - Read-only database connection
- `SMART_COPILOT_USE_READONLY_CONNECTION` - Use read-only connection

These are automatically set by the test scripts.

## API Endpoints Tested

- `GET /health` - Service health check
- `POST /api/prompts/search` - Search prompts
- `GET /api/categories` - List categories
- `POST /api/team/events` - Get team events

## Expected Database Schema

The tests expect these tables to exist:
- `prompt_templates` - Prompt templates
- `prompt_categories` - Categories
- `deploy_table` - Deployment events
- `test_table` - Test events
- `team` - Teams

## Cleanup

To stop everything:
```bash
./test-setup.sh stop
```

This will:
- Stop the service
- Clean up process files
- Remove temporary files
