# Codex Clone

A lightweight, dependency-free Codex-style prototype that runs directly in the browser.

## What it includes

- Split layout with a planning sidebar, conversation thread, terminal panel, and activity feed
- Interactive prompt composer with built-in `/plan` and `/fix` demo commands
- Mock agent loop that updates chat, terminal output, counters, and session activity
- Responsive UI with a more intentional visual style than a default dashboard

## Run it

Open [index.html](/Users/dantecualesjr/Documents/Projects/Projects_2026/codex-clone/index.html) in a browser.

If you want a tiny local server instead:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Next steps for a real clone

- Connect the composer to an actual LLM backend or API route
- Replace the mock terminal stream with real command execution
- Persist threads, plans, and workspace metadata
- Add authentication, file access controls, and tool permissions
# codex-clone
