# Vercel Preview for Paseo

Adds a **Preview** button to the workspace header when the workspace branch has a GitHub pull request with Vercel preview deployments.

- One entry per Vercel project deployed for the pull request's latest commit.
- Disabled "building" state while deployments are in progress; hidden when there are none.
- **Open in** picker in the same dropdown: system browser (default), the Paseo browser (desktop app), or a specific Chrome, Brave or Edge profile (macOS).
- A **Vercel previews** panel listing every preview, with Paseo-browser and external links.

## Requirements

- Paseo `>=0.10.3` with plugins enabled (`"pluginsEnabled": true` in `~/.paseo/config.json`).
- [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`) on the daemon host.
- The repository uses Vercel's GitHub integration, which records preview deployments on GitHub.

## Install

```bash
paseo plugin install npm:paseo-plugin-vercel-preview
```

Or from GitHub:

```bash
paseo plugin install github:tpompon/paseo-vercel-preview
```

## How it works

The daemon resolves the pull request head commit with `gh api`, lists the GitHub deployments created by `vercel[bot]` for that commit, and reads the latest status of each to get the preview URL. It refreshes whenever Paseo updates the pull request checks.

## Limitations

- Paseo plugins cannot render split buttons, so the preview links and the **Open in** picker share one dropdown.
- Browser profile targets are macOS-only and support Chrome, Brave and Edge.
- Browser profiles open on the daemon host, so pick them only when the daemon runs on the machine you are using.
- The Paseo browser target requires the desktop app.
- Only Vercel deployments recorded through Vercel's GitHub integration are detected.
