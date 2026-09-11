# RadASO Telegram Bot (Cloudflare Workers)

Telegram bot that answers ASO / App Store Optimization / Apple Search Ads
questions using the Claude API. Runs entirely on Cloudflare Workers (no server
to manage).

## Deploy

Run these on your own machine, in this folder (`aso_bot_cf`), with Claude
Code or a plain terminal:

```bash
npm install -g wrangler
wrangler login

# secrets (never commit real values — you'll be prompted to paste each one)
wrangler secret put TELEGRAM_BOT_TOKEN     # token from @BotFather
wrangler secret put ANTHROPIC_API_KEY      # from https://console.anthropic.com
wrangler secret put WEBHOOK_SECRET         # any random string you make up

wrangler deploy
```

`wrangler deploy` prints your Worker URL, e.g. `https://aso-bot.<you>.workers.dev`.

## Point Telegram at the Worker

Register the webhook (replace the placeholders):

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://aso-bot.<you>.workers.dev/webhook" \
  -d "secret_token=<WEBHOOK_SECRET>"
```

Use the same values you set with `wrangler secret put`. Then message your bot
on Telegram — `/start` shows the intro, any other text goes to Claude with an
ASO-focused system prompt.

## Local dev

```bash
wrangler dev
```

## Bot profile (BotFather)

Message **@BotFather** in Telegram and run these against your bot to set its
avatar and description:

- `/setuserpic` → select the bot → upload `avatar.png` from this folder
- `/setabouttext` → select the bot → paste:
  ```
  RadASO Bot 🚀 — ШІ-асистент з ASO, Apple Search Ads та маркетингу застосунків
  ```
- `/setdescription` → select the bot → paste:
  ```
  RadASO Bot — асистент на базі Claude для App Store Optimization.

  Допомагає:
  • підбирати ключові слова й метадані (title, subtitle, keywords)
  • покращувати іконку, скріншоти й відео для App Store / Google Play
  • планувати Apple Search Ads: структура кампаній, ставки, звіти
  • аналізувати конкурентів і тренди ASO-ринку
  • перетворювати дослідження на готовий контент (пости, брифи)

  Просто напиши питання — відповість конкретно й по суті.
  ```

## Files

- `src/index.js` — Worker: Telegram webhook handler + Claude API call
- `wrangler.toml` — Worker config (secrets are NOT stored here)
- `avatar.png` — bot profile picture (512×512)
