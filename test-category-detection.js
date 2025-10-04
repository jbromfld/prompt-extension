#!/usr/bin/env node

// Test script to verify category detection logic
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

// Simulate the enrichPromptsWithCategories logic
function enrichPromptsWithCategories(prompts) {
    console.log('🔍 Testing category detection logic...');
    console.log('📊 First prompt data:', prompts[0]);

    // Check if prompts have embedded category information
    if (prompts.length > 0 && (prompts[0].category_name || prompts[0].display_name)) {
        console.log('✅ Using embedded category information from API');
        return prompts.map(prompt => ({
            ...prompt,
            category: {
                id: prompt.category_id,
                name: prompt.category_name || 'Unknown',
                display_name: prompt.display_name || prompt.category_name || 'Unknown',
                icon: prompt.icon || '📁',
                color: prompt.color
            }
        }));
    } else {
        console.log('❌ No embedded category information found');
        return prompts.map(prompt => ({
            ...prompt,
            category: {
                id: prompt.category_id,
                name: 'Unknown',
                display_name: 'Unknown',
                icon: '📁'
            }
        }));
    }
}

async function testCategoryDetection() {
    console.log('🧪 Testing Category Detection Logic');
    console.log('====================================');

    try {
        // Test 1: Search prompts without category filter (should use cache)
        console.log('\n📋 Test 1: Search prompts (no category filter)');
        const searchResponse = await makeRequest('/api/prompts/search', 'POST', {
            query: 'test',
            limit: 3
        });

        if (searchResponse.status === 200) {
            console.log('✅ API Response:', JSON.stringify(searchResponse.data, null, 2));
            const enrichedPrompts = enrichPromptsWithCategories(searchResponse.data.prompts);
            console.log('✅ Enriched prompts:', enrichedPrompts.map(p => ({
                id: p.id,
                category_name: p.category?.name,
                category_display: p.category?.display_name
            })));
        } else {
            console.log('❌ API Error:', searchResponse.status, searchResponse.data);
        }

        // Test 2: Search prompts with category filter (should use API with embedded data)
        console.log('\n📋 Test 2: Search prompts (with category filter)');
        const searchWithCategoryResponse = await makeRequest('/api/prompts/search', 'POST', {
            query: 'test',
            category_id: 1,
            limit: 3
        });

        if (searchWithCategoryResponse.status === 200) {
            console.log('✅ API Response:', JSON.stringify(searchWithCategoryResponse.data, null, 2));
            const enrichedPrompts = enrichPromptsWithCategories(searchWithCategoryResponse.data.prompts);
            console.log('✅ Enriched prompts:', enrichedPrompts.map(p => ({
                id: p.id,
                category_name: p.category?.name,
                category_display: p.category?.display_name
            })));
        } else {
            console.log('❌ API Error:', searchWithCategoryResponse.status, searchWithCategoryResponse.data);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testCategoryDetection();
