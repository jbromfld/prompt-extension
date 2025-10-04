import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PromptTemplate, PromptCategory } from './DatabaseService';

export interface CacheMetadata {
    version: string;
    lastUpdated: string;
    categoriesCount: number;
    promptsCount: number;
    checksum: string;
}

export class LocalCacheService {
    private cacheDir: string;
    private categoriesFile: string;
    private promptsFile: string;
    private metadataFile: string;

    constructor() {
        // Create cache directory in user home
        this.cacheDir = path.join(os.homedir(), '.smart-copilot-assistant');
        this.categoriesFile = path.join(this.cacheDir, 'categories.json');
        this.promptsFile = path.join(this.cacheDir, 'prompts.json');
        this.metadataFile = path.join(this.cacheDir, 'metadata.json');

        this.ensureCacheDirectory();
    }

    private ensureCacheDirectory(): void {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * Save categories to local cache
     */
    async saveCategories(categories: PromptCategory[]): Promise<void> {
        try {
            const data = JSON.stringify(categories, null, 2);
            fs.writeFileSync(this.categoriesFile, data, 'utf8');
        } catch (error) {
            console.error('Failed to save categories to cache:', error);
            throw error;
        }
    }

    /**
     * Save prompts to local cache
     */
    async savePrompts(prompts: PromptTemplate[]): Promise<void> {
        try {
            const data = JSON.stringify(prompts, null, 2);
            fs.writeFileSync(this.promptsFile, data, 'utf8');
        } catch (error) {
            console.error('Failed to save prompts to cache:', error);
            throw error;
        }
    }

    /**
     * Load categories from local cache
     */
    async loadCategories(): Promise<PromptCategory[]> {
        try {
            if (!fs.existsSync(this.categoriesFile)) {
                return [];
            }

            const data = fs.readFileSync(this.categoriesFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load categories from cache:', error);
            return [];
        }
    }

    /**
     * Load prompts from local cache
     */
    async loadPrompts(): Promise<PromptTemplate[]> {
        try {
            if (!fs.existsSync(this.promptsFile)) {
                return [];
            }

            const data = fs.readFileSync(this.promptsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load prompts from cache:', error);
            return [];
        }
    }

    /**
     * Save cache metadata
     */
    async saveMetadata(metadata: CacheMetadata): Promise<void> {
        try {
            const data = JSON.stringify(metadata, null, 2);
            fs.writeFileSync(this.metadataFile, data, 'utf8');
        } catch (error) {
            console.error('Failed to save cache metadata:', error);
            throw error;
        }
    }

    /**
     * Load cache metadata
     */
    async loadMetadata(): Promise<CacheMetadata | null> {
        try {
            if (!fs.existsSync(this.metadataFile)) {
                return null;
            }

            const data = fs.readFileSync(this.metadataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load cache metadata:', error);
            return null;
        }
    }

    /**
     * Check if cache exists and is valid
     */
    async isCacheValid(): Promise<boolean> {
        try {
            const metadata = await this.loadMetadata();
            if (!metadata) {
                return false;
            }

            // Check if files exist
            const categoriesExist = fs.existsSync(this.categoriesFile);
            const promptsExist = fs.existsSync(this.promptsFile);

            return categoriesExist && promptsExist;
        } catch (error) {
            console.error('Failed to check cache validity:', error);
            return false;
        }
    }

    /**
     * Get cache age in hours
     */
    async getCacheAge(): Promise<number> {
        try {
            const metadata = await this.loadMetadata();
            if (!metadata) {
                return Infinity;
            }

            const lastUpdated = new Date(metadata.lastUpdated);
            const now = new Date();
            return (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60); // hours
        } catch (error) {
            console.error('Failed to get cache age:', error);
            return Infinity;
        }
    }

    /**
     * Clear all cached data
     */
    async clearCache(): Promise<void> {
        try {
            const files = [this.categoriesFile, this.promptsFile, this.metadataFile];

            for (const file of files) {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            }
        } catch (error) {
            console.error('Failed to clear cache:', error);
            throw error;
        }
    }

    /**
     * Get cache size in bytes
     */
    async getCacheSize(): Promise<number> {
        try {
            let totalSize = 0;
            const files = [this.categoriesFile, this.promptsFile, this.metadataFile];

            for (const file of files) {
                if (fs.existsSync(file)) {
                    const stats = fs.statSync(file);
                    totalSize += stats.size;
                }
            }

            return totalSize;
        } catch (error) {
            console.error('Failed to get cache size:', error);
            return 0;
        }
    }

    /**
     * Fast local search for autocomplete
     */
    async searchPromptsLocally(query: string, categoryId?: string | number): Promise<PromptTemplate[]> {
        try {
            const allPrompts = await this.loadPrompts();
            let filteredPrompts = allPrompts;

            // Filter by category if specified
            if (categoryId && categoryId !== '') {
                const categoryIdNum = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId;
                filteredPrompts = filteredPrompts.filter(prompt => prompt.category_id === categoryIdNum);
            }

            // Fast text search
            if (query && query.trim() !== '') {
                const searchTerm = query.toLowerCase();
                filteredPrompts = filteredPrompts.filter(prompt => {
                    const promptText = prompt.prompt.toLowerCase();

                    // Handle variables as either array or JSON string
                    let variables = '';
                    if (prompt.variables) {
                        if (Array.isArray(prompt.variables)) {
                            variables = prompt.variables.join(' ').toLowerCase();
                        } else if (typeof prompt.variables === 'string') {
                            try {
                                const parsed = JSON.parse(prompt.variables);
                                variables = Array.isArray(parsed) ? parsed.join(' ').toLowerCase() : '';
                            } catch (e) {
                                variables = prompt.variables.toLowerCase();
                            }
                        }
                    }

                    return promptText.includes(searchTerm) ||
                        variables.includes(searchTerm) ||
                        promptText.split(' ').some(word => word.startsWith(searchTerm));
                });
            }

            // Sort by relevance and usage count
            return filteredPrompts.sort((a, b) => {
                const aExact = a.prompt.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
                const bExact = b.prompt.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;

                if (aExact !== bExact) {
                    return bExact - aExact;
                }

                return (b.usage_count || 0) - (a.usage_count || 0);
            }).slice(0, 20); // Limit results
        } catch (error) {
            console.error('Failed to search prompts locally:', error);
            return [];
        }
    }

    /**
     * Generate checksum for cache validation
     */
    private generateChecksum(categories: PromptCategory[], prompts: PromptTemplate[]): string {
        const combined = JSON.stringify({ categories, prompts });
        // Simple checksum - in production, use crypto.createHash
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    /**
     * Update cache with new data
     */
    async updateCache(categories: PromptCategory[], prompts: PromptTemplate[]): Promise<void> {
        try {
            // Save data
            await this.saveCategories(categories);
            await this.savePrompts(prompts);

            // Save metadata
            const metadata: CacheMetadata = {
                version: '1.0.0',
                lastUpdated: new Date().toISOString(),
                categoriesCount: categories.length,
                promptsCount: prompts.length,
                checksum: this.generateChecksum(categories, prompts)
            };
            await this.saveMetadata(metadata);

            console.log(`Cache updated: ${categories.length} categories, ${prompts.length} prompts`);
        } catch (error) {
            console.error('Failed to update cache:', error);
            throw error;
        }
    }
}
