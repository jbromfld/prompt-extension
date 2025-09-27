import * as vscode from 'vscode';

export interface UserSettings {
  userId: string;
  teamId: string;
  personalAccessToken?: string;
}

export class UserSettingsManager {
  /**
   * Get user settings from VS Code configuration
   */
  static getUserSettings(): UserSettings {
    const config = vscode.workspace.getConfiguration('smartCopilot');
    
    return {
      userId: config.get<string>('user.id', ''),
      teamId: config.get<string>('user.teamId', ''),
      personalAccessToken: config.get<string>('user.personalAccessToken', '') || undefined
    };
  }

  /**
   * Check if user has configured basic settings
   */
  static hasBasicConfiguration(): boolean {
    const settings = this.getUserSettings();
    return !!settings.userId;
  }

  /**
   * Check if user has configured team features
   */
  static hasTeamConfiguration(): boolean {
    const settings = this.getUserSettings();
    return !!(settings.userId && settings.teamId);
  }

  /**
   * Check if user has configured enhanced features
   */
  static hasEnhancedConfiguration(): boolean {
    const settings = this.getUserSettings();
    return !!(settings.userId && settings.personalAccessToken);
  }

  /**
   * Get service configuration
   */
  static getServiceConfig() {
    const config = vscode.workspace.getConfiguration('smartCopilot');
    
    return {
      type: config.get<string>('service.type', 'local'),
      localUrl: config.get<string>('service.localUrl', 'http://127.0.0.1:8000'),
      serverlessUrl: config.get<string>('service.serverlessUrl', ''),
      apiKey: config.get<string>('service.apiKey', '') || undefined
    };
  }

  /**
   * Show configuration status to user
   */
  static showConfigurationStatus(): void {
    const hasBasic = this.hasBasicConfiguration();
    const hasTeam = this.hasTeamConfiguration();
    const hasEnhanced = this.hasEnhancedConfiguration();
    
    const status = [
      `Basic Features: ${hasBasic ? '✅ Configured' : '❌ Not configured'}`,
      `Team Features: ${hasTeam ? '✅ Configured' : '❌ Not configured'}`,
      `Enhanced Features: ${hasEnhanced ? '✅ Configured' : '❌ Not configured'}`
    ].join('\n');

    const message = hasBasic 
      ? `Smart Copilot Configuration:\n\n${status}`
      : `Smart Copilot needs configuration!\n\n${status}\n\nPlease configure your user ID in VS Code settings.`;

    if (hasBasic) {
      vscode.window.showInformationMessage(message);
    } else {
      vscode.window.showWarningMessage(message);
    }
  }

  /**
   * Open VS Code settings to the Smart Copilot section
   */
  static openSettings(): void {
    vscode.commands.executeCommand('workbench.action.openSettings', 'smartCopilot');
  }

  /**
   * Show a helpful message about configuration
   */
  static showConfigurationHelp(): void {
    const message = `Smart Copilot Assistant Configuration

To get started:
1. Open VS Code Settings (Ctrl/Cmd + ,)
2. Search for "Smart Copilot"
3. Configure your User ID for basic features
4. Optionally add Team ID for collaboration
5. Optionally add Personal Access Token for enhanced features

The extension works without any configuration, but some features will be limited.`;

    vscode.window.showInformationMessage(message, 'Open Settings')
      .then(selection => {
        if (selection === 'Open Settings') {
          this.openSettings();
        }
      });
  }
}
