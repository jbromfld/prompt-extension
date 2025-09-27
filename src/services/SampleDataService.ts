import { PromptTemplate, TeamEvent, PromptCategory } from './DatabaseService';

export class SampleDataService {
    private static readonly SAMPLE_CATEGORIES: PromptCategory[] = [
        {
            id: 'cat-test',
            name: 'test',
            display_name: 'Testing',
            description: 'Unit tests, integration tests, test automation',
            icon: '🧪',
            color: '#4CAF50',
            sort_order: 1,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'cat-deploy',
            name: 'deploy',
            display_name: 'Deployment',
            description: 'CI/CD, deployment strategies, infrastructure',
            icon: '🚀',
            color: '#FF9800',
            sort_order: 2,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'cat-build',
            name: 'build',
            display_name: 'Build & Compile',
            description: 'Build errors, compilation issues, dependencies',
            icon: '🔨',
            color: '#2196F3',
            sort_order: 3,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'cat-docs',
            name: 'docs',
            display_name: 'Documentation',
            description: 'API docs, user guides, code documentation',
            icon: '📚',
            color: '#9C27B0',
            sort_order: 4,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'cat-agile',
            name: 'agile',
            display_name: 'Agile & Process',
            description: 'Sprint planning, retrospectives, process improvement',
            icon: '🏃',
            color: '#607D8B',
            sort_order: 5,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        }
    ];

    private static readonly SAMPLE_PROMPTS: PromptTemplate[] = [
        {
            id: 'test-1',
            category_id: 'cat-test',
            prompt: 'Write a unit test for the following function:\n\n```typescript\nfunction calculateTotal(items: Item[], tax: number): number {\n  // implementation\n}\n```',
            variables: ['functionName', 'parameters'],
            usage_count: 15,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'test-2',
            category_id: 'cat-test',
            prompt: 'Create integration tests for the API endpoint `/api/users` that covers:\n- GET request (list users)\n- POST request (create user)\n- Error handling\n- Authentication',
            variables: ['endpoint', 'methods'],
            usage_count: 8,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'test-3',
            category_id: 'cat-test',
            prompt: 'Write a Jest test suite for the React component `UserProfile` that tests:\n- Rendering with props\n- User interactions\n- Error states\n- Loading states',
            variables: ['componentName', 'framework'],
            usage_count: 12,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'deploy-1',
            category_id: 'cat-deploy',
            prompt: 'Create a GitHub Actions workflow for deploying a Node.js application to AWS Lambda with:\n- Build step\n- Test step\n- Deploy step\n- Environment variables',
            variables: ['platform', 'service'],
            usage_count: 6,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'deploy-2',
            category_id: 'cat-deploy',
            prompt: 'Set up a Docker deployment pipeline that includes:\n- Multi-stage build\n- Security scanning\n- Registry push\n- Health checks',
            variables: ['registry', 'security'],
            usage_count: 9,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'build-1',
            category_id: 'cat-build',
            prompt: 'Configure a TypeScript build process with:\n- Type checking\n- Linting with ESLint\n- Bundling with Webpack\n- Source maps for debugging',
            variables: ['bundler', 'linter'],
            usage_count: 11,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'build-2',
            category_id: 'cat-build',
            prompt: 'Set up a Python build system with:\n- Virtual environment management\n- Dependency installation\n- Code formatting with Black\n- Type checking with mypy',
            variables: ['language', 'tools'],
            usage_count: 7,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'docs-1',
            category_id: 'cat-docs',
            prompt: 'Write comprehensive API documentation for the REST endpoints including:\n- Request/response schemas\n- Authentication requirements\n- Error codes\n- Example requests',
            variables: ['apiType', 'format'],
            usage_count: 4,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'docs-2',
            category_id: 'cat-docs',
            prompt: 'Create user documentation for the application setup process:\n- Prerequisites\n- Installation steps\n- Configuration\n- Troubleshooting',
            variables: ['audience', 'format'],
            usage_count: 3,
            created_at: new Date(),
            updated_at: new Date()
        },
        {
            id: 'agile-1',
            category_id: 'cat-agile',
            prompt: 'Help me plan the next sprint for {project_name}. What should we prioritize and how should we break down the user stories?',
            variables: ['project_name'],
            usage_count: 5,
            created_at: new Date(),
            updated_at: new Date()
        }
    ];

    static getCategories(): PromptCategory[] {
        return this.SAMPLE_CATEGORIES;
    }

    static searchPrompts(query: string, categoryId?: string): PromptTemplate[] {
        let prompts = this.SAMPLE_PROMPTS;

        // Filter by category if specified
        if (categoryId && categoryId !== '') {
            prompts = prompts.filter(prompt => prompt.category_id === categoryId);
        }

        // Filter by query with better matching
        if (query && query.trim() !== '') {
            const searchTerm = query.toLowerCase();
            prompts = prompts.filter(prompt => {
                const promptText = prompt.prompt.toLowerCase();
                const variables = prompt.variables?.join(' ').toLowerCase() || '';

                // Check for exact matches first, then partial matches
                return promptText.includes(searchTerm) ||
                    variables.includes(searchTerm) ||
                    // Check for word boundaries for better matching
                    promptText.split(' ').some(word => word.startsWith(searchTerm)) ||
                    promptText.includes('test') && searchTerm.includes('test') ||
                    promptText.includes('unit') && searchTerm.includes('test') ||
                    promptText.includes('integration') && searchTerm.includes('test');
            });
        }

        // Sort by relevance and usage count
        return prompts.sort((a, b) => {
            // Prioritize exact matches
            const aExact = a.prompt.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
            const bExact = b.prompt.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;

            if (aExact !== bExact) {
                return bExact - aExact;
            }

            // Then by usage count
            return (b.usage_count || 0) - (a.usage_count || 0);
        });
    }

    static getPromptsByCategory(categoryId: string): PromptTemplate[] {
        return this.SAMPLE_PROMPTS.filter(prompt => prompt.category_id === categoryId);
    }

    static getAllPrompts(): PromptTemplate[] {
        return [...this.SAMPLE_PROMPTS];
    }

    private static readonly SAMPLE_TEAM_EVENTS: TeamEvent[] = [
        {
            id: 'event-1',
            team_id: 'team-dev-2024',
            user_id: 'john.doe@company.com',
            event_type: 'build',
            result: 'success',
            context: { buildTime: 120, artifacts: ['app.tar.gz'] },
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
            id: 'event-2',
            team_id: 'team-dev-2024',
            user_id: 'jane.smith@company.com',
            event_type: 'test',
            result: 'failure',
            context: {
                testSuite: 'integration-tests',
                failedTests: ['user-authentication', 'api-validation'],
                error: 'Database connection timeout'
            },
            logs: 'Error: Connection timeout after 30s\n  at Database.connect()',
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
        },
        {
            id: 'event-3',
            team_id: 'team-dev-2024',
            user_id: 'mike.wilson@company.com',
            event_type: 'deploy',
            result: 'success',
            context: {
                environment: 'staging',
                version: '1.2.3',
                deploymentTime: 45
            },
            created_at: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
        },
        {
            id: 'event-4',
            team_id: 'team-dev-2024',
            user_id: 'sarah.jones@company.com',
            event_type: 'build',
            result: 'failure',
            context: {
                buildTool: 'webpack',
                error: 'Module not found: Cannot resolve dependency',
                missingModule: '@company/ui-components'
            },
            logs: 'ERROR in ./src/App.tsx\nModule not found: Error: Cannot resolve dependency \'@company/ui-components\'',
            created_at: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
        },
        {
            id: 'event-5',
            team_id: 'team-dev-2024',
            user_id: 'alex.brown@company.com',
            event_type: 'test',
            result: 'success',
            context: {
                testSuite: 'unit-tests',
                testsRun: 156,
                coverage: 85.2
            },
            created_at: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
        }
    ];

    static getTeamEvents(teamId: string): TeamEvent[] {
        return this.SAMPLE_TEAM_EVENTS.filter(event => event.team_id === teamId);
    }

    static getFailureEvents(teamId: string): TeamEvent[] {
        return this.SAMPLE_TEAM_EVENTS.filter(event =>
            event.team_id === teamId && event.result === 'failure'
        );
    }
}
