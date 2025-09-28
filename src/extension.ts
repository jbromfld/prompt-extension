import * as vscode from 'vscode';
import { SmartCopilotService } from './services/SmartCopilotService';
import { SmartCopilotPanel } from './ui/SmartCopilotPanel';
import { DatabaseService } from './services/DatabaseService';
import { TeamEventService } from './services/TeamEventService';
import { PromptSearchService } from './services/PromptSearchService';
import { UserSettingsManager } from './services/UserSettingsManager';

export async function activate(context: vscode.ExtensionContext) {
  console.log('Smart Copilot Assistant is now active!');

  try {
    // Check configuration and show help if needed
    if (!UserSettingsManager.hasBasicConfiguration()) {
      // Show a one-time help message for new users
      const showHelp = context.globalState.get('smart-copilot-showed-help', false);
      if (!showHelp) {
        setTimeout(() => {
          UserSettingsManager.showConfigurationHelp();
          context.globalState.update('smart-copilot-showed-help', true);
        }, 2000); // Show after 2 seconds to let extension load
      }
    }

    // Initialize Smart Copilot service
    const smartCopilotService = new SmartCopilotService();

    // Check if service is available
    const serviceHealthy = await smartCopilotService.checkServiceHealth();
    if (!serviceHealthy) {
      console.warn('Smart Copilot service not available, some features may be limited');
    }

    // Initialize services
    const databaseService = new DatabaseService(context);
    const teamEventService = new TeamEventService(databaseService, smartCopilotService);
    const promptSearchService = new PromptSearchService(databaseService, smartCopilotService);

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(robot) Smart Copilot";
    statusBarItem.command = 'smartCopilot.openPanel';
    statusBarItem.tooltip = 'Open Smart Copilot Assistant (Extension Panel)';
    statusBarItem.show();

    // Register commands
    const openPanelCommand = vscode.commands.registerCommand(
      'smartCopilot.openPanel',
      () => SmartCopilotPanel.createOrShow(context.extensionUri, promptSearchService, teamEventService)
    );

    const syncCacheCommand = vscode.commands.registerCommand(
      'smartCopilot.syncCache',
      () => {
        // Refresh team events data
        teamEventService.getTeamEvents('').then(() => {
          vscode.window.showInformationMessage('Team events refreshed successfully');
        }).catch(error => {
          console.error('Error syncing cache:', error);
          vscode.window.showErrorMessage('Failed to sync cache');
        });
      }
    );

    const clearCacheCommand = vscode.commands.registerCommand(
      'smartCopilot.clearCache',
      () => promptSearchService.clearCache()
    );

    const showConfigurationCommand = vscode.commands.registerCommand(
      'smartCopilot.showConfiguration',
      () => UserSettingsManager.showConfigurationStatus()
    );

    const openSettingsCommand = vscode.commands.registerCommand(
      'smartCopilot.openSettings',
      () => UserSettingsManager.openSettings()
    );

    // Setup periodic cache sync
    const syncInterval = vscode.workspace.getConfiguration('smartCopilot').get('cache.syncInterval', 24) * 60 * 60 * 1000;
    const syncTimer = setInterval(() => {
      if (vscode.workspace.getConfiguration('smartCopilot').get('features.teamEvents')) {
        // Refresh team events data periodically
        teamEventService.getTeamEvents('').catch(error => {
          console.error('Periodic sync failed:', error);
        });
      }
    }, syncInterval);

    context.subscriptions.push(
      openPanelCommand,
      syncCacheCommand,
      clearCacheCommand,
      showConfigurationCommand,
      openSettingsCommand,
      statusBarItem,
      { dispose: () => clearInterval(syncTimer) }
    );

    console.log('Smart Copilot Assistant initialized successfully!');
  } catch (error) {
    console.error('Failed to activate Smart Copilot Assistant:', error);
    vscode.window.showErrorMessage(`Smart Copilot Assistant failed to start: ${error}`);
  }
}

export function deactivate() { }