import { useEffect, useState } from "react";
import type { BookingItem } from "../../../shared/contracts";
import { EmptyBlock } from "../components/EmptyBlock";
import { ErrorBanner } from "../components/ErrorBanner";
import { LoadingBlock } from "../components/LoadingBlock";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest, ApiClientError } from "../lib/api";
import { formatCurrency, formatDate, formatTime } from "../lib/format";

export function MyBookingsPage() {
  const auth = useAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBookings() {
      try {
        const data = await apiRequest<BookingItem[]>("/bookings/my", {
          token: auth.token,
        });
        if (!cancelled) {
          setBookings(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load your bookings right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      cancelled = true;
    };
  }, [auth.token]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My bookings"
        title="Every reservation, in one place."
        description="Review confirmed and cancelled appointments across gardening workshops and plant-care stations."
      />

      {error ? <ErrorBanner message={error} /> : null}
      {isLoading ? <LoadingBlock label="Loading your bookings..." /> : null}

      {!isLoading && bookings.length === 0 ? (
        <EmptyBlock
          title="No bookings found"
          description="Once you reserve a workshop or station, it will show up here."
        />
      ) : null}

      {!isLoading && bookings.length > 0 ? (
        <div className="grid gap-5">
          {bookings.map((booking) => (
            <article
              key={booking.id}
              className="panel grid gap-4 px-6 py-6 md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-center"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-moss-600">
                  {booking.slotType}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-ink">{booking.serviceName}</h2>
                <p className="mt-2 text-sm text-moss-700">
                  {booking.attendeeCount} {booking.attendeeCount === 1 ? "person" : "people"} ·{" "}
                  {booking.phoneNumber}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-moss-600">Date</p>
                <p className="mt-2 font-medium text-ink">{formatDate(booking.slotDate)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-moss-600">Time</p>
                <p className="mt-2 font-medium text-ink">
                  {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                </p>
                <p className="mt-2 text-sm text-moss-700">
                  {booking.paymentMethod} · {formatCurrency(booking.paymentAmountCents)}
                </p>
              </div>
              <div className="md:justify-self-end">
                <StatusBadge
                  label={booking.status}
                  tone={booking.status === "CONFIRMED" ? "success" : "danger"}
                />
                <div className="mt-2">
                  <StatusBadge
                    label={booking.paymentStatus}
                    tone={booking.paymentStatus === "PAID" ? "accent" : "neutral"}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
