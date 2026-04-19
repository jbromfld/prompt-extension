import * as vscode from 'vscode';
import { UserSettingsManager } from './UserSettingsManager';

export interface PromptApiItem {
  id: string;
  category: string;
  title: string;
  body: string;
  usage_count: number;
  final_score: number;
}

interface PromptSearchResponse {
  query: string;
  count: number;
  prompts: PromptApiItem[];
}

interface CategoriesResponse {
  categories: string[];
}

interface PromptUsageResponse {
  ok: boolean;
  prompt_id: string;
  usage_count: number;
}

interface PromptRatingResponse {
  ok: boolean;
  prompt_id: string;
  rating: number;
  rating_count: number;
  average_rating: number;
}

export interface PromptServiceConfig {
  serviceUrl: string;
  apiKey?: string;
}

export class SmartCopilotService {
  private config: PromptServiceConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): PromptServiceConfig {
    const workspaceConfig = vscode.workspace.getConfiguration('smartCopilot');
    const configuredUrl = workspaceConfig.get<string>('promptService.url', 'http://127.0.0.1:8090');

    return {
      serviceUrl: process.env.PROMPT_SERVICE_URL || configuredUrl,
      apiKey: process.env.PROMPT_SERVICE_API_KEY
    };
  }

  private baseUrl(path: string): string {
    const normalized = this.config.serviceUrl.endsWith('/')
      ? this.config.serviceUrl.slice(0, -1)
      : this.config.serviceUrl;
    return `${normalized}${path}`;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown
  ): Promise<T> {
    const requestUrl = this.baseUrl(endpoint);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const userId = UserSettingsManager.getUserId();
    if (userId) {
      headers['X-User-ID'] = userId;
    }

    const response = await fetch(requestUrl, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
      let detail = '';
      try {
        const responseBody = await response.text();
        if (responseBody) {
          detail = ` - ${responseBody}`;
        }
      } catch {
        // Best-effort only. Keep the original status text if body parsing fails.
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText} (${requestUrl})${detail}`);
    }

    return response.json() as Promise<T>;
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      await this.makeRequest('/health');
      return true;
    } catch {
      return false;
    }
  }

  async getCategories(): Promise<string[]> {
    const response = await this.makeRequest<CategoriesResponse>('/categories');
    return response.categories;
  }

  async searchPrompts(query: string, limit = 20, category?: string): Promise<PromptApiItem[]> {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('limit', String(limit));
    if (category) {
      params.set('category', category);
    }

    const response = await this.makeRequest<PromptSearchResponse>(`/prompts/search?${params.toString()}`);
    return response.prompts;
  }

  async getPopularPrompts(limit = 20, category?: string): Promise<PromptApiItem[]> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (category) {
      params.set('category', category);
    }

    const response = await this.makeRequest<PromptSearchResponse>(`/prompts/popular?${params.toString()}`);
    return response.prompts;
  }

  async usePrompt(promptId: string): Promise<PromptUsageResponse> {
    const userId = UserSettingsManager.getUserId();
    return this.makeRequest<PromptUsageResponse>('/prompts/usage', 'POST', {
      prompt_id: promptId,
      source: 'extension-panel',
      actor: userId || null,
      context: { client: 'smart-copilot-assistant' }
    });
  }

  async ratePrompt(promptId: string, rating: number): Promise<PromptRatingResponse> {
    const userId = UserSettingsManager.getUserId();
    const params = new URLSearchParams();
    params.set('rating', String(rating));
    if (userId) {
      params.set('actor', userId);
    }

    return this.makeRequest<PromptRatingResponse>(`/prompts/${encodeURIComponent(promptId)}/rate?${params.toString()}`, 'POST');
  }
}
