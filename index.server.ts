import type { PluginServerContext } from "@getpaseo/plugin/server";
import { listBrowserProfiles, openInProfile } from "./server/browsers";
import { listPreviews } from "./server/previews";
import {
  openInProfileRpc,
  openSettings,
  previewsRpc,
  SYSTEM_TARGET,
  targetsRpc,
} from "./shared/previews";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(openSettings);
  server.handle(previewsRpc, listPreviews);
  server.handle(targetsRpc, async () => {
    const state = await settings.read();
    return {
      selected: state.status === "ready" ? state.values.target : SYSTEM_TARGET,
      browserProfiles: await listBrowserProfiles(),
    };
  });
  server.handle(openInProfileRpc, openInProfile);
  return () => {};
}
