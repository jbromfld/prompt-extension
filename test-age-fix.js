#!/usr/bin/env node

// Test script to verify age calculation fix
const fs = require('fs');
const path = require('path');
const os = require('os');

const cacheDir = path.join(os.homedir(), '.smart-copilot-assistant');
const metadataFile = path.join(cacheDir, 'metadata.json');

console.log('🔍 Testing Age Calculation Fix');
console.log('==============================');

// Function to get cache age (simulating LocalCacheService.getCacheAge)
function getCacheAge() {
    try {
        if (!fs.existsSync(metadataFile)) {
            console.log('❌ Metadata file does not exist');
            return Infinity;
        }

        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        const lastUpdated = new Date(metadata.lastUpdated);
        const now = new Date();
        const diffMs = now - lastUpdated;
        const diffHours = diffMs / (1000 * 60 * 60);

        console.log('📅 Last updated:', lastUpdated.toISOString());
        console.log('🕐 Now:', now.toISOString());
        console.log('⏱️  Diff hours:', diffHours);

        return diffHours;
    } catch (error) {
        console.log('❌ Error getting cache age:', error.message);
        return Infinity;
    }
}

// Function to process age (simulating PromptSearchService.getCacheInfo)
function processAge(age) {
    console.log('🔢 Raw age:', age);
    console.log('🔢 isFinite(age):', isFinite(age));

    const processedAge = isFinite(age) ? Math.round(age * 100) / 100 : Infinity;
    console.log('🔢 Processed age:', processedAge);

    return processedAge;
}

console.log('\n📊 Before clearing:');
const age = getCacheAge();
const processedAge = processAge(age);
console.log('✅ Final age:', processedAge);

console.log('\n🧹 Clearing cache...');
if (fs.existsSync(metadataFile)) {
    fs.unlinkSync(metadataFile);
    console.log('🗑️  Deleted metadata.json');
}

console.log('\n📊 After clearing:');
const ageAfter = getCacheAge();
const processedAgeAfter = processAge(ageAfter);
console.log('✅ Final age:', processedAgeAfter);

console.log('\n🎯 Expected results:');
console.log('Before: Should be a small number (e.g., 0.05)');
console.log('After: Should be Infinity');
