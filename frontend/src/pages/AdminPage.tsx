import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  AdminOverview,
  BookingItem,
  ServiceItem,
  SlotItem,
  SlotType,
  UserProfile,
} from "../../../shared/contracts";
import { EmptyBlock } from "../components/EmptyBlock";
import { ErrorBanner } from "../components/ErrorBanner";
import { LoadingBlock } from "../components/LoadingBlock";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest, ApiClientError } from "../lib/api";
import {
  formatCurrency,
  formatDate,
  formatTime,
  todayInputValue,
} from "../lib/format";

interface SlotFormState {
  serviceId: string;
  slotType: SlotType;
  slotDate: string;
  startTime: string;
  durationMinutes: number;
  maxCapacity: number;
}

interface ServiceFormState {
  name: string;
  description: string;
  category: SlotType;
  priceUsd: string;
  active: boolean;
}

const emptyOverview: AdminOverview = {
  totalUsers: 0,
  totalAdmins: 0,
  totalBookings: 0,
  confirmedBookings: 0,
  cancelledBookings: 0,
  todayBookings: 0,
  upcomingBookings: 0,
  totalAttendees: 0,
  totalRevenueCents: 0,
  totalSlots: 0,
  todaySlots: 0,
  upcomingSlots: 0,
  totalCapacity: 0,
  bookedCapacity: 0,
  openCapacity: 0,
};

const defaultServiceForm: ServiceFormState = {
  name: "",
  description: "",
  category: "WORKSHOP",
  priceUsd: "0.00",
  active: true,
};

function toServiceForm(service?: ServiceItem): ServiceFormState {
  if (!service) {
    return defaultServiceForm;
  }

  return {
    name: service.name,
    description: service.description,
    category: service.category,
    priceUsd: (service.priceCents / 100).toFixed(2),
    active: service.active,
  };
}

function parsePriceUsdToCents(value: string) {
  return Math.max(0, Math.round(Number(value || 0) * 100));
}

export function AdminPage() {
  const auth = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [overview, setOverview] = useState<AdminOverview>(emptyOverview);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [slotFilters, setSlotFilters] = useState({
    serviceId: "",
    date: todayInputValue(),
  });
  const [bookingFilters, setBookingFilters] = useState({
    serviceId: "",
    date: todayInputValue(),
  });
  const [slotForm, setSlotForm] = useState<SlotFormState>({
    serviceId: "",
    slotType: "WORKSHOP",
    slotDate: todayInputValue(),
    startTime: "10:00",
    durationMinutes: 60,
    maxCapacity: 10,
  });
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(defaultServiceForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingOverview, setIsRefreshingOverview] = useState(false);
  const [isRefreshingServices, setIsRefreshingServices] = useState(false);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const [isCreatingSlot, setIsCreatingSlot] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
  const [isRefreshingSlots, setIsRefreshingSlots] = useState(false);
  const [isRefreshingBookings, setIsRefreshingBookings] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [togglingServiceId, setTogglingServiceId] = useState<string | null>(null);

  const activeServices = services.filter((service) => service.active);
  const inactiveServices = services.length - activeServices.length;
  const capacityFillPercentage = useMemo(() => {
    if (overview.totalCapacity === 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((overview.bookedCapacity / overview.totalCapacity) * 100),
    );
  }, [overview.bookedCapacity, overview.totalCapacity]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [overviewData, serviceData, userData] = await Promise.all([
          apiRequest<AdminOverview>("/admin/overview", { token: auth.token }),
          apiRequest<ServiceItem[]>("/admin/services", { token: auth.token }),
          apiRequest<UserProfile[]>("/admin/users", { token: auth.token }),
        ]);

        if (!cancelled) {
          setOverview(overviewData);
          setServices(serviceData);
          setUsers(userData);

          const firstActiveServiceId = serviceData.find((service) => service.active)?.id || "";
          const firstServiceId = serviceData[0]?.id || "";
          const defaultServiceId = firstActiveServiceId || firstServiceId;

          setSlotForm((current) => ({
            ...current,
            serviceId: current.serviceId || defaultServiceId,
          }));
          setSlotFilters((current) => ({
            ...current,
            serviceId: current.serviceId || defaultServiceId,
          }));
          setBookingFilters((current) => ({
            ...current,
            serviceId: current.serviceId || defaultServiceId,
          }));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load admin data right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [auth.token]);

  useEffect(() => {
    if (!slotFilters.date) {
      return;
    }

    void refreshSlots();
  }, [slotFilters.serviceId, slotFilters.date]);

  useEffect(() => {
    if (!bookingFilters.date) {
      return;
    }

    void refreshBookings();
  }, [bookingFilters.serviceId, bookingFilters.date]);

  async function refreshOverview() {
    setIsRefreshingOverview(true);
    try {
      const data = await apiRequest<AdminOverview>("/admin/overview", {
        token: auth.token,
      });
      setOverview(data);
    } catch (loadError) {
      setError(
        loadError instanceof ApiClientError
          ? loadError.message
          : "Unable to refresh admin totals right now.",
      );
    } finally {
      setIsRefreshingOverview(false);
    }
  }

  async function refreshServices() {
    setIsRefreshingServices(true);
    try {
      const data = await apiRequest<ServiceItem[]>("/admin/services", {
        token: auth.token,
      });
      setServices(data);
    } catch (loadError) {
      setError(
        loadError instanceof ApiClientError
          ? loadError.message
          : "Unable to refresh services right now.",
      );
    } finally {
      setIsRefreshingServices(false);
    }
  }

  async function refreshUsers() {
    setIsRefreshingUsers(true);
    try {
      const data = await apiRequest<UserProfile[]>("/admin/users", {
        token: auth.token,
      });
      setUsers(data);
    } catch (loadError) {
      setError(
        loadError instanceof ApiClientError
          ? loadError.message
          : "Unable to refresh users right now.",
      );
    } finally {
      setIsRefreshingUsers(false);
    }
  }

  async function refreshSlots() {
    setIsRefreshingSlots(true);
    try {
      const params = new URLSearchParams();
      if (slotFilters.serviceId) {
        params.set("serviceId", slotFilters.serviceId);
      }
      if (slotFilters.date) {
        params.set("date", slotFilters.date);
      }

      const data = await apiRequest<SlotItem[]>(`/slots?${params.toString()}`);
      setSlots(data);
    } catch (loadError) {
      setError(
        loadError instanceof ApiClientError
          ? loadError.message
          : "Unable to refresh slots right now.",
      );
    } finally {
      setIsRefreshingSlots(false);
    }
  }

  async function refreshBookings() {
    setIsRefreshingBookings(true);
    try {
      const params = new URLSearchParams();
      if (bookingFilters.serviceId) {
        params.set("serviceId", bookingFilters.serviceId);
      }
      if (bookingFilters.date) {
        params.set("date", bookingFilters.date);
      }

      const data = await apiRequest<BookingItem[]>(`/admin/bookings?${params.toString()}`, {
        token: auth.token,
      });
      setBookings(data);
    } catch (loadError) {
      setError(
        loadError instanceof ApiClientError
          ? loadError.message
          : "Unable to refresh bookings right now.",
      );
    } finally {
      setIsRefreshingBookings(false);
    }
  }

  function resetServiceEditor() {
    setEditingServiceId(null);
    setServiceForm(defaultServiceForm);
  }

  async function handleCreateSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsCreatingSlot(true);

    try {
      await apiRequest<SlotItem>("/admin/slots", {
        method: "POST",
        token: auth.token,
        body: slotForm,
      });
      setSuccess("Slot created successfully.");
      await Promise.all([refreshOverview(), refreshSlots(), refreshBookings()]);
    } catch (submitError) {
      setError(
        submitError instanceof ApiClientError
          ? submitError.message
          : "Unable to create the slot right now.",
      );
    } finally {
      setIsCreatingSlot(false);
    }
  }

  async function handleSaveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSavingService(true);

    const payload = {
      name: serviceForm.name,
      description: serviceForm.description,
      category: serviceForm.category,
      priceCents: parsePriceUsdToCents(serviceForm.priceUsd),
      active: serviceForm.active,
    };

    try {
      if (editingServiceId) {
        await apiRequest<ServiceItem>(`/admin/services/${editingServiceId}`, {
          method: "PATCH",
          token: auth.token,
          body: payload,
        });
        setSuccess("Service updated successfully.");
      } else {
        await apiRequest<ServiceItem>("/admin/services", {
          method: "POST",
          token: auth.token,
          body: payload,
        });
        setSuccess("Service created successfully.");
      }

      resetServiceEditor();
      await Promise.all([refreshServices(), refreshOverview()]);
    } catch (submitError) {
      setError(
        submitError instanceof ApiClientError
          ? submitError.message
          : "Unable to save the service right now.",
      );
    } finally {
      setIsSavingService(false);
    }
  }

  async function handleToggleService(service: ServiceItem) {
    setError(null);
    setSuccess(null);
    setTogglingServiceId(service.id);

    try {
      await apiRequest<ServiceItem>(`/admin/services/${service.id}`, {
        method: "PATCH",
        token: auth.token,
        body: {
          name: service.name,
          description: service.description,
          category: service.category,
          priceCents: service.priceCents,
          active: !service.active,
        },
      });
      setSuccess(
        `${service.name} is now ${service.active ? "inactive" : "active"}.`,
      );
      await Promise.all([refreshServices(), refreshOverview()]);
    } catch (toggleError) {
      setError(
        toggleError instanceof ApiClientError
          ? toggleError.message
          : "Unable to update the service status right now.",
      );
    } finally {
      setTogglingServiceId(null);
    }
  }

  async function handleUpdateUserRole(user: UserProfile, role: "ADMIN" | "USER") {
    setError(null);
    setSuccess(null);
    setUpdatingUserId(user.id);

    try {
      await apiRequest<UserProfile>(`/admin/users/${user.id}/role`, {
        method: "PATCH",
        token: auth.token,
        body: { role },
      });
      setSuccess(`${user.name} is now ${role}.`);
      await Promise.all([refreshUsers(), refreshOverview()]);
    } catch (updateError) {
      setError(
        updateError instanceof ApiClientError
          ? updateError.message
          : "Unable to update that user role right now.",
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    const confirmed = window.confirm("Cancel this booking?");
    if (!confirmed) {
      return;
    }

    setCancellingBookingId(bookingId);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest<BookingItem>(`/admin/bookings/${bookingId}/cancel`, {
        method: "PATCH",
        token: auth.token,
      });
      setSuccess("Booking cancelled successfully.");
      await Promise.all([refreshOverview(), refreshBookings(), refreshSlots()]);
    } catch (cancelError) {
      setError(
        cancelError instanceof ApiClientError
          ? cancelError.message
          : "Unable to cancel the booking right now.",
      );
    } finally {
      setCancellingBookingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin control center"
        title={`Manage the full GrowSpace platform, ${auth.user?.name.split(" ")[0] ?? "Admin"}.`}
        description="Admins can oversee users, manage services, create slots, inspect all bookings, and keep capacity, pricing, and access under control from one workspace."
      />

      {error ? <ErrorBanner message={error} /> : null}
      {success ? (
        <div className="rounded-2xl border border-moss-200 bg-moss-50 px-4 py-3 text-sm text-moss-800">
          {success}
        </div>
      ) : null}

      {isLoading ? <LoadingBlock label="Loading admin workspace..." /> : null}

      {!isLoading ? (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            <div className="panel px-5 py-6">
              <p className="text-sm text-moss-700">Total users</p>
              <p className="mt-2 font-display text-5xl text-moss-900">{overview.totalUsers}</p>
              <p className="mt-2 text-sm text-moss-600">
                {overview.totalAdmins} admin{overview.totalAdmins === 1 ? "" : "s"}
              </p>
            </div>
            <div className="panel px-5 py-6">
              <p className="text-sm text-moss-700">Active services</p>
              <p className="mt-2 font-display text-5xl text-moss-900">{activeServices.length}</p>
              <p className="mt-2 text-sm text-moss-600">{inactiveServices} inactive</p>
            </div>
            <div className="panel px-5 py-6">
              <p className="text-sm text-moss-700">Confirmed bookings</p>
              <p className="mt-2 font-display text-5xl text-moss-900">
                {overview.confirmedBookings}
              </p>
              <p className="mt-2 text-sm text-moss-600">
                {overview.cancelledBookings} cancelled
              </p>
            </div>
            <div className="panel px-5 py-6">
              <p className="text-sm text-moss-700">Open capacity</p>
              <p className="mt-2 font-display text-5xl text-moss-900">{overview.openCapacity}</p>
              <p className="mt-2 text-sm text-moss-600">
                {capacityFillPercentage}% of capacity already booked
              </p>
            </div>
            <div className="panel px-5 py-6">
              <p className="text-sm text-moss-700">Revenue captured</p>
              <p className="mt-2 text-4xl font-semibold text-ink">
                {formatCurrency(overview.totalRevenueCents)}
              </p>
              <p className="mt-2 text-sm text-moss-600">
                Confirmed bookings only
              </p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="panel space-y-5 px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">Platform snapshot</h2>
                  <p className="mt-2 text-sm text-moss-700">
                    Monitor today&apos;s activity and refresh the admin totals whenever you need a current view.
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void refreshOverview()}
                >
                  {isRefreshingOverview ? "Refreshing..." : "Refresh totals"}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-moss-100 bg-white px-5 py-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-moss-600">Today</p>
                  <div className="mt-4 grid gap-3 text-sm text-moss-800">
                    <div className="flex items-center justify-between gap-3">
                      <span>Bookings scheduled today</span>
                      <span className="font-semibold">{overview.todayBookings}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Slots scheduled today</span>
                      <span className="font-semibold">{overview.todaySlots}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Total attendees booked</span>
                      <span className="font-semibold">{overview.totalAttendees}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-moss-100 bg-white px-5 py-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-moss-600">
                    Forward view
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-moss-800">
                    <div className="flex items-center justify-between gap-3">
                      <span>Upcoming bookings</span>
                      <span className="font-semibold">{overview.upcomingBookings}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Upcoming slots</span>
                      <span className="font-semibold">{overview.upcomingSlots}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Total slots in system</span>
                      <span className="font-semibold">{overview.totalSlots}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-moss-100 bg-white px-5 py-5">
                <div className="flex items-center justify-between gap-3 text-sm text-moss-800">
                  <span>Capacity utilization</span>
                  <span className="font-semibold">{capacityFillPercentage}% filled</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-moss-100">
                  <div
                    className="h-full rounded-full bg-moss-700 transition-all"
                    style={{ width: `${capacityFillPercentage}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-moss-700">
                  <span>{overview.bookedCapacity} seats booked</span>
                  <span>{overview.totalCapacity} seats total</span>
                </div>
              </div>
            </div>

            <section className="panel space-y-5 px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">
                    {editingServiceId ? "Edit service" : "Create service"}
                  </h2>
                  <p className="mt-2 text-sm text-moss-700">
                    Admins can create, update, activate, and deactivate services directly from the dashboard.
                  </p>
                </div>
                {editingServiceId ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={resetServiceEditor}
                  >
                    New service
                  </button>
                ) : null}
              </div>

              <form onSubmit={handleSaveService} className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-moss-800">Service name</span>
                  <input
                    className="field-input"
                    value={serviceForm.name}
                    onChange={(event) =>
                      setServiceForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Indoor Plant Care Workshop"
                    required
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-moss-800">Description</span>
                  <textarea
                    className="field-input min-h-28"
                    value={serviceForm.description}
                    onChange={(event) =>
                      setServiceForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Describe the service, capacity style, and what guests should expect."
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-moss-800">Category</span>
                  <select
                    className="field-input"
                    value={serviceForm.category}
                    onChange={(event) =>
                      setServiceForm((current) => ({
                        ...current,
                        category: event.target.value as SlotType,
                      }))
                    }
                  >
                    <option value="WORKSHOP">WORKSHOP</option>
                    <option value="STATION">STATION</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-moss-800">Price (USD)</span>
                  <input
                    className="field-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={serviceForm.priceUsd}
                    onChange={(event) =>
                      setServiceForm((current) => ({
                        ...current,
                        priceUsd: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-moss-800">Availability</span>
                  <select
                    className="field-input"
                    value={serviceForm.active ? "ACTIVE" : "INACTIVE"}
                    onChange={(event) =>
                      setServiceForm((current) => ({
                        ...current,
                        active: event.target.value === "ACTIVE",
                      }))
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </label>

                <button
                  type="submit"
                  className="primary-button md:col-span-2"
                  disabled={isSavingService}
                >
                  {isSavingService
                    ? editingServiceId
                      ? "Saving..."
                      : "Creating..."
                    : editingServiceId
                      ? "Save service"
                      : "Create service"}
                </button>
              </form>
            </section>
          </section>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="panel space-y-5 px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">Service management</h2>
                  <p className="mt-2 text-sm text-moss-700">
                    Review the service catalog, jump into edit mode, and toggle availability without leaving the admin screen.
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void refreshServices()}
                >
                  {isRefreshingServices ? "Refreshing..." : "Refresh services"}
                </button>
              </div>

              {services.length === 0 ? (
                <EmptyBlock
                  title="No services yet"
                  description="Create the first service to open booking options in GrowSpace."
                />
              ) : (
                <div className="grid gap-4">
                  {services.map((service) => (
                    <article
                      key={service.id}
                      className="rounded-2xl border border-moss-100 bg-white px-5 py-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-ink">{service.name}</h3>
                            <StatusBadge
                              label={service.active ? "ACTIVE" : "INACTIVE"}
                              tone={service.active ? "success" : "neutral"}
                            />
                          </div>
                          <p className="mt-2 text-sm text-moss-700">{service.description}</p>
                          <p className="mt-3 text-sm text-moss-700">
                            {service.category} | {formatCurrency(service.priceCents)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              setEditingServiceId(service.id);
                              setServiceForm(toServiceForm(service));
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={togglingServiceId === service.id}
                            onClick={() => void handleToggleService(service)}
                          >
                            {togglingServiceId === service.id
                              ? "Saving..."
                              : service.active
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="panel space-y-5 px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">User management</h2>
                  <p className="mt-2 text-sm text-moss-700">
                    See everyone on the platform and promote or demote access roles as needed.
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void refreshUsers()}
                >
                  {isRefreshingUsers ? "Refreshing..." : "Refresh users"}
                </button>
              </div>

              {users.length === 0 ? (
                <EmptyBlock
                  title="No users found"
                  description="Users will appear here after registration."
                />
              ) : (
                <div className="grid gap-4">
                  {users.map((user) => {
                    const isCurrentAdmin = user.id === auth.user?.id;

                    return (
                      <article
                        key={user.id}
                        className="rounded-2xl border border-moss-100 bg-white px-5 py-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-ink">{user.name}</h3>
                              <StatusBadge
                                label={user.role}
                                tone={user.role === "ADMIN" ? "accent" : "neutral"}
                              />
                              {isCurrentAdmin ? (
                                <StatusBadge label="YOU" tone="success" />
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-moss-700">{user.email}</p>
                            <p className="mt-2 text-sm text-moss-700">
                              Joined {formatDate(user.createdAt)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={
                                updatingUserId === user.id ||
                                isCurrentAdmin ||
                                user.role === "ADMIN"
                              }
                              onClick={() => void handleUpdateUserRole(user, "ADMIN")}
                            >
                              {updatingUserId === user.id ? "Saving..." : "Make admin"}
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={
                                updatingUserId === user.id ||
                                isCurrentAdmin ||
                                user.role === "USER"
                              }
                              onClick={() => void handleUpdateUserRole(user, "USER")}
                            >
                              {updatingUserId === user.id ? "Saving..." : "Make user"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="panel space-y-5 px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">Slot management</h2>
                  <p className="mt-2 text-sm text-moss-700">
                    Create new slot inventory and inspect existing capacity by service and date.
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void refreshSlots()}
                >
                  Refresh slots
                </button>
              </div>

              <form onSubmit={handleCreateSlot} className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-moss-800">Service</span>
                  <select
                    className="field-input"
                    value={slotForm.serviceId}
                    onChange={(event) =>
                      setSlotForm((current) => ({ ...current, serviceId: event.target.value }))
                    }
                    required
                  >
                    {services
                      .filter((service) => service.active)
                      .map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-moss-800">Slot type</span>
                  <select
                    className="field-input"
                    value={slotForm.slotType}
                    onChange={(event) =>
                      setSlotForm((current) => ({
                        ...current,
                        slotType: event.target.value as SlotType,
                      }))
                    }
                  >
                    <option value="WORKSHOP">WORKSHOP</option>
                    <option value="STATION">STATION</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-moss-800">Date</span>
                  <input
                    className="field-input"
                    type="date"
                    min={todayInputValue()}
                    value={slotForm.slotDate}
                    onChange={(event) =>
                      setSlotForm((current) => ({ ...current, slotDate: event.target.value }))
                    }
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-moss-800">Start time</span>
                  <input
                    className="field-input"
                    type="time"
                    value={slotForm.startTime}
                    onChange={(event) =>
                      setSlotForm((current) => ({ ...current, startTime: event.target.value }))
                    }
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-moss-800">Duration (minutes)</span>
                  <input
                    className="field-input"
                    type="number"
                    min={15}
                    step={15}
                    value={slotForm.durationMinutes}
                    onChange={(event) =>
                      setSlotForm((current) => ({
                        ...current,
                        durationMinutes: Number(event.target.value),
                      }))
                    }
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-moss-800">Max capacity</span>
                  <input
                    className="field-input"
                    type="number"
                    min={1}
                    value={slotForm.maxCapacity}
                    onChange={(event) =>
                      setSlotForm((current) => ({
                        ...current,
                        maxCapacity: Number(event.target.value),
                      }))
                    }
                  />
                </label>

                <button
                  type="submit"
                  className="primary-button md:col-span-2"
                  disabled={isCreatingSlot}
                >
                  {isCreatingSlot ? "Creating slot..." : "Create slot"}
                </button>
              </form>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-moss-800">Filter service</span>
                  <select
                    className="field-input"
                    value={slotFilters.serviceId}
                    onChange={(event) =>
                      setSlotFilters((current) => ({ ...current, serviceId: event.target.value }))
                    }
                  >
                    <option value="">All services</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-moss-800">Filter date</span>
                  <input
                    className="field-input"
                    type="date"
                    value={slotFilters.date}
                    onChange={(event) =>
                      setSlotFilters((current) => ({ ...current, date: event.target.value }))
                    }
                  />
                </label>
              </div>

              {isRefreshingSlots ? <LoadingBlock label="Refreshing slots..." /> : null}

              {!isRefreshingSlots && slots.length === 0 ? (
                <EmptyBlock
                  title="No slots match those filters"
                  description="Create a slot or adjust the date and service filters."
                />
              ) : null}

              {!isRefreshingSlots && slots.length > 0 ? (
                <div className="grid gap-4">
                  {slots.slice(0, 10).map((slot) => (
                    <article
                      key={slot.id}
                      className="rounded-2xl border border-moss-100 bg-white px-5 py-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-ink">{slot.serviceName}</h3>
                          <p className="text-sm text-moss-700">
                            {formatDate(slot.slotDate)} | {formatTime(slot.startTime)} -{" "}
                            {formatTime(slot.endTime)}
                          </p>
                        </div>
                        <StatusBadge
                          label={`${slot.slotType} | ${slot.bookedCount}/${slot.maxCapacity}`}
                          tone={slot.slotType === "WORKSHOP" ? "accent" : "success"}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="panel space-y-5 px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">Booking management</h2>
                  <p className="mt-2 text-sm text-moss-700">
                    Inspect all reservations with user information, payment details, and cancellation controls.
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void refreshBookings()}
                >
                  Refresh bookings
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-moss-800">Filter service</span>
                  <select
                    className="field-input"
                    value={bookingFilters.serviceId}
                    onChange={(event) =>
                      setBookingFilters((current) => ({
                        ...current,
                        serviceId: event.target.value,
                      }))
                    }
                  >
                    <option value="">All services</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-moss-800">Filter date</span>
                  <input
                    className="field-input"
                    type="date"
                    value={bookingFilters.date}
                    onChange={(event) =>
                      setBookingFilters((current) => ({ ...current, date: event.target.value }))
                    }
                  />
                </label>
              </div>

              {isRefreshingBookings ? <LoadingBlock label="Refreshing bookings..." /> : null}

              {!isRefreshingBookings && bookings.length === 0 ? (
                <EmptyBlock
                  title="No bookings match those filters"
                  description="Adjust the filters or wait for new reservations to arrive."
                />
              ) : null}

              {!isRefreshingBookings && bookings.length > 0 ? (
                <div className="grid gap-4">
                  {bookings.slice(0, 12).map((booking) => (
                    <article
                      key={booking.id}
                      className="rounded-2xl border border-moss-100 bg-white px-5 py-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-moss-600">
                              Booker
                            </p>
                            <p className="mt-2 font-semibold text-ink">{booking.userName}</p>
                            <p className="text-sm text-moss-700">{booking.userEmail}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-moss-600">
                              Booking
                            </p>
                            <p className="mt-2 font-semibold text-ink">{booking.serviceName}</p>
                            <p className="text-sm text-moss-700">
                              {formatDate(booking.slotDate)} | {formatTime(booking.startTime)} -{" "}
                              {formatTime(booking.endTime)}
                            </p>
                            <p className="text-sm text-moss-700">
                              {booking.attendeeCount}{" "}
                              {booking.attendeeCount === 1 ? "person" : "people"} |{" "}
                              {booking.phoneNumber}
                            </p>
                            <p className="text-sm text-moss-700">
                              {booking.paymentMethod} |{" "}
                              {formatCurrency(booking.paymentAmountCents)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <StatusBadge
                            label={booking.status}
                            tone={booking.status === "CONFIRMED" ? "success" : "danger"}
                          />
                          <StatusBadge
                            label={booking.paymentStatus}
                            tone={booking.paymentStatus === "PAID" ? "accent" : "neutral"}
                          />
                          {booking.status === "CONFIRMED" ? (
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={cancellingBookingId === booking.id}
                              onClick={() => void handleCancelBooking(booking.id)}
                            >
                              {cancellingBookingId === booking.id
                                ? "Cancelling..."
                                : "Cancel booking"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
