#!/usr/bin/env node

// Test script to check API response format
const https = require('https');
const http = require('http');

const API_BASE = 'http://127.0.0.1:8000';

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port: 8000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testAPI() {
    console.log('🔍 Testing API Response Format');
    console.log('==============================');

    try {
        // Test 1: Get categories
        console.log('\n📋 Testing categories endpoint...');
        const categoriesResponse = await makeRequest('/api/categories');
        console.log('Categories response:', JSON.stringify(categoriesResponse.data, null, 2));

        // Test 2: Search prompts without category filter
        console.log('\n🔍 Testing prompts search (no category filter)...');
        const searchResponse = await makeRequest('/api/prompts/search', 'POST', {
            query: 'test',
            limit: 3
        });
        console.log('Search response:', JSON.stringify(searchResponse.data, null, 2));

        // Test 3: Search prompts with category filter
        console.log('\n🔍 Testing prompts search (with category filter)...');
        const searchWithCategoryResponse = await makeRequest('/api/prompts/search', 'POST', {
            query: 'test',
            category_id: 1,
            limit: 3
        });
        console.log('Search with category response:', JSON.stringify(searchWithCategoryResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Error testing API:', error.message);
    }
}

testAPI();
