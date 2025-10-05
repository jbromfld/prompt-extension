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
                    await this.handleSendToCopilotSimple(data.prompt, data.ratingPrompt);
                    break;
                case 'submitRating':
                    await this.handleSubmitRating(data.promptId, data.rating, data.prompt);
                    break;
                case 'loadCategoryPrompts':
                    await this.handleLoadCategoryPrompts(data.categoryId);
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

        // Load team events if enabled
        if (config.get('features.teamEvents') && config.get('user.teamId')) {
            await this.handleLoadTeamEvents();
        }
    }

    private async handleSearchPrompts(query: string, categoryId?: string) {
        try {
            const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
            const prompts = await this.promptSearchService.searchPrompts(query, categoryIdNum);
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
            vscode.window.showInformationMessage('Updating cache...');
            await this.promptSearchService.updateCache();
            vscode.window.showInformationMessage('✅ Cache updated successfully!');

            // Refresh categories after cache update
            await this.handleGetCategories();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to update cache: ${error}`);
        }
    }

    private async handleClearCache() {
        try {
            await this.promptSearchService.clearCache();
            vscode.window.showInformationMessage('✅ Cache cleared successfully!');

            // Refresh categories after cache clear
            await this.handleGetCategories();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to clear cache: ${error}`);
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

    private async handleSendToCopilotSimple(prompt: string, ratingPrompt?: any) {
        try {
            console.log('Attempting to send prompt to Copilot:', prompt.substring(0, 100) + '...');

            // Approach 1: Open chat, focus input, and simulate typing
            try {
                // Open the chat
                await vscode.commands.executeCommand('workbench.action.chat.open');
                console.log('Chat opened');

                // Wait for chat to fully load
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Try to focus the chat input
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                console.log('Chat input focused');

                // Wait a bit more for focus to take effect
                await new Promise(resolve => setTimeout(resolve, 500));

                // Copy to clipboard and paste
                await vscode.env.clipboard.writeText(prompt);
                await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
                console.log('Text pasted into chat input');

                this._panel.webview.postMessage({
                    type: 'showMessage',
                    message: '✅ Prompt inserted into Copilot Chat!',
                    messageType: 'success'
                });

                // Show rating prompt instead of resetting
                if (ratingPrompt) {
                    this._panel.webview.postMessage({
                        type: 'showRatingPrompt',
                        prompt: ratingPrompt
                    });
                } else {
                    // Fallback to reset if no rating prompt
                    this._panel.webview.postMessage({
                        type: 'resetPanel'
                    });
                }

                return;
            } catch (error) {
                console.log('Chat focus + paste approach failed:', error);
            }

            // Approach 2: Try the sendToNewChat command (even though it seems to not work)
            try {
                await vscode.commands.executeCommand('workbench.action.chat.sendToNewChat', prompt);
                console.log('sendToNewChat command executed');

                // Give it a moment to see if it actually worked
                await new Promise(resolve => setTimeout(resolve, 1000));

                this._panel.webview.postMessage({
                    type: 'showMessage',
                    message: '✅ Prompt sent to Copilot Chat!',
                    messageType: 'success'
                });

                // Show rating prompt instead of resetting
                if (ratingPrompt) {
                    this._panel.webview.postMessage({
                        type: 'showRatingPrompt',
                        prompt: ratingPrompt
                    });
                } else {
                    // Fallback to reset if no rating prompt
                    this._panel.webview.postMessage({
                        type: 'resetPanel'
                    });
                }

                return;
            } catch (error) {
                console.log('sendToNewChat failed:', error);
            }

            // Approach 3: Fallback to clipboard with clear instructions
            try {
                await vscode.env.clipboard.writeText(prompt);
                await vscode.commands.executeCommand('workbench.action.chat.open');

                this._panel.webview.postMessage({
                    type: 'showMessage',
                    message: 'Prompt copied to clipboard! Chat opened - click in the input field and paste (Ctrl+V).',
                    messageType: 'info'
                });

                // Reset the panel
                this._panel.webview.postMessage({
                    type: 'resetPanel'
                });

            } catch (error) {
                throw new Error(`All Copilot integration methods failed: ${error}`);
            }

        } catch (error) {
            console.error('Error sending prompt to Copilot:', error);
            this._panel.webview.postMessage({
                type: 'showMessage',
                message: `Failed to send prompt to Copilot: ${error}`,
                messageType: 'error'
            });
        }
    }

    private async simulateTyping(text: string): Promise<void> {
        // This is a workaround to simulate typing in the chat input
        // We'll use the clipboard and paste command as a fallback
        try {
            await vscode.env.clipboard.writeText(text);
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            console.log('Simulated typing via clipboard paste');
        } catch (error) {
            console.log('Simulated typing failed:', error);
            throw error;
        }
    }

    private async handleSubmitRating(promptId: string, rating: number, prompt: any) {
        try {
            console.log(`Submitting rating for prompt ${promptId}: ${rating} stars`);

            // Submit rating to backend
            await this.promptSearchService.ratePrompt(promptId, rating);

            // Show success message (already shown by webview)
            console.log(`Rating submitted successfully: ${rating} stars for "${prompt.title}"`);

        } catch (error) {
            console.error('Error submitting rating:', error);
            this._panel.webview.postMessage({
                type: 'showMessage',
                message: `Failed to submit rating: ${error}`,
                messageType: 'error'
            });
        }
    }

    private async handleLoadCategoryPrompts(categoryId: number) {
        try {
            console.log('Loading category prompts for categoryId:', categoryId, typeof categoryId);

            // Get category name first
            const categories = await this.promptSearchService.getCategories();
            console.log('Available categories:', categories);

            // Convert categoryId to number if it's a string
            const numericCategoryId = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId;
            const category = categories.find(cat => cat.id === numericCategoryId);

            if (!category) {
                this._panel.webview.postMessage({
                    type: 'showMessage',
                    message: 'Category not found',
                    messageType: 'error'
                });
                return;
            }

            // Search for prompts in this category using @category syntax with a broad search term
            // The backend expects @category search_terms format, so we add a broad term to get all prompts
            const prompts = await this.promptSearchService.searchPrompts(`@${category.name} help`, categoryId);

            this._panel.webview.postMessage({
                type: 'categoryPromptsLoaded',
                prompts: prompts
            });
        } catch (error) {
            console.error('Error loading category prompts:', error);
            this._panel.webview.postMessage({
                type: 'showMessage',
                message: `Failed to load prompts for category: ${error}`,
                messageType: 'error'
            });
        }
    }

    private async handleSendToCopilot(prompt: string) {
        try {
            // Use VS Code's built-in chat system
            const chatCommands = [
                'workbench.action.chat.open',                        // Open chat view (primary)
                'workbench.panel.chat.view.copilot.focus',           // Focus Copilot chat panel
                'workbench.action.quickchat.toggle',                 // Quick chat toggle
                'workbench.action.chat.openInSidebar'                // Open chat in sidebar
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

            // Wait for chat to open and become ready
            if (chatOpened) {
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Try multiple approaches to insert the text
                let textInserted = false;

                // Approach 1: Try to use chat-specific commands
                try {
                    // Try to send text directly to chat if such command exists
                    const allCommands = await vscode.commands.getCommands(true);

                    // Look for chat input commands
                    const chatInputCommands = allCommands.filter(cmd =>
                        cmd.includes('chat') && (cmd.includes('input') || cmd.includes('send') || cmd.includes('type'))
                    );

                    console.log('Available chat commands:', chatInputCommands);

                    // Try each chat input command
                    for (const cmd of chatInputCommands) {
                        try {
                            await vscode.commands.executeCommand(cmd, prompt);
                            textInserted = true;
                            break;
                        } catch (cmdError) {
                            console.log(`Command ${cmd} failed:`, cmdError);
                            continue;
                        }
                    }
                } catch (error) {
                    console.log('Chat command approach failed:', error);
                }

                // Approach 2: If direct commands didn't work, try clipboard + paste
                if (!textInserted) {
                    try {
                        await vscode.env.clipboard.writeText(prompt);

                        // Try to focus the chat input and paste
                        await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');

                        textInserted = true;
                    } catch (pasteError) {
                        console.log('Clipboard paste approach failed:', pasteError);
                    }
                }

                // Provide appropriate feedback
                if (textInserted) {
                    vscode.window.showInformationMessage(
                        '💬 Chat opened and prompt inserted!',
                        'Got it'
                    );
                } else {
                    await vscode.env.clipboard.writeText(prompt);
                    vscode.window.showInformationMessage(
                        '💬 Chat opened! Prompt copied to clipboard - paste it in the chat.',
                        'Got it'
                    );
                }
            } else {
                // Copy to clipboard and provide instructions
                await vscode.env.clipboard.writeText(prompt);
                vscode.window.showInformationMessage(
                    '📋 Prompt copied to clipboard. Press Ctrl+I (Cmd+I on Mac) to open chat and paste.',
                    'Open Chat'
                ).then(selection => {
                    if (selection === 'Open Chat') {
                        vscode.commands.executeCommand('workbench.action.chat.open');
                    }
                });
            }

            // Send success message to webview
            this._panel?.webview.postMessage({
                type: 'copilotSent'
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
