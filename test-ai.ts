async function testOpenRouter() {
  const payload = { test: 123 };
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log("No built-in env var, testing generically.");
    return;
  }
  
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an assistant." },
        {
          role: "user",
          content: `Return JSON only.\n${JSON.stringify(payload)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error(`OpenRouter request failed with ${response.status}`, await response.text());
  } else {
    const data = await response.json();
    console.log(data);
  }
}

testOpenRouter().catch(console.error);
