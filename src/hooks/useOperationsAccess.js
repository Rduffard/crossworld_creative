import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { requestJson } from "../utils/api";

export function useOperationsAccess() {
  const { loaded, token } = useAuth();
  const [checked, setChecked] = useState(null);

  useEffect(() => {
    if (!loaded || !token) return;
    const controller = new AbortController();

    // The deployed owner guard precedes the hosts handler. HEAD returns no records.
    requestJson("/operations/hosts", {
      auth: true, method: "HEAD", signal: controller.signal, cache: "no-store",
    }).then(
      () => { if (!controller.signal.aborted) setChecked({ token, allowed: true }); },
      () => { if (!controller.signal.aborted) setChecked({ token, allowed: false }); },
    );

    return () => controller.abort();
  }, [loaded, token]);

  return loaded && token && checked?.token === token ? checked.allowed : null;
}
