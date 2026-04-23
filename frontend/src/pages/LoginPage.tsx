import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ErrorBanner } from "../components/ErrorBanner";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { ApiClientError } from "../lib/api";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = (location.state as { from?: { pathname?: string } } | undefined)?.from
    ?.pathname;

  if (auth.isAuthenticated) {
    return <Navigate to={auth.isAdmin ? "/admin" : "/dashboard"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await auth.login({ email, password });
      navigate(destination ?? (result.user.role === "ADMIN" ? "/admin" : "/dashboard"), {
        replace: true,
      });
    } catch (submitError) {
      setError(
        submitError instanceof ApiClientError
          ? submitError.message
          : "Unable to sign you in right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <PageHeader
        eyebrow="Welcome back"
        title="Return to your garden calendar."
        description="Sign in to reserve workshop seats, manage plant station visits, and keep your bookings in sync."
      />

      <form onSubmit={handleSubmit} className="panel space-y-5 px-6 py-7">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-ink">Log in</h2>
          <p className="text-sm text-moss-700">
            Access your bookings and admin tools if your account has elevated access.
          </p>
        </div>

        {error ? <ErrorBanner message={error} /> : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-moss-800">Email</span>
          <input
            className="field-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-moss-800">Password</span>
          <input
            className="field-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 characters"
            required
          />
        </label>

        <button type="submit" className="primary-button w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Log in"}
        </button>

        <p className="text-sm text-moss-700">
          Need an account?{" "}
          <Link to="/register" className="font-semibold text-moss-800 underline">
            Register here
          </Link>
        </p>
      </form>
    </div>
  );
}
