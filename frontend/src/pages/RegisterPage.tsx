import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ErrorBanner } from "../components/ErrorBanner";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { ApiClientError } from "../lib/api";

export function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (auth.isAuthenticated) {
    return <Navigate to={auth.isAdmin ? "/admin" : "/dashboard"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await auth.register(form);
      navigate(result.user.role === "ADMIN" ? "/admin" : "/dashboard", { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof ApiClientError
          ? submitError.message
          : "Unable to create your account right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <PageHeader
        eyebrow="Get started"
        title="Create your GrowSpace account."
        description="Join the platform to reserve gardening workshops, secure plant-care stations, and track every appointment from one dashboard."
      />

      <form onSubmit={handleSubmit} className="panel space-y-5 px-6 py-7">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-ink">Register</h2>
          <p className="text-sm text-moss-700">
            Standard registrations create `USER` accounts. Promote an account to `ADMIN` in PostgreSQL when needed.
          </p>
        </div>

        {error ? <ErrorBanner message={error} /> : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-moss-800">Full name</span>
          <input
            className="field-input"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Alex Gardener"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-moss-800">Email</span>
          <input
            className="field-input"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="alex@example.com"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-moss-800">Password</span>
          <input
            className="field-input"
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Choose a strong password"
            required
          />
        </label>

        <button type="submit" className="primary-button w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-moss-700">
          Already signed up?{" "}
          <Link to="/login" className="font-semibold text-moss-800 underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
