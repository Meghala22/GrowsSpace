import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { BookingItem, ServiceItem } from "../../../shared/contracts";
import { EmptyBlock } from "../components/EmptyBlock";
import { ErrorBanner } from "../components/ErrorBanner";
import { LoadingBlock } from "../components/LoadingBlock";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest, ApiClientError } from "../lib/api";
import { formatDate, formatTime } from "../lib/format";

export function DashboardPage() {
  const auth = useAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [bookingData, serviceData] = await Promise.all([
          apiRequest<BookingItem[]>("/bookings/my", { token: auth.token }),
          apiRequest<ServiceItem[]>("/services"),
        ]);

        if (!cancelled) {
          setBookings(bookingData);
          setServices(serviceData);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load your dashboard right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [auth.token]);

  const confirmedCount = bookings.filter((booking) => booking.status === "CONFIRMED").length;
  const upcomingBooking = bookings.find((booking) => booking.status === "CONFIRMED");

  if (auth.isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="User dashboard"
        title={`Hello, ${auth.user?.name.split(" ")[0] ?? "Gardener"}.`}
        description="Track your upcoming reservations, browse bookable experiences, and jump back into the scheduler whenever you’re ready."
        actions={<Link to="/book" className="primary-button">Book another slot</Link>}
      />

      {error ? <ErrorBanner message={error} /> : null}
      {isLoading ? <LoadingBlock label="Loading your dashboard..." /> : null}

      {!isLoading ? (
        <section className="grid gap-5 md:grid-cols-3">
          <div className="panel px-5 py-6">
            <p className="text-sm text-moss-700">Confirmed bookings</p>
            <p className="mt-2 font-display text-5xl text-moss-900">{confirmedCount}</p>
          </div>
          <div className="panel px-5 py-6">
            <p className="text-sm text-moss-700">Active services</p>
            <p className="mt-2 font-display text-5xl text-moss-900">{services.length}</p>
          </div>
          <div className="panel px-5 py-6">
            <p className="text-sm text-moss-700">Account role</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{auth.user?.role}</p>
          </div>
        </section>
      ) : null}

      {!isLoading && upcomingBooking ? (
        <section className="panel space-y-4 px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-ink">Next appointment</h2>
              <p className="text-sm text-moss-700">
                Your next confirmed booking stays protected against overbooking with row-level locking.
              </p>
            </div>
            <StatusBadge label={upcomingBooking.status} tone="success" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-moss-600">Service</p>
              <p className="mt-2 font-semibold text-ink">{upcomingBooking.serviceName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-moss-600">Date</p>
              <p className="mt-2 font-semibold text-ink">{formatDate(upcomingBooking.slotDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-moss-600">Time</p>
              <p className="mt-2 font-semibold text-ink">
                {formatTime(upcomingBooking.startTime)} - {formatTime(upcomingBooking.endTime)}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!isLoading && bookings.length === 0 ? (
        <EmptyBlock
          title="No bookings yet"
          description="Pick a service and date to reserve your first workshop seat or plant-care station."
          action={<Link to="/book" className="primary-button">Start booking</Link>}
        />
      ) : null}
    </div>
  );
}
