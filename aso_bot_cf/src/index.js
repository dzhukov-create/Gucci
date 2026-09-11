const SYSTEM_PROMPT = `You are RadASO Bot, an expert assistant on App Store Optimization (ASO),
Apple Search Ads, Google Play growth, and mobile app marketing. You help the user with:
- keyword research and metadata (title, subtitle, keyword field, description)
- creative optimization (icons, screenshots, preview videos) and A/B testing ideas
- Apple Search Ads / Apple Ads campaign structure, bidding, and reporting
- competitor analysis and market trends in the ASO space
- turning research into ready-to-use content (posts, briefs, summaries)

Answer in the language the user writes in. Be concise, concrete, and give actionable
recommendations with examples. When you don't have live data, say so plainly instead
of inventing numbers.`;

async function callClaude(env, userText) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Claude API error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  return data.content?.[0]?.text ?? "Не вдалося отримати відповідь від Claude.";
}

async function sendTelegramMessage(env, chatId, text) {
  const MAX_LEN = 4000;
  const chunks = [];
  for (let i = 0; i < text.length; i += MAX_LEN) {
    chunks.push(text.slice(i, i + MAX_LEN));
  }

  for (const chunk of chunks) {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: "Markdown",
      }),
    });
  }
}

async function handleUpdate(env, update) {
  const message = update.message ?? update.edited_message;
  if (!message || !message.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();

  if (text === "/start" || text === "/help") {
    await sendTelegramMessage(
      env,
      chatId,
      "Привіт! Я *RadASO Bot* 🚀\n\n" +
        "ШІ-асистент з App Store Optimization на базі Claude. Допомагаю:\n" +
        "• підбирати ключові слова й метадані (title, subtitle, keywords)\n" +
        "• покращувати іконку, скріншоти й відео для App Store / Google Play\n" +
        "• планувати Apple Search Ads: структура кампаній, ставки, звіти\n" +
        "• аналізувати конкурентів і тренди ASO-ринку\n" +
        "• перетворювати дослідження на готовий контент (пости, брифи)\n\n" +
        "Просто напиши питання — відповім конкретно і по суті.\n\n" +
        "Приклади:\n" +
        "• Як підібрати ключові слова для фітнес-застосунку?\n" +
        "• Що краще протестувати в скріншотах?\n" +
        "• Порівняй стратегії Apple Search Ads для нової гри."
    );
    return;
  }

  try {
    const reply = await callClaude(env, text);
    await sendTelegramMessage(env, chatId, reply);
  } catch (err) {
    await sendTelegramMessage(
      env,
      chatId,
      "Сталася помилка при зверненні до Claude. Спробуй ще раз трохи пізніше."
    );
    console.error(err);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response("aso-bot is running", { status: 200 });
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
      if (env.WEBHOOK_SECRET && secretHeader !== env.WEBHOOK_SECRET) {
        return new Response("Forbidden", { status: 403 });
      }

      const update = await request.json();
      // Reply to Telegram immediately; let the Claude call + sendMessage run
      // in the background so Telegram doesn't retry the webhook on timeout.
      ctx.waitUntil(handleUpdate(env, update));
      return new Response("OK", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  },
};
