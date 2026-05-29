import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { OnlineConnectionStatus, PublicMoveRealtimePayload } from "../types";

export interface SubscribeToGameEventsOptions {
  readonly realtimeTopic: string;
  readonly getCurrentVersion: () => number;
  readonly onStatus: (status: OnlineConnectionStatus) => void;
  readonly fetchLatest: () => Promise<void>;
}

export interface RealtimeSubscription {
  readonly unsubscribe: () => void;
}

let cachedClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedClient;
}

export function subscribeToGameEvents(options: SubscribeToGameEventsOptions): RealtimeSubscription {
  const client = getBrowserSupabaseClient();

  if (!client) {
    options.onStatus("stale");
    return { unsubscribe: () => {} };
  }

  const channel = client
    .channel(`duel-public-moves:${options.realtimeTopic}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "duel_public_invalidations",
        filter: `realtime_topic=eq.${options.realtimeTopic}`,
      },
      (payload) => {
        const event = movePayloadFromRealtime(payload.new);
        if (!event || !shouldFetchAfterRealtimeEvent(options.getCurrentVersion(), event)) {
          return;
        }

        options.onStatus("stale");
        void options.fetchLatest().then(
          () => options.onStatus("connected"),
          () => options.onStatus("reconnecting"),
        );
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        options.onStatus("connected");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        options.onStatus("reconnecting");
      }
    });

  return {
    unsubscribe: () => {
      void removeChannel(client, channel);
    },
  };
}

export function shouldFetchAfterRealtimeEvent(
  currentVersion: number,
  payload: Pick<PublicMoveRealtimePayload, "version">,
): boolean {
  return payload.version > currentVersion;
}

export function shouldApplyFetchedView(
  currentVersion: number,
  payload: Pick<PublicMoveRealtimePayload, "version">,
): boolean {
  return payload.version > currentVersion;
}

export async function handleVisibilityReconnect(fetchLatest: () => Promise<void>): Promise<void> {
  if (document.visibilityState === "visible") {
    await fetchLatest();
  }
}

function movePayloadFromRealtime(value: Record<string, unknown>): PublicMoveRealtimePayload | null {
  const version = Number(value.version);

  if (
    !value.realtime_topic ||
    !Number.isInteger(version) ||
    (value.actor_role != null && value.actor_role !== "P1" && value.actor_role !== "P2")
  ) {
    return null;
  }

  return {
    realtimeTopic: String(value.realtime_topic),
    version,
    actorRole: value.actor_role === "P1" || value.actor_role === "P2" ? value.actor_role : null,
    publicSummary: String(value.public_summary ?? "Game state updated."),
    createdAt: String(value.created_at ?? ""),
  };
}

async function removeChannel(client: SupabaseClient, channel: RealtimeChannel): Promise<void> {
  await client.removeChannel(channel);
}
