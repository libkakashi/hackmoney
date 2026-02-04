import {streamText, convertToModelMessages, stepCountIs} from 'ai';
import {anthropic} from '@ai-sdk/anthropic';
import {buildSystemPrompt} from '~/lib/agent/system-prompt';
import {allTools} from '~/lib/agent/tools';

const model = anthropic('claude-sonnet-4-5');

export async function POST(req: Request) {
  const {messages, pageContext} = await req.json();
  const modelMessages = await convertToModelMessages(messages);
  const system = await buildSystemPrompt(pageContext);

  const result = streamText({
    model,
    system,
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
