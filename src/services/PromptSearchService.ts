import { SmartCopilotService, PromptApiItem } from './SmartCopilotService';

export interface PromptCategory {
  id: number;
  name: string;
  display_name: string;
}

export interface PromptTemplate {
  id: string;
  category_id: number;
  category?: PromptCategory;
  prompt: string;
  title?: string;
  description?: string;
  variables?: string[];
  usage_count?: number;
  score?: number;
}

export class PromptSearchService {
  constructor(private readonly promptService: SmartCopilotService) {}

  async getCategories(): Promise<PromptCategory[]> {
    try {
      const categories = await this.promptService.getCategories();
      return categories.map((name, index) => ({
        id: index + 1,
        name,
        display_name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')
      }));
    } catch (error) {
      console.error('Failed to load categories:', error);
      return [];
    }
  }

  async searchPrompts(query: string, categoryId?: number): Promise<PromptTemplate[]> {
    try {
      const categories = await this.getCategories();
      const selectedCategory = categoryId ? categories.find((c) => c.id === categoryId) : undefined;

      const prompts = query.trim().length > 0
        ? await this.promptService.searchPrompts(query, 20, selectedCategory?.name)
        : await this.promptService.getPopularPrompts(20, selectedCategory?.name);

      return prompts.map((prompt) => this.toPromptTemplate(prompt, categories));
    } catch (error) {
      console.error('Failed to search prompts:', error);
      return [];
    }
  }

  async usePrompt(promptId: string): Promise<void> {
    try {
      await this.promptService.usePrompt(promptId);
    } catch (error) {
      console.error('Failed to track prompt usage:', error);
    }
  }

  async ratePrompt(promptId: string, rating: number): Promise<void> {
    await this.promptService.ratePrompt(promptId, rating);
  }

  private toPromptTemplate(item: PromptApiItem, categories: PromptCategory[]): PromptTemplate {
    const category = categories.find((c) => c.name === item.category);
    return {
      id: item.id,
      category_id: category?.id ?? 0,
      category,
      prompt: item.body,
      title: item.title,
      description: item.body,
      usage_count: item.usage_count,
      score: item.final_score
    };
  }
}
