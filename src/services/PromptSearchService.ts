import { DatabaseService, PromptTemplate, PromptCategory } from './DatabaseService';
import { SmartCopilotService } from './SmartCopilotService';
import { LocalCacheService } from './LocalCacheService';
import * as vscode from 'vscode';

export class PromptSearchService {
    private localCache: LocalCacheService;
    private smartCopilotService: SmartCopilotService;
    private cacheInitialized: boolean = false;

    constructor(
        private databaseService: DatabaseService,
        smartCopilotService: SmartCopilotService
    ) {
        this.localCache = new LocalCacheService();
        this.smartCopilotService = smartCopilotService;
    }

    async getCategories(): Promise<PromptCategory[]> {
        try {
            // Try local cache first for instant results
            if (await this.localCache.isCacheValid()) {
                const cachedCategories = await this.localCache.loadCategories();
                if (cachedCategories.length > 0) {
                    console.log(`Loaded ${cachedCategories.length} categories from local cache`);
                    return cachedCategories;
                }
            }

            // Try API service
            try {
                const categoryStrings = await this.smartCopilotService.getCategories();
                // Convert string categories to PromptCategory objects
                const categories: PromptCategory[] = categoryStrings.map((name: string, index: number) => ({
                    id: index + 1,
                    name: name,
                    display_name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
                    icon: '📁',
                    color: undefined
                }));

                // Update local cache in background
                this.updateLocalCacheInBackground();
                return categories;
            } catch (apiError) {
                console.log('API service not available, returning empty categories');
                return [];
            }
        } catch (error) {
            console.error('Error getting categories:', error);
            return [];
        }
    }

    async searchPrompts(query: string, categoryId?: number): Promise<PromptTemplate[]> {
        try {
            // Try local cache first for instant autocomplete
            if (await this.localCache.isCacheValid()) {
                const localResults = await this.localCache.searchPromptsLocally(query, categoryId?.toString());
                if (localResults.length > 0) {
                    console.log(`Found ${localResults.length} prompts from local cache`);
                    return await this.enrichPromptsWithCategories(localResults);
                }
            }

            // Try API service for fresh results
            try {
                // Only call API if we have a meaningful query
                if (query && query.trim().length > 0) {
                    // If we have a category filter, modify the query to include @category syntax
                    let searchQuery = query;
                    if (categoryId) {
                        // Get category name from cache or use the ID
                        const categories = await this.getCategories();
                        const category = categories.find(cat => cat.id === categoryId);
                        if (category) {
                            searchQuery = `@${category.name} ${query}`;
                        }
                    }

                    const response = await this.smartCopilotService.autocompleteSearch(searchQuery, 20);
                    // Filter to only return prompts (not categories) and format them properly
                    const results = (response.results || [])
                        .filter((result: any) => result.type === 'prompt')
                        .map((result: any) => ({
                            id: result.id,
                            title: result.title,
                            description: result.description,
                            prompt: result.description,
                            category: result.category ? { name: result.category } : null,
                            score: result.score
                        }));

                    // Update local cache in background
                    this.updateLocalCacheInBackground();
                    return results;
                } else {
                    // For empty queries, just return empty results
                    return [];
                }
            } catch (apiError) {
                console.log('API service not available, returning empty results');
                return [];
            }
        } catch (error) {
            console.error('Error searching prompts:', error);
            return [];
        }
    }

    async getPromptsByCategory(categoryId: number): Promise<PromptTemplate[]> {
        try {
            // Try local cache first
            if (await this.localCache.isCacheValid()) {
                const allPrompts = await this.localCache.loadPrompts();
                const filteredPrompts = allPrompts.filter(prompt => prompt.category_id === categoryId);
                if (filteredPrompts.length > 0) {
                    return filteredPrompts;
                }
            }

            // Try database
            try {
                const prompts = await this.databaseService.getPromptsByCategory(categoryId);
                // Update local cache in background
                this.updateLocalCacheInBackground();
                return prompts;
            } catch (dbError) {
                console.log('Database not available, returning empty results');
                return [];
            }
        } catch (error) {
            console.error('Error getting prompts by category:', error);
            return [];
        }
    }

    async usePrompt(promptId: string): Promise<void> {
        try {
            // Try API service first
            try {
                await this.smartCopilotService.usePrompt(promptId);
                // Update local cache in background to reflect usage changes
                this.updateLocalCacheInBackground();
            } catch (apiError) {
                console.log('API service not available for usage tracking');
                // Don't throw error - this is not critical functionality
            }
        } catch (error) {
            console.error('Error tracking prompt usage:', error);
            // Don't throw error - this is not critical functionality
        }
    }

    async ratePrompt(promptId: string, rating: number): Promise<void> {
        try {
            // Try API service first
            try {
                await this.smartCopilotService.ratePrompt(promptId, rating);
                // Update local cache in background to reflect rating changes
                this.updateLocalCacheInBackground();
            } catch (apiError) {
                console.error('Failed to submit rating:', apiError);
                throw apiError; // Rating is important, so we should surface the error
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            throw error; // Rating is important functionality
        }
    }

    async searchKnowledge(query: string, spaceKey?: string, limit: number = 10): Promise<any[]> {
        try {
            // Try API service first
            try {
                const results = await this.smartCopilotService.searchKnowledge(query, spaceKey, limit);
                console.log(`Found ${results.length} knowledge results for query: "${query}"`);
                return results;
            } catch (apiError) {
                console.log('API service not available for knowledge search:', apiError);
                // For now, return empty array if API is not available
                // In the future, we could implement local knowledge search
                return [];
            }
        } catch (error) {
            console.error('Error searching knowledge:', error);
            return [];
        }
    }

    /**
     * Manually update local cache from database
     */
    async updateCache(): Promise<void> {
        try {
            console.log('Updating local cache...');

            // Try API service first
            try {
                const categoryStrings = await this.smartCopilotService.getCategories();
                // Convert string categories to PromptCategory objects
                const categories: PromptCategory[] = categoryStrings.map((name: string, index: number) => ({
                    id: index + 1,
                    name: name,
                    display_name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
                    icon: '📁',
                    color: undefined
                }));

                // Skip fetching prompts from API since it's causing 422 errors
                // Just update the cache with categories for now
                const allPrompts: PromptTemplate[] = [];

                console.log(`Skipping prompt fetching due to API limitations, updating cache with ${categories.length} categories only`);

                // Update local cache
                await this.localCache.updateCache(categories, allPrompts);

                console.log(`Cache updated: ${categories.length} categories, ${allPrompts.length} prompts`);
            } catch (apiError) {
                console.log('API service not available, skipping cache update');
            }
        } catch (error) {
            console.error('Failed to update cache:', error);
            throw error;
        }
    }

    /**
     * Clear local cache
     */
    async clearCache(): Promise<void> {
        try {
            await this.localCache.clearCache();
            console.log('Local cache cleared');
        } catch (error) {
            console.error('Failed to clear cache:', error);
            throw error;
        }
    }

    /**
     * Get cache information
     */
    async getCacheInfo(): Promise<{
        isValid: boolean;
        age: number;
        size: number;
        categoriesCount: number;
        promptsCount: number;
    }> {
        try {
            const isValid = await this.localCache.isCacheValid();
            const age = await this.localCache.getCacheAge();
            const size = await this.localCache.getCacheSize();
            const metadata = await this.localCache.loadMetadata();

            return {
                isValid,
                age: Math.round(age * 100) / 100, // Round to 2 decimal places
                size,
                categoriesCount: metadata?.categoriesCount || 0,
                promptsCount: metadata?.promptsCount || 0
            };
        } catch (error) {
            console.error('Failed to get cache info:', error);
            return {
                isValid: false,
                age: Infinity,
                size: 0,
                categoriesCount: 0,
                promptsCount: 0
            };
        }
    }

    /**
     * Update local cache in background (non-blocking)
     */
    private async updateLocalCacheInBackground(): Promise<void> {
        if (this.cacheInitialized) {
            return; // Already updating
        }

        this.cacheInitialized = true;

        try {
            // Check cache age
            const cacheAge = await this.localCache.getCacheAge();
            const maxAge = vscode.workspace.getConfiguration('smartCopilot').get('cache.maxAge', 24); // hours

            if (cacheAge > maxAge) {
                console.log(`Cache is ${cacheAge.toFixed(1)} hours old, updating in background...`);
                await this.updateCache();
            }
        } catch (error) {
            console.error('Background cache update failed:', error);
        } finally {
            this.cacheInitialized = false;
        }
    }

    /**
     * Enrich prompts with category information
     */
    private async enrichPromptsWithCategories(prompts: PromptTemplate[]): Promise<PromptTemplate[]> {
        try {
            const categories = await this.getCategories();
            const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

            return prompts.map(prompt => ({
                ...prompt,
                category: categoryMap.get(prompt.category_id) || {
                    id: prompt.category_id,
                    name: 'Unknown',
                    display_name: 'Unknown',
                    icon: '📁'
                }
            }));
        } catch (error) {
            console.error('Error enriching prompts with categories:', error);
            // Return prompts with default category info
            return prompts.map(prompt => ({
                ...prompt,
                category: {
                    id: prompt.category_id,
                    name: 'Unknown',
                    display_name: 'Unknown',
                    icon: '📁'
                }
            }));
        }
    }
}
