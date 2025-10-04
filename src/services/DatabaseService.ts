import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export interface Team {
    id: number;
    team_name: string;
    description?: string;
    apps: string[];
    created_at: Date;
}

export interface PromptCategory {
    id: number;
    name: string;
    display_name: string;
    description?: string;
    icon?: string;
    color?: string;
    sort_order?: number;
    is_active?: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface PromptTemplate {
    id: string;
    category_id: number;
    category?: PromptCategory;
    prompt: string;
    variables?: any;
    usage_count?: number;
    created_at?: Date;
    updated_at?: Date;
    category_name?: string;
    display_name?: string;
    icon?: string;
    color?: string;
}

export interface DeployEvent {
    id: string;
    team_id: number;
    user_id: string;
    event_type: string;
    result: 'success' | 'failure' | 'pending';
    app_name: string;
    app_version?: string;
    build_url?: string;
    context: any;
    logs?: string;
    created_at: Date;
}

export interface TestEvent {
    id: string;
    team_id: number;
    user_id: string;
    event_type: string;
    result: 'success' | 'failure' | 'pending';
    app_name: string;
    app_version?: string;
    build_url?: string;
    context: any;
    logs?: string;
    created_at: Date;
}

export interface TeamEvent {
    id: string;
    team_id: string;
    user_id: string;
    event_type: string;
    result: 'success' | 'failure' | 'pending';
    context: any;
    logs?: string;
    created_at: Date;
}

export class DatabaseService {
    private apiClient: AxiosInstance | null = null;
    private serviceUrl: string = '';
    private serviceToken: string = '';

    constructor(private context: vscode.ExtensionContext) { }

    async connect(): Promise<void> {
        const config = vscode.workspace.getConfiguration('smartCopilot');
        this.serviceUrl = config.get<string>('service.url', 'http://localhost:8000');
        this.serviceToken = config.get<string>('service.token', '');

        this.apiClient = axios.create({
            baseURL: this.serviceUrl,
            headers: {
                'Content-Type': 'application/json',
                ...(this.serviceToken && { 'X-Service-Token': this.serviceToken })
            },
            timeout: 10000
        });
    }

    async disconnect(): Promise<void> {
        this.apiClient = null;
    }

    async getTeams(): Promise<Team[]> {
        await this.ensureConnected();
        const response = await this.apiClient!.get('/api/teams');
        return response.data.teams;
    }

    async getCategories(): Promise<PromptCategory[]> {
        await this.ensureConnected();
        const response = await this.apiClient!.get('/api/categories');
        return response.data.categories;
    }

    async searchPrompts(query: string, categoryId?: number): Promise<PromptTemplate[]> {
        await this.ensureConnected();
        const response = await this.apiClient!.post('/api/prompts/search', {
            query,
            category_id: categoryId,
            limit: 20
        });
        return response.data.prompts;
    }

    async getPromptsByCategory(categoryId: number): Promise<PromptTemplate[]> {
        await this.ensureConnected();
        const response = await this.apiClient!.post('/api/prompts/search', {
            query: '',
            category_id: categoryId,
            limit: 100
        });
        return response.data.prompts;
    }

    async incrementPromptUsage(promptId: string): Promise<void> {
        await this.ensureConnected();
        await this.apiClient!.post(`/api/prompts/use/${promptId}`);
    }

    async getDeployEvents(teamId: number, limit: number = 50): Promise<DeployEvent[]> {
        await this.ensureConnected();
        const response = await this.apiClient!.post('/api/team/deploy-events', {
            team_id: teamId.toString(),
            limit
        });
        return response.data.events;
    }

    async getTestEvents(teamId: number, limit: number = 50): Promise<TestEvent[]> {
        await this.ensureConnected();
        const response = await this.apiClient!.post('/api/team/test-events', {
            team_id: teamId.toString(),
            limit
        });
        return response.data.events;
    }

    async getFailureEvents(teamId: number, limit: number = 50): Promise<(DeployEvent | TestEvent)[]> {
        await this.ensureConnected();
        const response = await this.apiClient!.post('/api/team/failure-events', {
            team_id: teamId.toString(),
            limit
        });
        return response.data.events;
    }

    async getTeamEvents(teamId: string, limit: number = 50): Promise<TeamEvent[]> {
        await this.ensureConnected();
        const response = await this.apiClient!.post('/api/team/events', {
            team_id: teamId,
            limit
        });
        return response.data.events;
    }

    async getEventContext(eventId: string): Promise<any> {
        await this.ensureConnected();
        const response = await this.apiClient!.get(`/api/team/event/${eventId}/context`);
        return response.data;
    }

    private async ensureConnected(): Promise<void> {
        if (!this.apiClient) {
            await this.connect();
        }
    }
}
