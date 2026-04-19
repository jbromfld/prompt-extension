import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PromptSearchService } from '../services/PromptSearchService';

export class SmartCopilotPanel {
  public static currentPanel: SmartCopilotPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly promptSearchService: PromptSearchService;

  public static createOrShow(extensionUri: vscode.Uri, promptSearchService: PromptSearchService): void {
    const column = vscode.ViewColumn.Beside;

    if (SmartCopilotPanel.currentPanel) {
      SmartCopilotPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'smartCopilotPanel',
      'Smart Copilot Prompt Library',
      column,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
      }
    );

    SmartCopilotPanel.currentPanel = new SmartCopilotPanel(panel, extensionUri, promptSearchService);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, promptSearchService: PromptSearchService) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.promptSearchService = promptSearchService;

    this.panel.webview.html = this.getWebviewContent();
    this.panel.onDidDispose(() => this.dispose(), null);

    this.panel.webview.onDidReceiveMessage(async (message: { type: string; [key: string]: unknown }) => {
      switch (message.type) {
        case 'getCategories':
          await this.handleGetCategories();
          break;
        case 'searchPrompts':
          await this.handleSearchPrompts(
            typeof message.query === 'string' ? message.query : '',
            typeof message.categoryId === 'string' && message.categoryId ? parseInt(message.categoryId, 10) : undefined
          );
          break;
        case 'selectPrompt':
          if (typeof message.promptId === 'string') {
            await this.promptSearchService.usePrompt(message.promptId);
          }
          break;
        case 'sendToCopilot':
          await this.handleSendToCopilot(
            typeof message.prompt === 'string' ? message.prompt : '',
            message.ratingPrompt
          );
          break;
        case 'submitRating':
          if (typeof message.promptId === 'string' && typeof message.rating === 'number') {
            await this.handleSubmitRating(message.promptId, message.rating);
          }
          break;
      }
    });

    void this.handleGetCategories();
    void this.handleSearchPrompts('', undefined);
  }

  private async handleGetCategories(): Promise<void> {
    const categories = await this.promptSearchService.getCategories();
    this.panel.webview.postMessage({ type: 'categoriesLoaded', categories });
  }

  private async handleSearchPrompts(query: string, categoryId?: number): Promise<void> {
    const prompts = await this.promptSearchService.searchPrompts(query, categoryId);
    this.panel.webview.postMessage({ type: 'promptSearchResults', prompts });
  }

  private async handleSendToCopilot(prompt: string, ratingPrompt: unknown): Promise<void> {
    try {
      await vscode.commands.executeCommand('workbench.action.chat.open');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
      await new Promise((resolve) => setTimeout(resolve, 300));
      await vscode.env.clipboard.writeText(prompt);
      await vscode.commands.executeCommand('editor.action.clipboardPasteAction');

      this.panel.webview.postMessage({
        type: 'showMessage',
        message: 'Prompt inserted into Copilot Chat.',
        messageType: 'success'
      });

      this.panel.webview.postMessage({
        type: 'showRatingPrompt',
        prompt: ratingPrompt
      });
    } catch {
      await vscode.env.clipboard.writeText(prompt);
      this.panel.webview.postMessage({
        type: 'showMessage',
        message: 'Prompt copied to clipboard. Paste it into Copilot Chat.',
        messageType: 'info'
      });
    }
  }

  private async handleSubmitRating(promptId: string, rating: number): Promise<void> {
    try {
      await this.promptSearchService.ratePrompt(promptId, rating);
      this.panel.webview.postMessage({
        type: 'showMessage',
        message: 'Rating submitted. Thank you for your feedback.',
        messageType: 'success'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.panel.webview.postMessage({
        type: 'showMessage',
        message: `Rating failed: ${message}`,
        messageType: 'error'
      });
    }
  }

  private getWebviewContent(): string {
    const htmlPath = path.join(this.extensionUri.fsPath, 'media', 'smartCopilotPanel.html');
    return fs.readFileSync(htmlPath, 'utf8');
  }

  public dispose(): void {
    SmartCopilotPanel.currentPanel = undefined;
    this.panel.dispose();
  }
}
