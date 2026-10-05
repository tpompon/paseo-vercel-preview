import type {
  PluginWorkspacePanelContribution,
  PluginWorkspacePanelProps,
} from "@getpaseo/plugin/client";
import { useEffect, useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import type { Preview } from "./types";

export type PreviewsStore = {
  previews: Map<string, readonly Preview[]>;
  pendingBrowserUrls: Map<string, string>;
  listeners: Set<() => void>;
  notify(): void;
};

export function createPreviewsPanel({
  id,
  store,
  openExternally,
}: {
  id: string;
  store: PreviewsStore;
  openExternally(url: string): Promise<void>;
}): PluginWorkspacePanelContribution {
  const subscribe = (listener: () => void) => {
    store.listeners.add(listener);
    return () => store.listeners.delete(listener);
  };

  function PreviewsPanel({ workspaceId, navigation, theme, layout }: PluginWorkspacePanelProps) {
    const previews = useSyncExternalStore(subscribe, () => store.previews.get(workspaceId));
    const pendingUrl = useSyncExternalStore(subscribe, () =>
      store.pendingBrowserUrls.get(workspaceId),
    );

    const openInPaseo = (url: string) => {
      if (navigation?.openBrowser) navigation.openBrowser({ url, workspaceId });
      else void openExternally(url);
    };

    useEffect(() => {
      if (!pendingUrl) return;
      store.pendingBrowserUrls.delete(workspaceId);
      openInPaseo(pendingUrl);
    }, [pendingUrl]);

    const colors = theme.colors;
    return (
      <View style={{ flex: 1, padding: layout.compact ? 12 : 16, gap: 8 }}>
        {(previews ?? []).length === 0 ? (
          <Text style={{ color: colors.foregroundMuted, fontSize: 13 }}>
            No Vercel previews for this pull request.
          </Text>
        ) : null}
        {(previews ?? []).map((preview) => {
          const url = preview.state === "success" ? preview.url : null;
          return (
            <View
              key={preview.project}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface1,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 13 }}>
                  {preview.project}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.foregroundMuted, fontSize: 12 }}>
                  {url ?? `Deployment ${preview.state}`}
                </Text>
              </View>
              {url ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${preview.project} in the Paseo browser`}
                    onPress={() => openInPaseo(url)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: pressed ? colors.surface2 : "transparent",
                    })}
                  >
                    <Text style={{ color: colors.foreground, fontSize: 12 }}>Open</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${preview.project} in your browser`}
                    onPress={() => void openExternally(url)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: pressed ? colors.surface2 : "transparent",
                    })}
                  >
                    <Text style={{ color: colors.foregroundMuted, fontSize: 12 }}>External</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }

  return {
    id,
    title: "Vercel previews",
    icon: "Triangle",
    context: "workspace",
    locations: ["explorer", "workspace"],
    Component: PreviewsPanel,
  };
}
