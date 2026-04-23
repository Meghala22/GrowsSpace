import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AuthPayload, UserProfile } from "../../../shared/contracts";
import { apiRequest, ApiClientError } from "../lib/api";
import { clearStoredToken, getStoredToken, setStoredToken } from "../lib/storage";

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (input: { email: string; password: string }) => Promise<AuthPayload>;
  register: (input: { name: string; email: string; password: string }) => Promise<AuthPayload>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const profile = await apiRequest<UserProfile>("/auth/me", { token });
        if (!cancelled) {
          setUser(profile);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiClientError && error.status === 401) {
            clearStoredToken();
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAuth(path: "/auth/login" | "/auth/register", input: unknown) {
    const result = await apiRequest<AuthPayload>(path, {
      method: "POST",
      body: input,
    });

    setStoredToken(result.token);
    setToken(result.token);
    setUser(result.user);
    return result;
  }

  async function login(input: { email: string; password: string }) {
    return handleAuth("/auth/login", input);
  }

  async function register(input: { name: string; email: string; password: string }) {
    return handleAuth("/auth/register", input);
  }

  async function refreshProfile() {
    if (!token) {
      setUser(null);
      return;
    }

    const profile = await apiRequest<UserProfile>("/auth/me", { token });
    setUser(profile);
  }

  function logout() {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === "ADMIN",
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
