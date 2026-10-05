# BaseVulture (Nano-Frontend)

A static web frontend for chatting with a model running locally in
[LM Studio](https://lmstudio.ai), exposed over the internet through an
ngrok tunnel. Everything runs on your hardware — this page is just the UI.

**Live site:** https://ellernate121-afk.github.io/Nano-Frontend/

## Setup

### 1. LM Studio (on your machine)

1. Load a model in LM Studio.
2. Open the **Developer** tab and start the local server (default port `1234`).
3. Turn **Enable CORS** on — the browser can't call the server without it.

### 2. ngrok tunnel (on your machine)

Free ngrok accounts get one **static domain**, so your URL never changes:

1. Claim your free static domain at <https://dashboard.ngrok.com/domains>.
2. Run:

   ```bash
   ngrok http 1234 --url=YOUR-STATIC-DOMAIN
   ```

   (You can also save it permanently with `ngrok config add-domain YOUR-STATIC-DOMAIN`.)

If you skip `--url`, you get a random URL that changes on every restart —
that's the "URL rotates" problem. Use the static domain and it just works.

### 3. In the web app

1. Open the **Connection** tab.
2. Paste your static domain URL, e.g. `https://xxx-yyy.ngrok-free.app`, and hit **Save**.
3. Click **Test Connection** — it should report which model is loaded.
4. Go chat.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| "Could not reach server" | Tunnel not running, wrong URL, or CORS disabled in LM Studio |
| `404` on test | Tunnel is up but points at the wrong port — LM Studio server defaults to `1234` |
| `401` on test | Auth is enabled on the tunnel — set username/password in the Connection tab |
| Error 400 in chat | Usually a model-name mismatch — Test Connection re-detects the loaded model |
| Empty page / old version | Hard-refresh (Ctrl+Shift+R); GitHub Pages can lag a minute after push |

## Repo layout

- `index.html` — single-page UI
- `chat.js` — chat loop, calls LM Studio's OpenAI-compatible API
- `settings.js` — settings storage (localStorage) + connection testing
- `app.js` — tab navigation
- `.github/workflows/deploy.yml` — deploys to GitHub Pages on push to `main`
