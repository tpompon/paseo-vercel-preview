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
paseo plugin install <git-url-or-npm-package>
```

## How it works

The daemon resolves the pull request head commit with `gh api`, lists the GitHub deployments created by `vercel[bot]` for that commit, and reads the latest status of each to get the preview URL. It refreshes whenever Paseo updates the pull request checks.

Browser profiles are opened on the daemon host, so pick them only when the daemon runs on the machine you are using.
