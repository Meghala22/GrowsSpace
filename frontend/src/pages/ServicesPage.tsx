import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ServiceItem } from "../../../shared/contracts";
import { EmptyBlock } from "../components/EmptyBlock";
import { ErrorBanner } from "../components/ErrorBanner";
import { LoadingBlock } from "../components/LoadingBlock";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest, ApiClientError } from "../lib/api";

export function ServicesPage() {
  const auth = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      try {
        const data = await apiRequest<ServiceItem[]>("/services");
        if (!cancelled) {
          setServices(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load services right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Service catalog"
        title="Workshops and stations built for growing confidence."
        description="Choose structured group learning or focused one-person plant-care sessions. Every booking flows through the same protected, capacity-aware system."
        actions={
          <Link to={auth.isAuthenticated ? "/book" : "/register"} className="primary-button">
            {auth.isAuthenticated ? "Book a slot" : "Join GrowSpace"}
          </Link>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}
      {isLoading ? <LoadingBlock label="Loading service catalog..." /> : null}

      {!isLoading && !error && services.length === 0 ? (
        <EmptyBlock
          title="No services are active yet"
          description="Seed the database or activate services in PostgreSQL to make them bookable."
        />
      ) : null}

      {!isLoading && services.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <article key={service.id} className="panel flex flex-col gap-4 px-5 py-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-ink">{service.name}</h2>
                <StatusBadge
                  label={service.category}
                  tone={service.category === "WORKSHOP" ? "accent" : "success"}
                />
              </div>
              <p className="text-sm leading-6 text-moss-700">{service.description}</p>
              <div className="mt-auto pt-2">
                <Link to={auth.isAuthenticated ? "/book" : "/login"} className="secondary-button">
                  {auth.isAuthenticated ? "Choose a date" : "Log in to book"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
