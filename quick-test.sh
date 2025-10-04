#!/bin/bash

# Quick Test Script - Run tests without stopping service
# This script runs tests while keeping the service running

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SERVICE_URL="http://127.0.0.1:8000"

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Check if service is running
check_service() {
    if curl -s "$SERVICE_URL/health" >/dev/null 2>&1; then
        return 0
    else
        print_fail "Service is not running. Please run './test-setup.sh start' first."
        exit 1
    fi
}

# Test basic functionality
test_basic() {
    print_test "Testing basic functionality..."
    
    # Health check
    local health=$(curl -s "$SERVICE_URL/health")
    if echo "$health" | grep -q "healthy"; then
        print_success "Service is healthy"
    else
        print_fail "Service health check failed"
        return 1
    fi
    
    # Basic search
    local search_result=$(curl -s -X POST "$SERVICE_URL/api/prompts/search" \
        -H "Content-Type: application/json" \
        -d '{"query": "test", "limit": 3}')
    
    if echo "$search_result" | grep -q "prompts"; then
        local count=$(echo "$search_result" | jq '.prompts | length')
        print_success "Found $count prompts"
        
        # Show first prompt
        echo "$search_result" | jq '.prompts[0] | {id, prompt: (.prompt | .[0:80] + "..."), category_name}'
    else
        print_fail "Search failed: $search_result"
        return 1
    fi
    
    # Categories
    local categories=$(curl -s "$SERVICE_URL/api/categories")
    if echo "$categories" | grep -q "categories"; then
        local cat_count=$(echo "$categories" | jq '.categories | length')
        print_success "Found $cat_count categories"
    else
        print_fail "Categories failed: $categories"
        return 1
    fi
}

# Test specific scenarios
test_scenarios() {
    print_test "Testing specific scenarios..."
    
    # Test 1: Search with category
    print_test "Testing category-specific search..."
    local cat_search=$(curl -s -X POST "$SERVICE_URL/api/prompts/search" \
        -H "Content-Type: application/json" \
        -d '{"query": "test", "category_id": 1, "limit": 2}')
    
    if echo "$cat_search" | grep -q "prompts"; then
        print_success "Category search working"
    else
        print_fail "Category search failed: $cat_search"
    fi
    
    # Test 2: Empty search
    print_test "Testing empty search..."
    local empty_search=$(curl -s -X POST "$SERVICE_URL/api/prompts/search" \
        -H "Content-Type: application/json" \
        -d '{"query": "", "limit": 5}')
    
    if echo "$empty_search" | grep -q "prompts"; then
        print_success "Empty search working"
    else
        print_fail "Empty search failed: $empty_search"
    fi
    
    # Test 3: Invalid category
    print_test "Testing invalid category..."
    local invalid_cat=$(curl -s -X POST "$SERVICE_URL/api/prompts/search" \
        -H "Content-Type: application/json" \
        -d '{"query": "test", "category_id": 999, "limit": 5}')
    
    if echo "$invalid_cat" | grep -q '"prompts":\[\]'; then
        print_success "Invalid category handled correctly"
    else
        print_fail "Invalid category not handled: $invalid_cat"
    fi
}

# Interactive mode
interactive_mode() {
    print_test "Starting interactive mode..."
    echo ""
    echo "Available commands:"
    echo "  search <query> [category_id] - Search prompts"
    echo "  categories                  - List categories"
    echo "  health                      - Check health"
    echo "  quit                        - Exit"
    echo ""
    
    while true; do
        read -p "Enter command: " cmd
        
        case $cmd in
            "quit"|"exit"|"q")
                print_test "Exiting interactive mode"
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
            *)
                print_fail "Unknown command: $cmd"
                ;;
        esac
        echo ""
    done
}

# Main function
main() {
    check_service
    
    case "${1:-basic}" in
        "basic")
            test_basic
            ;;
        "scenarios")
            test_scenarios
            ;;
        "interactive")
            interactive_mode
            ;;
        "all")
            test_basic
            echo ""
            test_scenarios
            ;;
        "help"|"-h"|"--help")
            echo "Quick Test Script"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  basic       - Run basic tests (default)"
            echo "  scenarios   - Run scenario tests"
            echo "  interactive - Interactive testing mode"
            echo "  all         - Run all tests"
            echo "  help        - Show this help"
            echo ""
            echo "Examples:"
            echo "  $0                    # Run basic tests"
            echo "  $0 scenarios          # Run scenario tests"
            echo "  $0 interactive        # Interactive mode"
            echo "  $0 all               # Run all tests"
            ;;
        *)
            print_fail "Unknown command: $1"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

main "$@"
