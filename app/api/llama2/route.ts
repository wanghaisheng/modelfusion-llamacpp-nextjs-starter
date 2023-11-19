import { Message, StreamingTextResponse, readableFromAsyncIterable } from "ai";
import {
  ChatMessage,
  Llama2PromptFormat,
  LlamaCppTextGenerationModel,
  streamText,
  trimChatPrompt,
} from "modelfusion";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages }: { messages: Message[] } = await req.json();

  const model = new LlamaCppTextGenerationModel({
    temperature: 0,
    contextWindowSize: 4096, // Llama 2 context window size
    maxCompletionTokens: 512, // Room for answer
  })
    .withTextPrompt() // only text, no images
    .withPromptFormat(Llama2PromptFormat.chat());

  // Use ModelFusion to call llama.cpp:
  const textStream = await streamText(
    model,
    // reduce chat prompt length to fit the context window:
    await trimChatPrompt({
      model,
      prompt: {
        system:
          "You are an AI chat bot. " +
          "Follow the user's instructions carefully.",

        // map Vercel AI SDK Message to ModelFusion ChatMessage:
        messages: messages.filter(
          // only user and assistant roles are supported:
          (message) => message.role === "user" || message.role === "assistant"
        ) as ChatMessage[],
      },
    })
  );

  // Return the result using the Vercel AI SDK:
  return new StreamingTextResponse(readableFromAsyncIterable(textStream));
}