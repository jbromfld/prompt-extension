import { Client } from 'pg';
import * as vscode from 'vscode';

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
    variables?: any; // JSONB field
    usage_count?: number;
    created_at?: Date;
    updated_at?: Date;
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
    context: any; // JSONB field
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
    context: any; // JSONB field
    logs?: string;
    created_at: Date;
}

// Legacy interface for backward compatibility
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
    private client: Client | null = null;

    constructor(private context: vscode.ExtensionContext) { }

    async connect(): Promise<void> {
        const config = vscode.workspace.getConfiguration('smartCopilot');
        const postgresUrl = config.get<string>('database.postgresUrl');

        if (!postgresUrl) {
            throw new Error('PostgreSQL URL not configured');
        }

        this.client = new Client({ connectionString: postgresUrl });
        await this.client.connect();
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.end();
            this.client = null;
        }
    }

    async getTeams(): Promise<Team[]> {
        await this.ensureConnected();

        const sql = `
            SELECT id, team_name, description, apps, created_at
            FROM team 
            ORDER BY team_name ASC
        `;

        const result = await this.client!.query(sql);
        return result.rows;
    }

    async getCategories(): Promise<PromptCategory[]> {
        await this.ensureConnected();

        const sql = `
            SELECT * FROM prompt_categories 
            WHERE is_active = true 
            ORDER BY sort_order ASC, display_name ASC
        `;

        const result = await this.client!.query(sql);
        return result.rows;
    }

    async searchPrompts(query: string, categoryId?: number): Promise<PromptTemplate[]> {
        await this.ensureConnected();

        let sql = `
            SELECT pt.*, pt.variables as variables_json,
                   pc.name as category_name, pc.display_name as category_display_name,
                   pc.icon as category_icon, pc.color as category_color
            FROM prompt_templates pt
            LEFT JOIN prompt_categories pc ON pt.category_id = pc.id
            WHERE pt.prompt ILIKE $1
        `;
        const params: any[] = [`%${query}%`];

        if (categoryId) {
            sql += ` AND pt.category_id = $2`;
            params.push(categoryId);
        }

        sql += ` ORDER BY pt.usage_count DESC LIMIT 20`;

        const result = await this.client!.query(sql, params);
        return result.rows.map(row => ({
            ...row,
            variables: row.variables_json || [],
            category: row.category_name ? {
                id: row.category_id,
                name: row.category_name,
                display_name: row.category_display_name,
                icon: row.category_icon,
                color: row.category_color
            } : undefined
        }));
    }

    async getPromptsByCategory(categoryId: number): Promise<PromptTemplate[]> {
        await this.ensureConnected();

        const sql = `
            SELECT pt.*, pt.variables as variables_json,
                   pc.name as category_name, pc.display_name as category_display_name,
                   pc.icon as category_icon, pc.color as category_color
            FROM prompt_templates pt
            LEFT JOIN prompt_categories pc ON pt.category_id = pc.id
            WHERE pt.category_id = $1
            ORDER BY pt.usage_count DESC
        `;

        const result = await this.client!.query(sql, [categoryId]);
        return result.rows.map(row => ({
            ...row,
            variables: row.variables_json || [],
            category: row.category_name ? {
                id: row.category_id,
                name: row.category_name,
                display_name: row.category_display_name,
                icon: row.category_icon,
                color: row.category_color
            } : undefined
        }));
    }

    async incrementPromptUsage(promptId: string): Promise<void> {
        await this.ensureConnected();

        await this.client!.query(`
      UPDATE prompt_templates 
      SET usage_count = COALESCE(usage_count, 0) + 1,
          updated_at = NOW()
      WHERE id = $1
    `, [promptId]);
    }

    async getDeployEvents(teamId: number, limit: number = 50): Promise<DeployEvent[]> {
        await this.ensureConnected();

        const result = await this.client!.query(`
            SELECT id, team_id, user_id, event_type, result, app_name, app_version, build_url, context, logs, created_at
            FROM deploy_table
            WHERE team_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [teamId, limit]);

        return result.rows;
    }

    async getTestEvents(teamId: number, limit: number = 50): Promise<TestEvent[]> {
        await this.ensureConnected();

        const result = await this.client!.query(`
            SELECT id, team_id, user_id, event_type, result, app_name, app_version, build_url, context, logs, created_at
            FROM test_table
            WHERE team_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [teamId, limit]);

        return result.rows;
    }

    async getFailureEvents(teamId: number, limit: number = 50): Promise<(DeployEvent | TestEvent)[]> {
        await this.ensureConnected();

        const deployResult = await this.client!.query(`
            SELECT id, team_id, user_id, event_type, result, app_name, app_version, build_url, context, logs, created_at, 'deploy' as table_type
            FROM deploy_table
            WHERE team_id = $1 AND result = 'failure'
            ORDER BY created_at DESC
            LIMIT $2
        `, [teamId, limit]);

        const testResult = await this.client!.query(`
            SELECT id, team_id, user_id, event_type, result, app_name, app_version, build_url, context, logs, created_at, 'test' as table_type
            FROM test_table
            WHERE team_id = $1 AND result = 'failure'
            ORDER BY created_at DESC
            LIMIT $2
        `, [teamId, limit]);

        const allEvents = [...deployResult.rows, ...testResult.rows];
        return allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
    }

    // Legacy method for backward compatibility
    async getTeamEvents(teamId: string, limit: number = 50): Promise<TeamEvent[]> {
        await this.ensureConnected();

        const result = await this.client!.query(`
      SELECT id, team_id, user_id, event_type, result, context, logs, created_at
      FROM team_events
      WHERE team_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [teamId, limit]);

        return result.rows;
    }

    async getEventContext(eventId: string): Promise<any> {
        await this.ensureConnected();

        const result = await this.client!.query(`
      SELECT context, logs
      FROM team_events
      WHERE id = $1
    `, [eventId]);

        return result.rows[0] || null;
    }

    private async ensureConnected(): Promise<void> {
        if (!this.client) {
            await this.connect();
        }
    }
}
