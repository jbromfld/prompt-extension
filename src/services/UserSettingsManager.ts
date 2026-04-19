import * as vscode from 'vscode';

export class UserSettingsManager {
  static getUserId(): string {
    const config = vscode.workspace.getConfiguration('smartCopilot');
    return config.get<string>('user.id', '').trim();
  }

  static hasBasicConfiguration(): boolean {
    return this.getUserId().length > 0;
  }

  static showConfigurationStatus(): void {
    const config = vscode.workspace.getConfiguration('smartCopilot');
    const userId = this.getUserId();
    const promptServiceUrl = config.get<string>('promptService.url', 'http://127.0.0.1:8090');

    const message = [
      `User ID: ${userId || 'Not configured (optional)'}`,
      `Prompt Service URL: ${promptServiceUrl}`,
      `Prompt Library: Enabled`
    ].join('\n');

    vscode.window.showInformationMessage(`Smart Copilot Configuration\n\n${message}`);
  }

  static openSettings(): void {
    void vscode.commands.executeCommand('workbench.action.openSettings', 'smartCopilot');
  }

  static showConfigurationHelp(): void {
    const message = `Smart Copilot Assistant uses prompt-service only.

Recommended setup:
1. Open VS Code Settings
2. Search for "smartCopilot.promptService.url"
3. Set your prompt-service URL
4. Optionally set "smartCopilot.user.id" for usage attribution`;

    void vscode.window.showInformationMessage(message, 'Open Settings').then((selection) => {
      if (selection === 'Open Settings') {
        this.openSettings();
      }
    });
  }
}
