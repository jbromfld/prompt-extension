#!/usr/bin/env node

// Test script to verify cache info after clearing
const fs = require('fs');
const path = require('path');
const os = require('os');

const cacheDir = path.join(os.homedir(), '.smart-copilot-assistant');
const files = [
    path.join(cacheDir, 'categories.json'),
    path.join(cacheDir, 'prompts.json'),
    path.join(cacheDir, 'metadata.json')
];

console.log('🔍 Cache Info Test');
console.log('==================');

// Function to check if cache is valid
function isCacheValid() {
    try {
        const metadataExists = fs.existsSync(files[2]);
        const categoriesExists = fs.existsSync(files[0]);
        const promptsExists = fs.existsSync(files[1]);

        if (!metadataExists) return false;

        return categoriesExists && promptsExists;
    } catch (error) {
        return false;
    }
}

// Function to get cache age
function getCacheAge() {
    try {
        if (!fs.existsSync(files[2])) return Infinity;

        const metadata = JSON.parse(fs.readFileSync(files[2], 'utf8'));
        const lastUpdated = new Date(metadata.lastUpdated);
        const now = new Date();
        const diffMs = now - lastUpdated;
        const diffHours = diffMs / (1000 * 60 * 60);

        return diffHours;
    } catch (error) {
        return Infinity;
    }
}

// Function to get cache size
function getCacheSize() {
    try {
        let totalSize = 0;
        for (const file of files) {
            if (fs.existsSync(file)) {
                const stats = fs.statSync(file);
                totalSize += stats.size;
            }
        }
        return totalSize;
    } catch (error) {
        return 0;
    }
}

// Function to get metadata
function getMetadata() {
    try {
        if (!fs.existsSync(files[2])) return null;
        return JSON.parse(fs.readFileSync(files[2], 'utf8'));
    } catch (error) {
        return null;
    }
}

console.log('\n📊 Before clearing:');
console.log('Valid:', isCacheValid());
console.log('Age:', getCacheAge().toFixed(2), 'hours');
console.log('Size:', getCacheSize(), 'bytes');
const metadata = getMetadata();
console.log('Categories:', metadata?.categoriesCount || 0);
console.log('Prompts:', metadata?.promptsCount || 0);

console.log('\n🧹 Clearing cache...');
files.forEach(file => {
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`🗑️  Deleted: ${path.basename(file)}`);
    }
});

console.log('\n📊 After clearing:');
console.log('Valid:', isCacheValid());
console.log('Age:', getCacheAge() === Infinity ? 'Infinity' : getCacheAge().toFixed(2), 'hours');
console.log('Size:', getCacheSize(), 'bytes');
const metadataAfter = getMetadata();
console.log('Categories:', metadataAfter?.categoriesCount || 0);
console.log('Prompts:', metadataAfter?.promptsCount || 0);

console.log('\n✅ Expected results after clearing:');
console.log('Valid: false');
console.log('Age: Infinity');
console.log('Size: 0');
console.log('Categories: 0');
console.log('Prompts: 0');
