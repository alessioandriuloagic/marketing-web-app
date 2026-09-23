import { useCallback, useEffect, useState } from "react";
import {
  ensureSignedInWithFabric,
  initEmbeddedAuth,
} from "@microsoft/rayfin-auth-provider-fabric";
import { client } from "./rayfinClient";
import { fabricAuthOptions } from "./fabricAuthOptions";

interface FabricAuthState {
  isAuthenticated: boolean;
  userId: string | null;
  userEmail: string | null;
}

const initialState: FabricAuthState = {
  isAuthenticated: false,
  userId: null,
  userEmail: null,
};

export function useFabricAuth() {
  const [state, setState] = useState<FabricAuthState>(initialState);

  useEffect(() => {
    // Safe to call on page load: no-ops outside a Fabric portal iframe.
    initEmbeddedAuth(client.auth, fabricAuthOptions).catch(() => {
      // Not embedded in the Fabric portal; the user signs in via the button below.
    });

    const unsubscribe = client.auth.onSessionChange((session) => {
      setState({
        isAuthenticated: Boolean(session?.isAuthenticated),
        userId: session?.user?.id ?? null,
        userEmail: session?.user?.email ?? null,
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async () => {
    await ensureSignedInWithFabric(client.auth, fabricAuthOptions);
  }, []);

  const signOut = useCallback(async () => {
    await client.auth.signOut();
    setState(initialState);
  }, []);

  return { ...state, signIn, signOut };
}
