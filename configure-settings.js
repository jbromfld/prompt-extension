#!/usr/bin/env node

// Script to help configure VS Code settings for Smart Copilot Assistant
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔧 Smart Copilot Assistant - Settings Configuration Helper');
console.log('========================================================');

const vscodeSettingsPath = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'settings.json');

console.log('\n📋 Current VS Code Settings Path:', vscodeSettingsPath);

// Check if settings.json exists
if (fs.existsSync(vscodeSettingsPath)) {
    try {
        const settings = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf8'));
        console.log('\n📊 Current Smart Copilot Settings:');
        console.log('  smartCopilot.features.promptSearch:', settings['smartCopilot.features.promptSearch']);
        console.log('  smartCopilot.features.teamEvents:', settings['smartCopilot.features.teamEvents']);
        console.log('  smartCopilot.user.id:', settings['smartCopilot.user.id']);
        console.log('  smartCopilot.user.teamId:', settings['smartCopilot.user.teamId']);

        // Check if settings are missing or incorrect
        const issues = [];
        if (settings['smartCopilot.features.promptSearch'] === undefined) {
            issues.push('smartCopilot.features.promptSearch is not set');
        }
        if (settings['smartCopilot.features.teamEvents'] === undefined) {
            issues.push('smartCopilot.features.teamEvents is not set');
        }

        if (issues.length > 0) {
            console.log('\n⚠️  Issues found:');
            issues.forEach(issue => console.log('  -', issue));

            console.log('\n🔧 Recommended settings to add to your VS Code settings.json:');
            console.log(JSON.stringify({
                'smartCopilot.features.promptSearch': true,
                'smartCopilot.features.teamEvents': true,
                'smartCopilot.user.id': 'your-user-id',
                'smartCopilot.user.teamId': 'your-team-id'
            }, null, 2));
        } else {
            console.log('\n✅ All Smart Copilot settings are configured!');
        }

    } catch (error) {
        console.log('❌ Error reading settings.json:', error.message);
    }
} else {
    console.log('❌ VS Code settings.json not found at:', vscodeSettingsPath);
    console.log('\n🔧 Create a new settings.json with:');
    console.log(JSON.stringify({
        'smartCopilot.features.promptSearch': true,
        'smartCopilot.features.teamEvents': true,
        'smartCopilot.user.id': 'your-user-id',
        'smartCopilot.user.teamId': 'your-team-id'
    }, null, 2));
}

console.log('\n📖 To configure settings in VS Code:');
console.log('1. Open VS Code');
console.log('2. Go to File > Preferences > Settings (or Cmd+,)');
console.log('3. Search for "Smart Copilot"');
console.log('4. Configure the settings as needed');
console.log('5. Restart VS Code or reload the window (Cmd+Shift+P > "Developer: Reload Window")');
