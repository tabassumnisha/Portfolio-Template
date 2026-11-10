# AGENTS.md

Guidance for AI coding agents (Codex, Cursor, Copilot, Claude Code and others) working on this repository.

The full guide is in [CLAUDE.md](CLAUDE.md). Read it first: it has the folder map, the rules that must not be broken and the commands.
For how the parts fit together see [docs/architecture.md](docs/architecture.md); for the API see [docs/api-reference.md](docs/api-reference.md).

Short version:
- Python standard library only on the server, plain HTML/CSS/JS in the browser. No pip or npm packages, no build step.
- Every route that changes data must call `require_admin()`. SQL uses bound parameters only. Never use `innerHTML` with data.
- Never commit real credentials. Placeholders only.
- Run `python3 -m unittest discover -s tests -v` before every change is finished, and update `CHANGELOG.md`.
