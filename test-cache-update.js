#!/usr/bin/env node

// Test script to verify cache update functionality
const fs = require('fs');
const path = require('path');
const os = require('os');

const cacheDir = path.join(os.homedir(), '.smart-copilot-assistant');
const metadataFile = path.join(cacheDir, 'metadata.json');

console.log('🔍 Testing Cache Update Functionality');
console.log('====================================');

// Function to simulate cache info processing
function processCacheInfo(cacheInfo) {
    console.log('📊 Raw cache info:', cacheInfo);

    // Handle age display properly (like in renderCacheInfo)
    let ageText;
    if (cacheInfo.age === Infinity || cacheInfo.age === null || cacheInfo.age === undefined) {
        ageText = 'Never';
    } else if (isNaN(cacheInfo.age)) {
        ageText = 'Never';
    } else {
        ageText = cacheInfo.age + 'h ago';
    }

    console.log('⏰ Age text:', ageText);

    return {
        status: cacheInfo.isValid ? '✅ Valid' : '❌ Invalid',
        age: ageText,
        size: cacheInfo.size + ' B',
        categories: cacheInfo.categoriesCount,
        prompts: cacheInfo.promptsCount
    };
}

console.log('\n📊 Test 1: Valid cache with recent age');
const validCache = {
    isValid: true,
    age: 0.05, // 3 minutes ago
    size: 1024,
    categoriesCount: 5,
    promptsCount: 25
};
const result1 = processCacheInfo(validCache);
console.log('✅ Result:', result1);

console.log('\n📊 Test 2: Invalid cache with Infinity age');
const invalidCache = {
    isValid: false,
    age: Infinity,
    size: 0,
    categoriesCount: 0,
    promptsCount: 0
};
const result2 = processCacheInfo(invalidCache);
console.log('✅ Result:', result2);

console.log('\n📊 Test 3: Invalid cache with null age');
const nullAgeCache = {
    isValid: false,
    age: null,
    size: 0,
    categoriesCount: 0,
    promptsCount: 0
};
const result3 = processCacheInfo(nullAgeCache);
console.log('✅ Result:', result3);

console.log('\n📊 Test 4: Invalid cache with NaN age');
const nanAgeCache = {
    isValid: false,
    age: NaN,
    size: 0,
    categoriesCount: 0,
    promptsCount: 0
};
const result4 = processCacheInfo(nanAgeCache);
console.log('✅ Result:', result4);

console.log('\n🎯 Expected results:');
console.log('Test 1: Status: ✅ Valid, Age: 0.05h ago');
console.log('Test 2: Status: ❌ Invalid, Age: Never');
console.log('Test 3: Status: ❌ Invalid, Age: Never');
console.log('Test 4: Status: ❌ Invalid, Age: Never');
