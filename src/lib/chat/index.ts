import type { ChatRequest, ModelResponse } from 'ollama/browser';
import { get } from 'svelte/store';

import { sessionsStore, settingsStore } from '$lib/localStorage';

import { OllamaStrategy } from './ollama';
import { OpenAIStrategy } from './openai';

export interface Model extends ModelResponse {
	api: 'ollama' | 'openai';
}

export interface ChatStrategy {
	chat(payload: any, abortSignal: AbortSignal, onChunk: (content: string) => void): Promise<void>;

	getModels(): Promise<any>;

	isServerConnected(): boolean;

	pull?(payload: any, onChunk: (progress: any) => void): Promise<void>;
}

function getChatStrategy(model: Model): ChatStrategy {
	if (model.api === 'ollama') return new OllamaStrategy();
	else if (model.api === 'openai') return new OpenAIStrategy();

	throw new Error('Invalid model specified');
}

interface ChatParams {
	model: Model;
	payload: ChatRequest;
	abortSignal: AbortSignal;
	onChunk: (content: string) => void;
}

export async function chat({ model, payload, abortSignal, onChunk }: ChatParams): Promise<void> {
	const strategy = getChatStrategy(model);
	return strategy.chat(payload, abortSignal, onChunk);
}

export async function listModels(): Promise<Model[]> {
	const ollamaModels = (await new OllamaStrategy().getModels()).models;
	const openaiModels = (await new OpenAIStrategy().getModels()).models;

	return [...ollamaModels, ...openaiModels];
}

export function isServerConnected(selectedModel: string): boolean {
	const model: Model | undefined = get(settingsStore).models.find((m) => m.name === selectedModel);
	if (!model) return false;

	const strategy = getChatStrategy(model);
	return strategy.isServerConnected();
}

export const getLastUsedModels = (): Model[] => {
	const currentSessions = get(sessionsStore);
	const models = get(settingsStore)?.models;
	if (!models) return [];

	const lastUsedModels: Model[] = [];

	for (const session of currentSessions) {
		if (lastUsedModels.find((m) => m.name === session.model)) continue;

		const model = models.find((model) => model.name === session.model);
		if (!model) continue;
		lastUsedModels.push(model);

		if (lastUsedModels.length >= 5) break;
	}

	return lastUsedModels;
};