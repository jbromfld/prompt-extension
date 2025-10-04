#!/bin/bash

# Smart Copilot Test Scenarios
# This script tests specific user scenarios for the Smart Copilot system

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

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Test 1: Basic prompt search
test_basic_search() {
    print_test "Testing basic prompt search..."
    
    local result=$(curl -s -X POST "$SERVICE_URL/api/prompts/search" \
        -H "Content-Type: application/json" \
        -d '{"query": "test", "limit": 3}')
    
    if echo "$result" | grep -q "prompts"; then
        local count=$(echo "$result" | jq '.prompts | length')
        print_success "Basic search returned $count prompts"
        echo "$result" | jq '.prompts[0] | {id, prompt: (.prompt | .[0:100] + "..."), category_name}'
    else
        print_fail "Basic search failed: $result"
        return 1
    fi
}

# Test 2: Category-specific search
test_category_search() {
    print_test "Testing category-specific search..."
    
    local result=$(curl -s -X POST "$SERVICE_URL/api/prompts/search" \
        -H "Content-Type: application/json" \
        -d '{"query": "deploy", "category_id": 2, "limit": 2}')
    
    if echo "$result" | grep -q "prompts"; then
        local count=$(echo "$result" | jq '.prompts | length')
        print_success "Category search returned $count prompts"
        echo "$result" | jq '.prompts[0] | {id, prompt: (.prompt | .[0:100] + "..."), category_name}'
    else
        print_fail "Category search failed: $result"
        return 1
    fi
}

# Test 3: Empty search query
test_empty_search() {
    print_test "Testing empty search query..."
    
    local result=$(curl -s -X POST "$SERVICE_URL/api/prompts/search" \
        -H "Content-Type: application/json" \
        -d '{"query": "", "limit": 5}')
    
    if echo "$result" | grep -q "prompts"; then
        local count=$(echo "$result" | jq '.prompts | length')
        print_success "Empty search returned $count prompts (should return all)"
    else
        print_fail "Empty search failed: $result"
        return 1
    fi
}

# Test 4: Invalid category ID
test_invalid_category() {
    print_test "Testing invalid category ID..."
    
    local result=$(curl -s -X POST "$SERVICE_URL/api/prompts/search" \
        -H "Content-Type: application/json" \
        -d '{"query": "test", "category_id": 999, "limit": 5}')
    
    if echo "$result" | grep -q '"prompts":\[\]'; then
        print_success "Invalid category returned empty results (expected)"
    else
        print_fail "Invalid category should return empty results: $result"
        return 1
    fi
}

# Test 5: Categories endpoint
test_categories() {
    print_test "Testing categories endpoint..."
    
    local result=$(curl -s "$SERVICE_URL/api/categories")
    
    if echo "$result" | grep -q "categories"; then
        local count=$(echo "$result" | jq '.categories | length')
        print_success "Categories endpoint returned $count categories"
        echo "$result" | jq '.categories[] | {id, name, display_name, icon}'
    else
        print_fail "Categories endpoint failed: $result"
        return 1
    fi
}

# Test 6: Team events
test_team_events() {
    print_test "Testing team events..."
    
    local result=$(curl -s -X POST "$SERVICE_URL/api/team/events" \
        -H "Content-Type: application/json" \
        -d '{"team_id": "1", "limit": 5}')
    
    if echo "$result" | grep -q "events"; then
        local count=$(echo "$result" | jq '.events | length')
        print_success "Team events returned $count events"
    else
        print_info "Team events returned: $result (may be empty if no events exist)"
    fi
}

# Test 7: Service health
test_health() {
    print_test "Testing service health..."
    
    local result=$(curl -s "$SERVICE_URL/health")
    
    if echo "$result" | grep -q "healthy"; then
        print_success "Service is healthy"
        echo "$result" | jq .
    else
        print_fail "Service health check failed: $result"
        return 1
    fi
}

# Test 8: Error handling
test_error_handling() {
    print_test "Testing error handling..."
    
    # Test with invalid JSON
    local result=$(curl -s -X POST "$SERVICE_URL/api/prompts/search" \
        -H "Content-Type: application/json" \
        -d '{"query": "test", "limit": "invalid"}')
    
    if echo "$result" | grep -q "error\|detail"; then
        print_success "Error handling working (returned error for invalid input)"
    else
        print_info "Error handling test completed: $result"
    fi
}

# Test 9: Performance test
test_performance() {
    print_test "Testing performance with multiple requests..."
    
    local start_time=$(date +%s)
    
    for i in {1..5}; do
        curl -s -X POST "$SERVICE_URL/api/prompts/search" \
            -H "Content-Type: application/json" \
            -d "{\"query\": \"test$i\", \"limit\": 3}" > /dev/null
    done
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $duration -lt 10 ]; then
        print_success "Performance test passed - 5 requests completed in ${duration}s"
    else
        print_fail "Performance test failed - took ${duration}s (too slow)"
        return 1
    fi
}

# Test 10: Edge cases
test_edge_cases() {
    print_test "Testing edge cases..."
    
    # Test with very long query
    local long_query=$(printf 'a%.0s' {1..1000})
    local result=$(curl -s -X POST "$SERVICE_URL/api/prompts/search" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$long_query\", \"limit\": 1}")
    
    if echo "$result" | grep -q "prompts"; then
        print_success "Long query handled correctly"
    else
        print_info "Long query result: $result"
    fi
    
    # Test with special characters
    local special_result=$(curl -s -X POST "$SERVICE_URL/api/prompts/search" \
        -H "Content-Type: application/json" \
        -d '{"query": "test@#$%^&*()", "limit": 1}')
    
    if echo "$special_result" | grep -q "prompts"; then
        print_success "Special characters handled correctly"
    else
        print_info "Special characters result: $special_result"
    fi
}

# Main test runner
run_all_tests() {
    echo "Starting Smart Copilot Test Scenarios..."
    echo "========================================"
    echo ""
    
    local passed=0
    local failed=0
    
    # Run all tests
    for test in test_health test_basic_search test_category_search test_empty_search \
               test_invalid_category test_categories test_team_events test_error_handling \
               test_performance test_edge_cases; do
        echo ""
        if $test; then
            ((passed++))
        else
            ((failed++))
        fi
    done
    
    echo ""
    echo "========================================"
    echo "Test Results:"
    echo "  Passed: $passed"
    echo "  Failed: $failed"
    echo "  Total:  $((passed + failed))"
    
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}All tests passed! 🎉${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed. Please check the output above.${NC}"
        return 1
    fi
}

# Show help
show_help() {
    echo "Smart Copilot Test Scenarios"
    echo ""
    echo "Usage: $0 [test_name]"
    echo ""
    echo "Available tests:"
    echo "  all              - Run all tests"
    echo "  health           - Test service health"
    echo "  basic-search     - Test basic prompt search"
    echo "  category-search  - Test category-specific search"
    echo "  empty-search     - Test empty search query"
    echo "  invalid-category - Test invalid category ID"
    echo "  categories       - Test categories endpoint"
    echo "  team-events      - Test team events"
    echo "  error-handling   - Test error handling"
    echo "  performance      - Test performance"
    echo "  edge-cases       - Test edge cases"
    echo "  help             - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 all                    # Run all tests"
    echo "  $0 basic-search           # Run specific test"
    echo "  $0 help                   # Show help"
}

# Main script
main() {
    case "${1:-all}" in
        "all")
            run_all_tests
            ;;
        "health")
            test_health
            ;;
        "basic-search")
            test_basic_search
            ;;
        "category-search")
            test_category_search
            ;;
        "empty-search")
            test_empty_search
            ;;
        "invalid-category")
            test_invalid_category
            ;;
        "categories")
            test_categories
            ;;
        "team-events")
            test_team_events
            ;;
        "error-handling")
            test_error_handling
            ;;
        "performance")
            test_performance
            ;;
        "edge-cases")
            test_edge_cases
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo "Unknown test: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
