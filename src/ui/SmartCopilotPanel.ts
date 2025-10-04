import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PromptSearchService } from '../services/PromptSearchService';
import { TeamEventService } from '../services/TeamEventService';

export class SmartCopilotPanel {
    public static currentPanel: SmartCopilotPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly promptSearchService: PromptSearchService;
    private readonly teamEventService: TeamEventService;

    public static createOrShow(extensionUri: vscode.Uri, promptSearchService: PromptSearchService, teamEventService: TeamEventService) {
        const column = vscode.ViewColumn.Beside;

        if (SmartCopilotPanel.currentPanel) {
            SmartCopilotPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'smartCopilotPanel',
            'Smart Copilot Assistant',
            column,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'src', 'webview')
                ]
            }
        );

        SmartCopilotPanel.currentPanel = new SmartCopilotPanel(panel, extensionUri, promptSearchService, teamEventService);
    }

    constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, promptSearchService: PromptSearchService, teamEventService: TeamEventService) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this.promptSearchService = promptSearchService;
        this.teamEventService = teamEventService;

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null);



        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('smartCopilot')) {
                console.log('🔧 Configuration changed, recreating panel...');

                // Close and recreate the panel to ensure settings are properly applied
                this.dispose();

                // Recreate the panel with updated settings
                setTimeout(() => {
                    SmartCopilotPanel.createOrShow(this._extensionUri, this.promptSearchService, this.teamEventService);
                }, 100);
            }
        });
    }

    private async _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this.getWebviewContent();

        webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'searchPrompts':
                    await this.handleSearchPrompts(data.query, data.categoryId);
                    break;
                case 'getCategories':
                    await this.handleGetCategories();
                    break;
                case 'selectPrompt':
                    await this.handleSelectPrompt(data);
                    break;
                case 'sendToCopilot':
                    await this.handleSendToCopilot(data.prompt);
                    break;
                case 'loadTeamEvents':
                    await this.handleLoadTeamEvents();
                    break;
                case 'updateCache':
                    await this.handleUpdateCache();
                    break;
                case 'clearCache':
                    await this.handleClearCache();
                    break;
                case 'getCacheInfo':
                    await this.handleGetCacheInfo();
                    break;
                case 'openSettings':
                    await this.handleOpenSettings();
                    break;
            }
        });

        this.loadInitialData();
    }

    private async loadInitialData() {
        const config = vscode.workspace.getConfiguration('smartCopilot');

        // Send configuration to webview
        this._panel?.webview.postMessage({
            type: 'configUpdate',
            config: {
                promptSearchEnabled: config.get('features.promptSearch'),
                teamEventsEnabled: config.get('features.teamEvents'),
                userId: config.get('user.id'),
                teamId: config.get('user.teamId')
            }
        });

        // Load categories
        await this.handleGetCategories();

        // Load team events if enabled
        if (config.get('features.teamEvents') && config.get('user.teamId')) {
            await this.handleLoadTeamEvents();
        }
    }

    private async handleSearchPrompts(query: string, categoryId?: string) {
        try {
            const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
            // Only pass categoryId if it's a valid number
            const validCategoryId = (categoryIdNum && !isNaN(categoryIdNum)) ? categoryIdNum : undefined;
            const prompts = await this.promptSearchService.searchPrompts(query, validCategoryId);
            this._panel?.webview.postMessage({
                type: 'promptSearchResults',
                prompts
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error searching prompts: ${error}`);
        }
    }

    private async handleGetCategories() {
        try {
            const categories = await this.promptSearchService.getCategories();
            this._panel?.webview.postMessage({
                type: 'categoriesLoaded',
                categories
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading categories: ${error}`);
        }
    }


    private async handleUpdateCache() {
        try {
            // Send progress message to webview instead of popup
            this._panel?.webview.postMessage({
                type: 'cacheUpdating',
                message: 'Updating cache...',
                messageType: 'info'
            });

            await this.promptSearchService.updateCache();

            // Send success message to webview instead of popup
            this._panel?.webview.postMessage({
                type: 'cacheUpdated',
                message: '✅ Cache updated successfully!',
                messageType: 'success'
            });

            // Refresh categories and cache info after cache update
            await this.handleGetCategories();
            await this.handleGetCacheInfo();
        } catch (error) {
            // Send error message to webview instead of popup
            this._panel?.webview.postMessage({
                type: 'cacheUpdateError',
                message: `Failed to update cache: ${error}`,
                messageType: 'error'
            });
        }
    }

    private async handleClearCache() {
        try {
            await this.promptSearchService.clearCache();

            // Send success message to webview instead of popup
            this._panel?.webview.postMessage({
                type: 'cacheCleared',
                message: '✅ Cache cleared successfully!',
                messageType: 'success'
            });

            // Refresh categories and cache info after cache clear
            await this.handleGetCategories();
            await this.handleGetCacheInfo();
        } catch (error) {
            // Send error message to webview instead of popup
            this._panel?.webview.postMessage({
                type: 'cacheError',
                message: `Failed to clear cache: ${error}`,
                messageType: 'error'
            });
        }
    }

    private async handleGetCacheInfo() {
        try {
            const cacheInfo = await this.promptSearchService.getCacheInfo();
            this._panel?.webview.postMessage({
                type: 'cacheInfoLoaded',
                cacheInfo
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading cache info: ${error}`);
        }
    }

    private async handleSelectPrompt(data: any) {
        try {
            console.log('Select prompt data:', data); // Debug log

            const promptId = data.promptId;

            // Track usage if we have a prompt ID
            if (promptId) {
                await this.promptSearchService.usePrompt(promptId);
            } else {
                console.log('No prompt ID provided, skipping usage tracking');
            }

            // For now, we'll handle the prompt text in the webview
            // The actual sending to Copilot will be handled when user clicks "Send to Copilot Chat"

            // Notify webview of selection
            this._panel?.webview.postMessage({
                type: 'promptSelected',
                promptId
            });
        } catch (error) {
            console.error('Error selecting prompt:', error);
            vscode.window.showErrorMessage(`Error selecting prompt: ${error}`);
        }
    }

    private async handleSendToCopilot(prompt: string) {
        try {
            // Use VS Code's built-in chat system
            const chatCommands = [
                'workbench.action.chat.open',                        // Open chat view (primary)
                'workbench.panel.chat.view.copilot.focus',           // Focus Copilot chat panel
                'workbench.action.quickchat.toggle',                 // Quick chat toggle
                'workbench.action.chat.openInSidebar',               // Open chat in sidebar
                'github.copilot.chat.open'                           // GitHub Copilot Chat open
            ];

            let chatOpened = false;

            // Try to open the chat
            for (const command of chatCommands) {
                try {
                    await vscode.commands.executeCommand(command);
                    chatOpened = true;
                    break;
                } catch (error) {
                    console.log(`Chat command ${command} failed:`, error);
                    continue;
                }
            }

            let message = '';
            let messageType = 'info';

            // Wait for chat to open and become ready
            if (chatOpened) {
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Try multiple approaches to insert the text
                let textInserted = false;

                // Approach 1: Try to use GitHub Copilot Chat specific commands
                try {
                    // Try to focus the chat input using available commands
                    const focusCommands = [
                        'workbench.panel.chat.view.copilot.focus',
                        'workbench.action.chat.focus',
                        'github.copilot.chat.focus'
                    ];

                    let focused = false;
                    for (const cmd of focusCommands) {
                        try {
                            await vscode.commands.executeCommand(cmd);
                            focused = true;
                            break;
                        } catch (e) {
                            // Command doesn't exist, try next one
                            continue;
                        }
                    }

                    if (focused) {
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Use the type command to insert text
                        await vscode.commands.executeCommand('type', { text: prompt });
                        textInserted = true;
                    }
                } catch (error) {
                    console.log('Direct typing approach failed:', error);
                }

                // Approach 2: If direct typing didn't work, try clipboard + paste
                if (!textInserted) {
                    try {
                        await vscode.env.clipboard.writeText(prompt);

                        // Try to focus the chat input using available commands
                        const focusCommands = [
                            'workbench.panel.chat.view.copilot.focus',
                            'workbench.action.chat.focus',
                            'github.copilot.chat.focus'
                        ];

                        let focused = false;
                        for (const cmd of focusCommands) {
                            try {
                                await vscode.commands.executeCommand(cmd);
                                focused = true;
                                break;
                            } catch (e) {
                                // Command doesn't exist, try next one
                                continue;
                            }
                        }

                        if (focused) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
                            textInserted = true;
                        }
                    } catch (pasteError) {
                        console.log('Clipboard paste approach failed:', pasteError);
                    }
                }

                // Set appropriate message
                if (textInserted) {
                    message = '💬 Chat opened and prompt inserted!';
                    messageType = 'success';
                } else {
                    await vscode.env.clipboard.writeText(prompt);
                    message = '💬 Chat opened! Prompt copied to clipboard - paste it in the chat.';
                    messageType = 'warning';
                }
            } else {
                // Copy to clipboard and provide instructions
                await vscode.env.clipboard.writeText(prompt);
                message = '📋 Prompt copied to clipboard. Press Ctrl+I (Cmd+I on Mac) to open chat and paste.';
                messageType = 'info';
            }

            // Send message to webview instead of showing popup
            this._panel?.webview.postMessage({
                type: 'copilotSent',
                message: message,
                messageType: messageType
            });

        } catch (error) {
            console.error('Error sending to Copilot:', error);

            // Fallback to clipboard
            try {
                await vscode.env.clipboard.writeText(prompt);
                vscode.window.showErrorMessage(
                    'Could not open chat. Prompt copied to clipboard.',
                    'Open Command Palette'
                ).then(selection => {
                    if (selection === 'Open Command Palette') {
                        vscode.commands.executeCommand('workbench.action.showCommands');
                    }
                });
            } catch (clipboardError) {
                vscode.window.showErrorMessage('Failed to copy prompt to clipboard');
            }
        }
    }

    private async handleLoadTeamEvents() {
        try {
            const config = vscode.workspace.getConfiguration('smartCopilot');
            const teamId = config.get('user.teamId') as string;

            if (!teamId) {
                return;
            }

            const events = await this.teamEventService.getTeamEvents(teamId);
            this._panel?.webview.postMessage({
                type: 'teamEventsLoaded',
                events
            });
        } catch (error) {
            console.error('Error loading team events:', error);
        }
    }

    private async handleOpenSettings() {
        try {
            // Close the panel first, then open settings
            this.dispose();
            await vscode.commands.executeCommand('workbench.action.openSettings', 'smartCopilot');
        } catch (error) {
            console.error('Error opening settings:', error);
            vscode.window.showErrorMessage('Could not open settings. Please use Ctrl+, to open settings manually.');
        }
    }

    public dispose() {
        SmartCopilotPanel.currentPanel = undefined;
        this._panel.dispose();
    }

    private getWebviewContent(): string {
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'smartCopilotPanel.html');

        try {
            return fs.readFileSync(htmlPath, 'utf8');
        } catch (error) {
            console.error('Error reading webview HTML:', error);
            return this.getFallbackHtml();
        }
    }

    private getFallbackHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Smart Copilot Assistant</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 20px;
                }
                .error {
                    color: var(--vscode-errorForeground);
                    text-align: center;
                    margin-top: 50px;
                }
            </style>
        </head>
        <body>
            <div class="error">
                <h2>Error Loading Interface</h2>
                <p>The webview HTML file could not be loaded.</p>
            </div>
        </body>
        </html>`;
    }
}
