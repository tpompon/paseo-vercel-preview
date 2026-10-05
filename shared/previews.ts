import { defineRpc, defineSettings, settingsRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const SYSTEM_TARGET = "system";
export const PASEO_TARGET = "paseo";

export const openSettings = defineSettings({
  id: "open",
  scope: "host",
  version: 1,
  schema: z.object({ target: z.string().default(SYSTEM_TARGET) }),
});

export const openSettingsRpc = settingsRpc(openSettings.id);

export const previewsRpc = defineRpc({
  name: "vercel.previews",
  input: z.object({ owner: z.string(), repo: z.string(), number: z.number() }),
  output: z.object({
    previews: z.array(
      z.object({ project: z.string(), state: z.string(), url: z.string().nullable() }),
    ),
  }),
});

export const targetsRpc = defineRpc({
  name: "vercel.targets",
  input: z.object({}),
  output: z.object({
    selected: z.string(),
    browserProfiles: z.array(z.object({ id: z.string(), name: z.string() })),
  }),
});

export const openInProfileRpc = defineRpc({
  name: "vercel.open-in-profile",
  input: z.object({ target: z.string(), url: z.url({ protocol: /^https$/ }) }),
  output: z.object({}),
});
