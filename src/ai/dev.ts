import { config } from 'dotenv';
config();

import '@/ai/flows/categorize-brain-dump.ts';
import '@/ai/flows/transform-to-chatgpt-prompt.ts';
import '@/ai/flows/group-thoughts-into-categories.ts';
import '@/ai/flows/categorize-audio-note.ts';
