import { DatabaseService, TeamEvent } from './DatabaseService';
import { SmartCopilotService } from './SmartCopilotService';
import * as vscode from 'vscode';

export class TeamEventService {
    constructor(
        private databaseService: DatabaseService,
        private smartCopilotService: SmartCopilotService
    ) { }

    async getTeamEvents(teamId: string): Promise<TeamEvent[]> {
        try {
            // Try database
            try {
                return await this.databaseService.getTeamEvents(teamId);
            } catch (dbError) {
                console.log('Database not available, trying smart copilot service');
                return await this.smartCopilotService.getTeamEvents(teamId);
            }
        } catch (error) {
            console.error('Error getting team events:', error);
            return [];
        }
    }

    async getFailureEvents(teamId: string): Promise<TeamEvent[]> {
        const events = await this.getTeamEvents(teamId);
        return events.filter(event => event.result === 'failure');
    }

    async getEventContext(eventId: string): Promise<any> {
        try {
            return await this.databaseService.getEventContext(eventId);
        } catch (error) {
            console.error('Error getting event context:', error);
            return null;
        }
    }
}
