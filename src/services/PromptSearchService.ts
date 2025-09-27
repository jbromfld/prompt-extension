import { DatabaseService, PromptTemplate, PromptCategory } from './DatabaseService';
import { SampleDataService } from './SampleDataService';
import { LocalCacheService } from './LocalCacheService';
import { SmartCopilotService } from './SmartCopilotService';
import * as vscode from 'vscode';

export class PromptSearchService {
    private localCache: LocalCacheService;
    private cacheInitialized: boolean = false;

    constructor(
        private databaseService: DatabaseService,
        private smartCopilotService: SmartCopilotService
    ) {
        this.localCache = new LocalCacheService();
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
                const categories = await this.smartCopilotService.getCategories();
                // Update local cache in background
                this.updateLocalCacheInBackground();
                return categories;
            } catch (apiError) {
                console.log('API service not available, using sample data');
                // Fallback to sample data
                const sampleCategories = SampleDataService.getCategories();
                // Cache sample data for future use
                this.localCache.updateCache(sampleCategories, SampleDataService.getAllPrompts()).catch(console.error);
                return sampleCategories;
            }
        } catch (error) {
            console.error('Error getting categories:', error);
            // Fallback to sample data
            return SampleDataService.getCategories();
        }
    }

    async searchPrompts(query: string, categoryId?: string): Promise<PromptTemplate[]> {
        try {
            // Try local cache first for instant autocomplete
            if (await this.localCache.isCacheValid()) {
                const localResults = await this.localCache.searchPromptsLocally(query, categoryId);
                if (localResults.length > 0) {
                    console.log(`Found ${localResults.length} prompts from local cache`);
                    return localResults;
                }
            }

            // Try API service for fresh results
            try {
                const results = await this.smartCopilotService.searchPrompts(query, categoryId);
                // Update local cache in background
                this.updateLocalCacheInBackground();
                return results;
            } catch (apiError) {
                console.log('API service not available, using sample data');
                // Fallback to sample data
                return SampleDataService.searchPrompts(query, categoryId);
            }
        } catch (error) {
            console.error('Error searching prompts:', error);
            // Fallback to sample data
            return SampleDataService.searchPrompts(query, categoryId);
        }
    }

    async getPromptsByCategory(categoryId: string): Promise<PromptTemplate[]> {
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
                console.log('Database not available, using sample data');
                // Fallback to sample data
                return SampleDataService.getPromptsByCategory(categoryId);
            }
        } catch (error) {
            console.error('Error getting prompts by category:', error);
            // Fallback to sample data
            return SampleDataService.getPromptsByCategory(categoryId);
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

    /**
     * Manually update local cache from database
     */
    async updateCache(): Promise<void> {
        try {
            console.log('Updating local cache...');

            // Try API service first
            try {
                const categories = await this.smartCopilotService.getCategories();
                const allPrompts: PromptTemplate[] = [];

                // Get prompts for each category
                for (const category of categories) {
                    const prompts = await this.smartCopilotService.searchPrompts('', category.id, 100);
                    allPrompts.push(...prompts);
                }

                // Update local cache
                await this.localCache.updateCache(categories, allPrompts);

                console.log(`Cache updated: ${categories.length} categories, ${allPrompts.length} prompts`);
            } catch (apiError) {
                console.log('API service not available, using sample data for cache');
                const sampleCategories = SampleDataService.getCategories();
                const samplePrompts = SampleDataService.getAllPrompts();
                await this.localCache.updateCache(sampleCategories, samplePrompts);
                console.log(`Cache updated with sample data: ${sampleCategories.length} categories, ${samplePrompts.length} prompts`);
            }
        } catch (error) {
            console.error('Failed to update cache:', error);
            // Fallback to sample data
            const sampleCategories = SampleDataService.getCategories();
            const samplePrompts = SampleDataService.getAllPrompts();
            await this.localCache.updateCache(sampleCategories, samplePrompts);
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
}
