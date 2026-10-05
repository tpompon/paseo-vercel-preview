import type {
  PluginButton,
  PluginButtonIconProps,
  PluginButtonMenuEntry,
  PluginButtonRegistration,
  PluginClientContext,
} from "@getpaseo/plugin/client";
import { openExternalUrl } from "@getpaseo/plugin/client";
import { View } from "react-native";
import { createPreviewsPanel, type PreviewsStore } from "./client/panel";
import type { Preview } from "./client/types";
import {
  openInProfileRpc,
  openSettingsRpc,
  PASEO_TARGET,
  previewsRpc,
  SYSTEM_TARGET,
  targetsRpc,
} from "./shared/previews";

const PANEL_ID = "vercel-previews";

type Workspace = {
  id: string;
  githubRuntime?: {
    pullRequest?: {
      number?: number;
      repoOwner?: string;
      repoName?: string;
      checks?: readonly { name: string; status: string }[];
    } | null;
  } | null;
};

type Targets = { selected: string; browserProfiles: { id: string; name: string }[] };

function VercelIcon({ size, theme }: PluginButtonIconProps) {
  const width = Math.round(size * 0.875);
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: width / 2,
        borderRightWidth: width / 2,
        borderBottomWidth: width * 0.866,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: theme.colors.foreground,
      }}
    />
  );
}

function targetLabel(targets: Targets) {
  if (targets.selected === PASEO_TARGET) return "Paseo browser";
  return (
    targets.browserProfiles.find((profile) => profile.id === targets.selected)?.name ??
    "System browser"
  );
}

export default function contribute(client: PluginClientContext) {
  const buttons = new Map<
    string,
    { key: string; registration: PluginButtonRegistration; render?: () => void }
  >();
  const store: PreviewsStore = {
    previews: new Map(),
    pendingBrowserUrls: new Map(),
    listeners: new Set(),
    notify() {
      for (const listener of store.listeners) listener();
    },
  };
  let targets: Targets = { selected: SYSTEM_TARGET, browserProfiles: [] };
  let disposed = false;
  let releaseSubscription: (() => Promise<void>) | undefined;

  const renderAll = () => {
    for (const button of buttons.values()) button.render?.();
  };

  const open = (workspaceId: string, url: string) => {
    if (targets.selected === PASEO_TARGET) {
      store.pendingBrowserUrls.set(workspaceId, url);
      store.notify();
      client.openPanel(PANEL_ID, { workspaceId, location: "explorer" });
      return;
    }
    if (targets.browserProfiles.some((profile) => profile.id === targets.selected)) {
      void client.rpc(openInProfileRpc, { target: targets.selected, url });
      return;
    }
    void openExternalUrl(url);
  };

  const selectTarget = async (target: string) => {
    const current = await client.rpc(openSettingsRpc.read, {});
    const result = await client.rpc(openSettingsRpc.write, {
      revision: current.revision,
      values: { target },
    });
    if (result.status !== "saved") return;
    targets = { ...targets, selected: target };
    renderAll();
  };

  const toButton = (workspaceId: string, previews: readonly Preview[]): Partial<PluginButton> => {
    if (previews.length === 0) return { visible: false };
    const ready = previews.filter(
      (preview): preview is Preview & { url: string } =>
        preview.state === "success" && !!preview.url,
    );
    const previewItems: PluginButtonMenuEntry[] =
      ready.length > 0
        ? ready.map((preview, index) => ({
            kind: "item",
            id: `preview-${index}`,
            title: preview.project,
            behavior: { kind: "action", onPress: () => open(workspaceId, preview.url) },
          }))
        : [
            {
              kind: "item",
              id: "building",
              title: "Preview is building…",
              disabled: true,
              behavior: { kind: "action", onPress: () => {} },
            },
          ];
    const targetOptions = [
      { id: SYSTEM_TARGET, name: "System browser" },
      { id: PASEO_TARGET, name: "Paseo browser" },
      ...targets.browserProfiles,
    ];
    return {
      visible: true,
      disabled: false,
      title: ready.length > 0 ? "Open Vercel preview" : "Vercel preview is building",
      behavior: {
        kind: "menu",
        items: [
          ...previewItems,
          { kind: "separator", id: "target-separator" },
          {
            kind: "item",
            id: "target",
            title: `Open in: ${targetLabel(targets)}`,
            behavior: {
              kind: "menu",
              items: targetOptions.map((option, index) => ({
                kind: "item",
                id: `target-${index}`,
                title: option.id === targets.selected ? `✓ ${option.name}` : option.name,
                behavior: { kind: "action", onPress: () => selectTarget(option.id) },
              })),
            },
          },
        ],
      },
    };
  };

  const remove = (workspaceId: string) => {
    buttons.get(workspaceId)?.registration.remove();
    buttons.delete(workspaceId);
    store.previews.delete(workspaceId);
  };

  const sync = async (workspace: Workspace) => {
    const pr = workspace.githubRuntime?.pullRequest;
    if (!pr?.number || !pr.repoOwner || !pr.repoName) {
      remove(workspace.id);
      return;
    }
    const vercelChecks = (pr.checks ?? []).filter((check) => check.name.startsWith("Vercel"));
    const key = JSON.stringify([pr.number, vercelChecks]);
    const existing = buttons.get(workspace.id);
    if (existing?.key === key) return;
    const registration =
      existing?.registration ??
      client.addHeaderButton({
        id: "vercel-preview",
        workspaceId: workspace.id,
        button: {
          title: "Vercel preview",
          label: "Preview",
          icon: VercelIcon,
          visible: false,
          behavior: { kind: "action", onPress: () => {} },
        },
      });
    buttons.set(workspace.id, { key, registration });
    const result = await client
      .rpc(previewsRpc, { owner: pr.repoOwner, repo: pr.repoName, number: pr.number })
      .catch(() => null);
    if (buttons.get(workspace.id)?.key !== key) return;
    if (!result) {
      buttons.set(workspace.id, { key: "", registration });
      return;
    }
    store.previews.set(workspace.id, result.previews);
    store.notify();
    const render = () => registration.update(toButton(workspace.id, result.previews));
    buttons.set(workspace.id, { key, registration, render });
    render();
  };

  const removePanel = client.addWorkspacePanel(
    createPreviewsPanel({ id: PANEL_ID, store, openExternally: openExternalUrl }),
  );

  void client.rpc(targetsRpc, {}).then((result) => {
    targets = result;
    renderAll();
  });

  const unsubscribe = client.paseo.workspaces.subscribe((update) => {
    if (update.kind === "upsert") void sync(update.workspace);
    else remove(update.id);
  });

  void client.paseo.workspaces.list({ subscribe: {} }).then((result) => {
    releaseSubscription = () => result.subscription.release();
    if (disposed) {
      void releaseSubscription();
      return;
    }
    for (const workspace of result.entries) void sync(workspace);
  });

  return () => {
    disposed = true;
    unsubscribe();
    removePanel();
    void releaseSubscription?.();
    for (const id of [...buttons.keys()]) remove(id);
  };
}
