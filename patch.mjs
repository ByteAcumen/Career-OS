import fs from 'fs';

let typesContent = fs.readFileSync('src/lib/types.ts', 'utf-8');
typesContent = typesContent.replace(
  'export type AiProvider = "openai" | "gemini" | "openrouter";',
  'export type AiProvider = "openai" | "gemini" | "openrouter" | "groq";'
);
typesContent = typesContent.replace(
  /providers: {\n\s+openai: boolean;\n\s+gemini: boolean;\n\s+openrouter: boolean;\n\s+};/,
  'providers: { openai: boolean; gemini: boolean; openrouter: boolean; groq: boolean; };'
);
typesContent = typesContent.replace(
  /providerSources: {\n\s+openai: AiProviderSource;\n\s+gemini: AiProviderSource;\n\s+openrouter: AiProviderSource;\n\s+};/,
  'providerSources: { openai: AiProviderSource; gemini: AiProviderSource; openrouter: AiProviderSource; groq: AiProviderSource; };'
);
typesContent = typesContent.replace(
  /savedApiKeys: {\n\s+openai: boolean;\n\s+gemini: boolean;\n\s+openrouter: boolean;\n\s+};/,
  'savedApiKeys: { openai: boolean; gemini: boolean; openrouter: boolean; groq: boolean; };'
);

fs.writeFileSync('src/lib/types.ts', typesContent);

let aiContent = fs.readFileSync('src/lib/ai.ts', 'utf-8');

aiContent = aiContent.replace(
  'const DEFAULT_OPENROUTER_MODEL = "openrouter/auto";',
  `const DEFAULT_OPENROUTER_MODEL = "openrouter/auto";\nconst DEFAULT_GROQ_MODEL = "llama-3.1-70b-versatile";`
);

aiContent = aiContent.replace(
  'const PROVIDER_ORDER: AiProvider[] = ["gemini", "openai", "openrouter"];',
  'const PROVIDER_ORDER: AiProvider[] = ["gemini", "openai", "groq", "openrouter"];'
);

// stream provider logic
aiContent = aiContent.replace(
  `      if (provider === "openai") {
        clearProviderCooldown(userId, provider);
        return {
          stream: await streamOpenAI(apiKey, model, systemMessage, boundedMessages),
          provider,
          model,
        };
      }`,
  `      if (provider === "openai") {
        clearProviderCooldown(userId, provider);
        return {
          stream: await streamOpenAI(apiKey, model, systemMessage, boundedMessages),
          provider,
          model,
        };
      }

      if (provider === "groq") {
        clearProviderCooldown(userId, provider);
        return {
          stream: await streamGroq(apiKey, model, systemMessage, boundedMessages),
          provider,
          model,
        };
      }`
);

// dispatch provider logic
aiContent = aiContent.replace(
  `  if (provider === "gemini") {
    return generateWithGemini(payload, model, systemPrompt, jsonPrompt, schema, apiKey);
  }
  return generateWithOpenRouter(payload, model, systemPrompt, jsonPrompt, schema, apiKey);`,
  `  if (provider === "gemini") {
    return generateWithGemini(payload, model, systemPrompt, jsonPrompt, schema, apiKey);
  }
  if (provider === "groq") {
    return generateWithGroq(payload, model, systemPrompt, jsonPrompt, schema, apiKey);
  }
  return generateWithOpenRouter(payload, model, systemPrompt, jsonPrompt, schema, apiKey);`
);

// resolve model
aiContent = aiContent.replace(
  `function resolveProviderModel(provider: AiProvider, configuredModel: string) {`,
  `function resolveProviderModel(provider: AiProvider, configuredModel: string) {\n  if (provider === "groq") return configuredModel || DEFAULT_GROQ_MODEL;`
);


// append Groq implementations
aiContent += `

async function generateWithGroq<T extends z.ZodTypeAny>(
  payload: unknown,
  model: string,
  systemPrompt: string,
  jsonPrompt: string,
  schema: T,
  apiKey: string,
): Promise<z.infer<T>> {
  try {
    const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: \`\${jsonPrompt}\\n\${stableJsonStringify(payload)}\` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const text = response.choices[0]?.message?.content ?? "";
    try {
      return parseJsonWithSchema(text, schema);
    } catch {
      throw new AiError("PARSE_ERROR", "Groq", \`Failed to parse Groq response: \${text.slice(0, 200)}\`);
    }
  } catch (error) {
    throw normalizeProviderError(error, "Groq");
  }
}

async function streamGroq(
  apiKey: string,
  model: string,
  systemMessage: string,
  messages: ChatMessage[],
) {
  const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
  return client.chat.completions.create({
    model,
    messages: [{ role: "system", content: systemMessage }, ...messages],
    stream: true,
    temperature: 0.35,
    max_completion_tokens: CHAT_MAX_OUTPUT_TOKENS,
  });
}
`;

fs.writeFileSync('src/lib/ai.ts', aiContent);
