import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { RpcInput } from "@getpaseo/plugin";
import type { openInProfileRpc } from "../shared/previews";

const run = promisify(execFile);

const BROWSERS = [
  { app: "Google Chrome", label: "Chrome", dataDir: "Google/Chrome" },
  { app: "Brave Browser", label: "Brave", dataDir: "BraveSoftware/Brave-Browser" },
  { app: "Microsoft Edge", label: "Edge", dataDir: "Microsoft Edge" },
] as const;

type LocalState = {
  profile?: { info_cache?: Record<string, { name?: string; user_name?: string }> };
};

export async function listBrowserProfiles() {
  if (platform() !== "darwin") return [];
  const perBrowser = await Promise.all(
    BROWSERS.map(async (browser) => {
      const path = join(homedir(), "Library/Application Support", browser.dataDir, "Local State");
      const state = (await readFile(path, "utf8")
        .then((text) => JSON.parse(text) as LocalState)
        .catch(() => null)) ?? { profile: {} };
      return Object.entries(state.profile?.info_cache ?? {})
        .map(([directory, info]) => {
          const name = info.name ?? directory;
          return {
            id: `${browser.app}:${directory}`,
            name: `${browser.label} · ${info.user_name ? `${name} (${info.user_name})` : name}`,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }),
  );
  return perBrowser.flat();
}

export async function openInProfile({ target, url }: RpcInput<typeof openInProfileRpc>) {
  const separator = target.indexOf(":");
  const app = target.slice(0, separator);
  const directory = target.slice(separator + 1);
  if (!BROWSERS.some((browser) => browser.app === app)) throw new Error(`Unknown browser: ${app}`);
  await run("open", ["-na", app, "--args", `--profile-directory=${directory}`, url]);
  return {};
}
