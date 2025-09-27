import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PromptSearchService } from '../services/PromptSearchService';
import { TeamEventService } from '../services/TeamEventService';
import { SmartCopilotService } from '../services/SmartCopilotService';

export class SmartCopilotPanel {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private context: vscode.ExtensionContext,
        private promptSearchService: PromptSearchService,
        private teamEventService: TeamEventService,
        private smartCopilotService: SmartCopilotService
    ) { }

    public show() {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'smartCopilotPanel',
            'Smart Copilot Assistant',
            vscode.ViewColumn.Beside, // Open beside current editor
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
                ]
            }
        );

        this.panel.webview.html = this.getWebviewContent();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'searchPrompts':
                        await this.handleSearchPrompts(message.query, message.categoryId);
                        break;
                    case 'getCategories':
                        await this.handleGetCategories();
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
                    case 'selectPrompt':
                        await this.handleSelectPrompt(message.promptId);
                        break;
                    case 'sendToCopilot':
                        await this.handleSendToCopilot(message.prompt);
                        break;
                    case 'loadTeamEvents':
                        await this.handleLoadTeamEvents();
                        break;
                    case 'remediateEvent':
                        await this.handleRemediateEvent(message.eventId);
                        break;
                    case 'syncCache':
                        await this.handleSyncCache();
                        break;
                }
            },
            undefined,
            this.disposables
        );

        this.panel.onDidDispose(
            () => {
                this.panel = undefined;
                this.dispose();
            },
            null,
            this.disposables
        );

        // Load initial data
        this.loadInitialData();
    }

    private async loadInitialData() {
        const config = vscode.workspace.getConfiguration('smartCopilot');

        // Send configuration to webview
        this.panel?.webview.postMessage({
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
            const prompts = await this.promptSearchService.searchPrompts(query, categoryId);
            this.panel?.webview.postMessage({
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
            this.panel?.webview.postMessage({
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
            const result = await vscode.window.showWarningMessage(
                'Are you sure you want to clear the cache? This will require re-downloading all data.',
                'Yes', 'No'
            );

            if (result === 'Yes') {
                await this.promptSearchService.clearCache();
                vscode.window.showInformationMessage('✅ Cache cleared successfully!');

                // Refresh categories after cache clear
                await this.handleGetCategories();
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to clear cache: ${error}`);
        }
    }

    private async handleGetCacheInfo() {
        try {
            const cacheInfo = await this.promptSearchService.getCacheInfo();
            this.panel?.webview.postMessage({
                type: 'cacheInfoLoaded',
                cacheInfo
            });
        } catch (error) {
            console.error('Error getting cache info:', error);
        }
    }

    private async handleSelectPrompt(promptId: string) {
        try {
            // Track usage
            await this.promptSearchService.usePrompt(promptId);

            this.panel?.webview.postMessage({
                type: 'promptSelected',
                promptId
            });
        } catch (error) {
            console.error('Error selecting prompt:', error);
        }
    }


    private async handleSendToCopilot(prompt: string) {
        try {
            // Try to open Copilot chat
            try {
                await vscode.commands.executeCommand('github.copilot.interactiveSession.focus');

                // Wait a moment for the chat to open
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Copy to clipboard first
                await vscode.env.clipboard.writeText(prompt);

                // Try to paste into the chat
                await vscode.commands.executeCommand('editor.action.clipboardPasteAction');

                // Send success message to webview
                this.panel?.webview.postMessage({
                    type: 'copilotSent'
                });

            } catch (copilotError) {
                console.error('Error opening Copilot chat:', copilotError);

                // Fallback: copy to clipboard and show message
                await vscode.env.clipboard.writeText(prompt);
                vscode.window.showInformationMessage('📋 Prompts copied to clipboard. Paste them in Copilot chat manually.');

                // Send success message to webview
                this.panel?.webview.postMessage({
                    type: 'copilotSent'
                });
            }
        } catch (error) {
            console.error('Error sending to Copilot:', error);
            vscode.window.showErrorMessage('Could not send to Copilot. Prompts copied to clipboard.');
            await vscode.env.clipboard.writeText(prompt);
        }
    }

    private async handleLoadTeamEvents() {
        try {
            const config = vscode.workspace.getConfiguration('smartCopilot');
            const teamId = config.get<string>('user.teamId');

            if (!teamId) {
                vscode.window.showWarningMessage('Team ID not configured');
                return;
            }

            const events = await this.teamEventService.getTeamEvents(teamId);
            this.panel?.webview.postMessage({
                type: 'teamEventsLoaded',
                events
            });
        } catch (error) {
            console.error('Error loading team events:', error);
            vscode.window.showErrorMessage('Failed to load team events');
        }
    }

    private async handleRemediateEvent(eventId: string) {
        try {
            // Get event context
            const eventContext = await this.teamEventService.getEventContext(eventId);
            if (!eventContext) {
                vscode.window.showErrorMessage('Event context not found');
                return;
            }

            // Show loading state
            this.panel?.webview.postMessage({
                type: 'remediationStarted',
                eventId
            });

            // Process with Smart Copilot service
            const enhancedContext = await this.smartCopilotService.processErrorContext(eventContext);

            // Create remediation prompt
            const remediationPrompt = await this.smartCopilotService.enhancePrompt(
                'Help me fix this error',
                enhancedContext
            );

            // Send to webview
            this.panel?.webview.postMessage({
                type: 'remediationReady',
                eventId,
                prompt: remediationPrompt,
                context: enhancedContext
            });

        } catch (error) {
            console.error('Error processing remediation:', error);
            vscode.window.showErrorMessage('Failed to process remediation');

            this.panel?.webview.postMessage({
                type: 'remediationError',
                eventId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private async handleSyncCache() {
        try {
            // Refresh team events data
            await this.handleLoadTeamEvents();
            vscode.window.showInformationMessage('Team events refreshed successfully');
        } catch (error) {
            console.error('Error syncing cache:', error);
            vscode.window.showErrorMessage('Failed to sync cache');
        }
    }

    private getWebviewContent(): string {
        const htmlPath = path.join(this.context.extensionPath, 'src', 'webview', 'smartCopilotPanel.html');
        return fs.readFileSync(htmlPath, 'utf8');
    }

    public dispose() {
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
