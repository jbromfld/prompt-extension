import * as vscode from 'vscode';
import { UserSettingsManager } from './UserSettingsManager';

export interface SmartCopilotConfig {
    serviceUrl: string;
    apiKey?: string;
}

export interface SimilarCase {
    id: string;
    title: string;
    description: string;
    solution: string;
    error_type: string;
    tags: string[];
    similarity: number;
}

export interface ParsedError {
    type: string;
    error_message: string;
    file?: string;
    line?: number;
    column?: number;
    stack_trace?: string;
    severity: string;
    raw_error: string;
}

export interface ErrorContext {
    parsed_error: ParsedError;
    similar_cases: SimilarCase[];
    logs: string;
    suggestions: string[];
}

export class SmartCopilotService {
    private config: SmartCopilotConfig;

    constructor() {
        this.config = this.loadConfig();
    }

    private loadConfig(): SmartCopilotConfig {
        // Service URL can be configured via environment variable or use default
        const serviceUrl = process.env.SMART_COPILOT_SERVICE_URL || 'http://127.0.0.1:8000';
        const apiKey = process.env.SMART_COPILOT_API_KEY;

        return {
            serviceUrl,
            apiKey
        };
    }

    private async makeRequest<T>(endpoint: string, data?: any, method: string = 'GET'): Promise<T> {
        const url = `${this.config.serviceUrl}${endpoint}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        // Add authentication headers if API key is provided
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        // Add user context for team features
        const userSettings = UserSettingsManager.getUserSettings();
        if (userSettings.userId) {
            headers['X-User-ID'] = userSettings.userId;
            if (userSettings.teamId) {
                headers['X-Team-ID'] = userSettings.teamId;
            }
            if (userSettings.personalAccessToken) {
                headers['X-Personal-Token'] = userSettings.personalAccessToken;
            }
        }

        try {
            const requestOptions: RequestInit = {
                method: method,
                headers
            };

            // Only include body for methods that support it
            if (data && method !== 'GET' && method !== 'HEAD') {
                requestOptions.body = JSON.stringify(data);
            }

            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData.detail) {
                        errorMessage += ` - ${errorData.detail}`;
                    }
                } catch (e) {
                    // Ignore JSON parsing errors
                }
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error(`Smart Copilot Service request failed: ${error}`);
            throw error;
        }
    }

    async searchSimilarCases(query: string, limit: number = 5): Promise<SimilarCase[]> {
        try {
            const response = await this.makeRequest<{ results: SimilarCase[] }>(
                '/api/search/similar-cases',
                { query, limit },
                'POST'
            );
            return response.results;
        } catch (error) {
            console.error('Error searching similar cases:', error);
            return [];
        }
    }

    async processErrorContext(context: any): Promise<ErrorContext> {
        try {
            return await this.makeRequest<ErrorContext>(
                '/api/process/error-context',
                { context },
                'POST'
            );
        } catch (error) {
            console.error('Error processing error context:', error);
            throw error;
        }
    }

    async enhancePrompt(prompt: string, context: any): Promise<string> {
        try {
            const response = await this.makeRequest<{ enhanced_prompt: string }>(
                '/api/enhance/prompt',
                { prompt, context },
                'POST'
            );
            return response.enhanced_prompt;
        } catch (error) {
            console.error('Error enhancing prompt:', error);
            return prompt; // Return original prompt on error
        }
    }

    async searchPrompts(query: string, type?: string | number, limit: number = 20): Promise<any[]> {
        try {
            // Only include category_id if it's a valid number
            const requestData: any = { query, limit };
            if (type !== undefined && type !== null && !isNaN(Number(type))) {
                requestData.category_id = Number(type);
            }

            const response = await this.makeRequest<{ prompts: any[] }>(
                '/api/prompts/search',
                requestData,
                'POST'
            );
            return response.prompts;
        } catch (error) {
            console.error('Error searching prompts:', error);
            return [];
        }
    }

    async getTeamEvents(teamId: string, limit: number = 50): Promise<any[]> {
        try {
            const response = await this.makeRequest<{ events: any[] }>(
                '/api/team/events',
                { team_id: teamId, limit },
                'POST'
            );
            return response.events;
        } catch (error) {
            console.error('Error getting team events:', error);
            return [];
        }
    }

    async usePrompt(promptId: string): Promise<void> {
        try {
            await this.makeRequest(
                `/api/prompts/use/${promptId}`,
                {},
                'POST'
            );
        } catch (error) {
            console.error('Error tracking prompt usage:', error);
            // Don't throw error - this is not critical
        }
    }

    async getCategories(): Promise<any[]> {
        try {
            const response = await this.makeRequest<{ categories: any[] }>(
                '/categories'
            );
            return response.categories;
        } catch (error) {
            console.error('Error getting categories:', error);
            return [];
        }
    }

    async autocompleteSearch(query: string, limit: number = 10): Promise<any> {
        try {
            const response = await this.makeRequest<any>(
                `/search/autocomplete?q=${encodeURIComponent(query)}&limit=${limit}`
            );
            return response;
        } catch (error) {
            console.error('Error in autocomplete search:', error);
            return { results: [], query, category_filter: null };
        }
    }

    async getTeams(): Promise<any[]> {
        try {
            const response = await this.makeRequest<{ teams: any[] }>(
                '/api/teams'
            );
            return response.teams;
        } catch (error) {
            console.error('Error getting teams:', error);
            return [];
        }
    }

    async getDeployEvents(teamId: number, limit: number = 50): Promise<any[]> {
        try {
            const response = await this.makeRequest<{ events: any[] }>(
                '/api/team/deploy-events',
                { team_id: teamId, limit },
                'POST'
            );
            return response.events;
        } catch (error) {
            console.error('Error getting deploy events:', error);
            return [];
        }
    }

    async getTestEvents(teamId: number, limit: number = 50): Promise<any[]> {
        try {
            const response = await this.makeRequest<{ events: any[] }>(
                '/api/team/test-events',
                { team_id: teamId, limit },
                'POST'
            );
            return response.events;
        } catch (error) {
            console.error('Error getting test events:', error);
            return [];
        }
    }

    async getFailureEvents(teamId: number, limit: number = 50): Promise<any[]> {
        try {
            const response = await this.makeRequest<{ events: any[] }>(
                '/api/team/failure-events',
                { team_id: teamId, limit },
                'POST'
            );
            return response.events;
        } catch (error) {
            console.error('Error getting failure events:', error);
            return [];
        }
    }

    async checkServiceHealth(): Promise<boolean> {
        try {
            await this.makeRequest('/health');
            return true;
        } catch (error) {
            return false;
        }
    }

    async installLocalService(): Promise<void> {
        // Check if smart-copilot-service is installed
        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
            const pip = spawn('pip', ['show', 'smart-copilot-service'], { stdio: 'pipe' });

            pip.on('close', (code: number) => {
                if (code === 0) {
                    // Package is already installed
                    resolve();
                } else {
                    // Package not installed, try to install it
                    const install = spawn('pip', ['install', 'smart-copilot-service'], { stdio: 'pipe' });

                    install.on('close', (installCode: number) => {
                        if (installCode === 0) {
                            resolve();
                        } else {
                            reject(new Error('Failed to install smart-copilot-service'));
                        }
                    });

                    install.on('error', reject);
                }
            });

            pip.on('error', reject);
        });
    }

    async startLocalService(): Promise<void> {
        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
            const service = spawn('smart-copilot-service', [], {
                stdio: 'pipe',
                detached: false
            });

            // Wait for service to be ready
            setTimeout(() => {
                this.checkServiceHealth().then(healthy => {
                    if (healthy) {
                        resolve();
                    } else {
                        reject(new Error('Service failed to start'));
                    }
                });
            }, 3000);

            service.on('error', reject);
        });
    }
}
