#!/bin/bash

# Smart Copilot Test Setup Script
# This script sets up and tests the Smart Copilot system locally

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_DIR="/Users/jbromfield/workspace/smart-copilot-service"
ASSISTANT_DIR="/Users/jbromfield/workspace/smart-copilot-assistant"
SERVICE_URL="http://127.0.0.1:8000"
DB_URL="postgresql://readonly_user:fweprajfef3423aEIFJSaj4@localhost:5432/smart_copilot_db"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a service is running
is_service_running() {
    curl -s "$SERVICE_URL/health" >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for service to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if is_service_running; then
            print_success "Service is ready!"
            return 0
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done
    
    print_error "Service failed to start within $max_attempts seconds"
    return 1
}

# Function to start the database service
start_service() {
    print_status "Starting Smart Copilot Service..."
    
    # Kill any existing service
    pkill -f "smart_copilot_service" 2>/dev/null || true
    
    # Change to service directory
    cd "$SERVICE_DIR"
    
    # Activate virtual environment and start service
    source venv/bin/activate
    export SMART_COPILOT_POSTGRES_URL="$DB_URL"
    export SMART_COPILOT_POSTGRES_READONLY_URL="$DB_URL"
    export SMART_COPILOT_USE_READONLY_CONNECTION=true
    
    # Start service in background
    nohup python -m smart_copilot_service.main > service.log 2>&1 &
    SERVICE_PID=$!
    
    # Wait for service to be ready
    if wait_for_service; then
        print_success "Service started successfully (PID: $SERVICE_PID)"
        echo "$SERVICE_PID" > service.pid
    else
        print_error "Failed to start service"
        return 1
    fi
}

# Function to compile the extension
compile_extension() {
    print_status "Compiling VS Code extension..."
    
    cd "$ASSISTANT_DIR"
    
    if npm run compile; then
        print_success "Extension compiled successfully"
    else
        print_error "Extension compilation failed"
        return 1
    fi
}

# Function to test database connection
test_database() {
    print_status "Testing database connection..."
    
    if psql -h localhost -U readonly_user -d smart_copilot_db -c "SELECT 1;" >/dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed"
        return 1
    fi
}

# Function to test service endpoints
test_service_endpoints() {
    print_status "Testing service endpoints..."
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    if curl -s "$SERVICE_URL/health" | grep -q "healthy"; then
        print_success "Health endpoint working"
    else
        print_error "Health endpoint failed"
        return 1
    fi
    
    # Test prompt search
    print_status "Testing prompt search..."
    local search_result=$(curl -s -X POST "$SERVICE_URL/api/prompts/search" \
        -H "Content-Type: application/json" \
        -d '{"query": "test", "limit": 3}')
    
    if echo "$search_result" | grep -q "prompts"; then
        local prompt_count=$(echo "$search_result" | jq '.prompts | length')
        print_success "Prompt search working - found $prompt_count prompts"
    else
        print_error "Prompt search failed"
        return 1
    fi
    
    # Test team events
    print_status "Testing team events..."
    local events_result=$(curl -s -X POST "$SERVICE_URL/api/team/events" \
        -H "Content-Type: application/json" \
        -d '{"team_id": "1", "limit": 5}')
    
    if echo "$events_result" | grep -q "events"; then
        print_success "Team events endpoint working"
    else
        print_warning "Team events endpoint returned: $events_result"
    fi
    
    # Test categories
    print_status "Testing categories..."
    local categories_result=$(curl -s "$SERVICE_URL/api/categories")
    
    if echo "$categories_result" | grep -q "categories"; then
        local category_count=$(echo "$categories_result" | jq '.categories | length')
        print_success "Categories endpoint working - found $category_count categories"
    else
        print_error "Categories endpoint failed"
        return 1
    fi
}

# Function to run interactive tests
run_interactive_tests() {
    print_status "Starting interactive test mode..."
    echo ""
    echo "Available test commands:"
    echo "1. search <query> [category_id] - Search prompts"
    echo "2. categories - List all categories"
    echo "3. events <team_id> - Get team events"
    echo "4. health - Check service health"
    echo "5. quit - Exit test mode"
    echo ""
    
    while true; do
        read -p "Enter command: " cmd
        
        case $cmd in
            "quit"|"exit"|"q")
                print_status "Exiting test mode"
                break
                ;;
            "health")
                curl -s "$SERVICE_URL/health" | jq .
                ;;
            "categories")
                curl -s "$SERVICE_URL/api/categories" | jq .
                ;;
            search*)
                query=$(echo "$cmd" | cut -d' ' -f2)
                category_id=$(echo "$cmd" | cut -d' ' -f3)
                
                if [ -n "$category_id" ]; then
                    curl -s -X POST "$SERVICE_URL/api/prompts/search" \
                        -H "Content-Type: application/json" \
                        -d "{\"query\": \"$query\", \"category_id\": $category_id, \"limit\": 5}" | jq .
                else
                    curl -s -X POST "$SERVICE_URL/api/prompts/search" \
                        -H "Content-Type: application/json" \
                        -d "{\"query\": \"$query\", \"limit\": 5}" | jq .
                fi
                ;;
            events*)
                team_id=$(echo "$cmd" | cut -d' ' -f2)
                if [ -n "$team_id" ]; then
                    curl -s -X POST "$SERVICE_URL/api/team/events" \
                        -H "Content-Type: application/json" \
                        -d "{\"team_id\": \"$team_id\", \"limit\": 10}" | jq .
                else
                    print_warning "Please provide team_id: events <team_id>"
                fi
                ;;
            *)
                print_warning "Unknown command: $cmd"
                ;;
        esac
        echo ""
    done
}

# Function to stop the service
stop_service() {
    print_status "Stopping service..."
    
    if [ -f "$SERVICE_DIR/service.pid" ]; then
        local pid=$(cat "$SERVICE_DIR/service.pid")
        if kill "$pid" 2>/dev/null; then
            print_success "Service stopped (PID: $pid)"
        else
            print_warning "Service was not running"
        fi
        rm -f "$SERVICE_DIR/service.pid"
    fi
    
    # Kill any remaining processes
    pkill -f "smart_copilot_service" 2>/dev/null || true
}

# Function to show service logs
show_logs() {
    if [ -f "$SERVICE_DIR/service.log" ]; then
        print_status "Service logs:"
        tail -n 20 "$SERVICE_DIR/service.log"
    else
        print_warning "No service logs found"
    fi
}

# Function to show help
show_help() {
    echo "Smart Copilot Test Setup Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start       - Start the database service and compile extension"
    echo "  test        - Run automated tests"
    echo "  interactive - Run interactive test mode"
    echo "  stop        - Stop the service"
    echo "  logs        - Show service logs"
    echo "  status      - Check service status"
    echo "  help        - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start everything"
    echo "  $0 test                     # Run tests"
    echo "  $0 interactive               # Interactive testing"
    echo "  $0 stop                     # Stop service"
}

# Main script logic
main() {
    # Check dependencies
    if ! command_exists curl; then
        print_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command_exists jq; then
        print_warning "jq is not installed - JSON output will not be formatted"
    fi
    
    if ! command_exists psql; then
        print_warning "psql is not installed - database tests will be skipped"
    fi
    
    # Parse command
    case "${1:-start}" in
        "start")
            print_status "Starting Smart Copilot test environment..."
            test_database
            start_service
            compile_extension
            print_success "Setup complete! Service is running at $SERVICE_URL"
            echo ""
            echo "Next steps:"
            echo "  $0 test        - Run automated tests"
            echo "  $0 interactive - Run interactive tests"
            echo "  $0 stop        - Stop the service"
            ;;
        "test")
            if ! is_service_running; then
                print_error "Service is not running. Run '$0 start' first."
                exit 1
            fi
            test_service_endpoints
            print_success "All tests passed!"
            ;;
        "interactive")
            if ! is_service_running; then
                print_error "Service is not running. Run '$0 start' first."
                exit 1
            fi
            run_interactive_tests
            ;;
        "stop")
            stop_service
            ;;
        "logs")
            show_logs
            ;;
        "status")
            if is_service_running; then
                print_success "Service is running at $SERVICE_URL"
                curl -s "$SERVICE_URL/health" | jq . 2>/dev/null || curl -s "$SERVICE_URL/health"
            else
                print_error "Service is not running"
            fi
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Trap to ensure cleanup on exit (only for start command)
if [ "${1:-start}" = "start" ]; then
    trap 'stop_service' EXIT
fi

# Run main function with all arguments
main "$@"
