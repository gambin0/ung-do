# Voice input (backlog)

Status: **not started**, under consideration (noted 2026-11-05).

Goal: speak to add to-dos and update inventory, e.g. "used the last of the milk
and add bread to my list" → set Milk to 0 (which triggers "Restock Milk") and
add the to-do "Buy bread". Personal hobby tool, so running cost should stay
near zero.

## 1. Speech → text (free)

| Platform | Approach |
| --- | --- |
| Android (Capacitor) | The WebView lacks the Web Speech API. Use the free `@capacitor-community/speech-recognition` plugin (Android's built-in recognizer). |
| Web | Built-in `SpeechRecognition` in Chrome/Edge (free; audio is processed by Google). Not supported in Firefox. |
| Zero-effort today | The phone keyboard's mic key (e.g. Gboard) already dictates into the add-todo field; it just can't update inventory. |

UI: a mic button with live transcript, `aria-pressed` while listening.

## 2. Text → actions (the real decision)

### Option A — rule-based parser ($0)
Fixed phrasings: "add …", "remind me to … tomorrow at 5", "used 2 eggs",
"bought 6 eggs", "out of coffee", "set X to N". Fuzzy-match item names; a date
parsing library for times. Free, offline, instant — but brittle with natural
phrasing.

### Option B — Claude parses the transcript (pennies)
Send the transcript plus current inventory item names; get back a structured
list of actions. Handles natural, multi-part sentences and fuzzy names.

- **API key must not ship in the app** → needs a small backend:
  - Firebase Cloud Function (requires the pay-as-you-go Blaze plan; free tier
    covers this usage), or
  - Cloudflare Worker (free plan, no card).
- The function must verify the Firebase ID token **and** the owner UID so no
  one else can spend the API credits. Also set a monthly spend limit in the
  Anthropic Console.
- Rough cost (~1,000 input / ~300 output tokens per command, ~600
  commands/month; estimates, not measured):

  | Model | Per command | Per month |
  | --- | --- | --- |
  | Claude Opus 5.5 (`claude-opus-5-5`) | ~$0.01 | ~$6 |
  | Claude Haiku 5.5 (`claude-haiku-5-5`) | ~$0.0003 | ~$0.15 |

  Re-check pricing before building; model choice is an open decision.

## Recommended shape (if/when built)

1. Mic button → transcript (plugin on Android, Web Speech API on web).
2. Transcript → actions (Option A or B).
3. **Preview and confirm** before applying, since recognition makes mistakes:
   > Add to-do: Buy bread
   > Milk: 1 → 0 (will add "Restock Milk")
   > [Confirm] [Edit] [Cancel]
4. Apply through the existing `TodoService` / `InventoryService` so the
   restock logic is reused unchanged.

Estimated size: ~300–500 lines plus tests.

## Privacy

Audio goes to Google's speech service; with Option B, transcripts and item
names go to Anthropic.

## Open decisions

- Option A vs. B (and, for B, which model).
- Backend host for B: Firebase Functions vs. Cloudflare Worker.
