import * as vscode from 'vscode';
import { SmartCopilotService } from './services/SmartCopilotService';
import { SmartCopilotPanel } from './ui/SmartCopilotPanel';
import { PromptSearchService } from './services/PromptSearchService';
import { UserSettingsManager } from './services/UserSettingsManager';

export async function activate(context: vscode.ExtensionContext) {
  try {
    if (!UserSettingsManager.hasBasicConfiguration()) {
      const shown = context.globalState.get<boolean>('smart-copilot-showed-help', false);
      if (!shown) {
        setTimeout(() => {
          UserSettingsManager.showConfigurationHelp();
          void context.globalState.update('smart-copilot-showed-help', true);
        }, 1500);
      }
    }

    const promptApi = new SmartCopilotService();
    const promptSearchService = new PromptSearchService(promptApi);

    // Keep startup non-blocking so the view provider is always ready in debug mode.
    void promptApi.checkServiceHealth().then((healthy) => {
      if (!healthy) {
        vscode.window.showWarningMessage('Prompt service is unavailable. Prompt library features may fail until it is reachable.');
      }
    });

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(book) Prompt Library';
    statusBarItem.command = 'smartCopilot.openPanel';
    statusBarItem.tooltip = 'Open Smart Copilot Prompt Library';
    statusBarItem.show();

    const openPanelCommand = vscode.commands.registerCommand('smartCopilot.openPanel', () => {
      SmartCopilotPanel.createOrShow(context.extensionUri, promptSearchService);
    });

    const showConfigurationCommand = vscode.commands.registerCommand(
      'smartCopilot.showConfiguration',
      () => UserSettingsManager.showConfigurationStatus()
    );

    context.subscriptions.push(
      openPanelCommand,
      showConfigurationCommand,
      statusBarItem
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Smart Copilot Assistant failed to start: ${message}`);
  }
}

export function deactivate() {}
