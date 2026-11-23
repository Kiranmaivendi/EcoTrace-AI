import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getErrorMessage } from "../api";
import { AuthContext } from "./context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/auth/me")
      .then(({ data }) => {
        if (active) {
          setUser(data.user);
          setError("");
        }
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.response?.status === 401) {
          setUser(null);
          setError("");
        } else if (requestError.response?.status === 503) {
          setUser(null);
          setError("");
        } else {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setError("");
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, error, refreshUser, logout }),
    [user, loading, error, refreshUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
