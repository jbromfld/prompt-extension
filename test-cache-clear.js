#!/usr/bin/env node

// Test script to verify cache clearing functionality
const fs = require('fs');
const path = require('path');
const os = require('os');

const cacheDir = path.join(os.homedir(), '.smart-copilot-assistant');
const files = [
    path.join(cacheDir, 'categories.json'),
    path.join(cacheDir, 'prompts.json'),
    path.join(cacheDir, 'metadata.json')
];

console.log('🔍 Checking cache files before clearing...');
console.log('Cache directory:', cacheDir);

files.forEach(file => {
    if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        console.log(`✅ Found: ${path.basename(file)} (${stats.size} bytes)`);
    } else {
        console.log(`❌ Missing: ${path.basename(file)}`);
    }
});

console.log('\n🧹 Clearing cache files...');

files.forEach(file => {
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`🗑️  Deleted: ${path.basename(file)}`);
    } else {
        console.log(`⚠️  Already missing: ${path.basename(file)}`);
    }
});

console.log('\n🔍 Checking cache files after clearing...');

files.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`❌ Still exists: ${path.basename(file)}`);
    } else {
        console.log(`✅ Cleared: ${path.basename(file)}`);
    }
});

console.log('\n✅ Cache clearing test completed!');
