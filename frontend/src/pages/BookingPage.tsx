import { useEffect, useMemo, useState } from "react";
import type {
  BookingItem,
  PaymentMethod,
  ServiceItem,
  SlotItem,
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

interface DateSummary {
  date: string;
  slotCount: number;
  totalCapacityLeft: number;
}

function toDateKey(slotDate: string) {
  return slotDate.slice(0, 10);
}

function normalizeCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 19);
}

function formatCardNumberInput(value: string) {
  return normalizeCardNumber(value)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function BookingPage() {
  const auth = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [serviceAvailability, setServiceAvailability] = useState<SlotItem[]>([]);
  const [daySlots, setDaySlots] = useState<SlotItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayInputValue());
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isLoadingDaySlots, setIsLoadingDaySlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");
  const [paymentReference, setPaymentReference] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const selectedSlot = daySlots.find((slot) => slot.id === selectedSlotId) ?? null;

  const availableDateSummaries = useMemo<DateSummary[]>(() => {
    const summaryMap = new Map<string, DateSummary>();

    for (const slot of serviceAvailability) {
      const dateKey = toDateKey(slot.slotDate);
      const existing = summaryMap.get(dateKey);

      if (existing) {
        existing.slotCount += 1;
        existing.totalCapacityLeft += slot.availableCapacity;
      } else {
        summaryMap.set(dateKey, {
          date: dateKey,
          slotCount: 1,
          totalCapacityLeft: slot.availableCapacity,
        });
      }
    }

    return Array.from(summaryMap.values()).sort((left, right) =>
      left.date.localeCompare(right.date),
    );
  }, [serviceAvailability]);

  const selectedDateSummary =
    availableDateSummaries.find((summary) => summary.date === selectedDate) ?? null;
  const firstAvailableDate = availableDateSummaries[0]?.date ?? "";
  const lastAvailableDate =
    availableDateSummaries[availableDateSummaries.length - 1]?.date ?? "";
  const quickPickDates = useMemo(() => {
    if (availableDateSummaries.length <= 12) {
      return availableDateSummaries;
    }

    const selectedIndex = availableDateSummaries.findIndex(
      (summary) => summary.date === selectedDate,
    );
    const startIndex =
      selectedIndex >= 0
        ? Math.min(
            Math.max(selectedIndex - 2, 0),
            Math.max(availableDateSummaries.length - 12, 0),
          )
        : 0;

    return availableDateSummaries.slice(startIndex, startIndex + 12);
  }, [availableDateSummaries, selectedDate]);

  const estimatedTotal = selectedService ? selectedService.priceCents * attendeeCount : 0;

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      try {
        const serviceData = await apiRequest<ServiceItem[]>("/services");
        if (!cancelled) {
          setServices(serviceData);
          setSelectedServiceId((current) => current || serviceData[0]?.id || "");
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
          setIsLoadingServices(false);
        }
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadServiceAvailability() {
      if (!selectedServiceId) {
        setServiceAvailability([]);
        return;
      }

      setIsLoadingAvailability(true);
      setSelectedSlotId("");
      setDaySlots([]);
      setError(null);

      try {
        const slotData = await apiRequest<SlotItem[]>(
          `/slots/available?serviceId=${encodeURIComponent(selectedServiceId)}`,
        );

        if (!cancelled) {
          setServiceAvailability(slotData);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load available dates right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAvailability(false);
        }
      }
    }

    loadServiceAvailability();

    return () => {
      cancelled = true;
    };
  }, [selectedServiceId]);

  useEffect(() => {
    if (availableDateSummaries.length === 0) {
      return;
    }

    const hasSelectedDateAvailability = availableDateSummaries.some(
      (summary) => summary.date === selectedDate,
    );

    if (!hasSelectedDateAvailability) {
      setSelectedDate(availableDateSummaries[0].date);
    }
  }, [availableDateSummaries, selectedDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadDaySlots() {
      if (!selectedServiceId || !selectedDate) {
        setDaySlots([]);
        return;
      }

      setIsLoadingDaySlots(true);
      setSelectedSlotId("");

      try {
        const slotData = await apiRequest<SlotItem[]>(
          `/slots/available?serviceId=${encodeURIComponent(selectedServiceId)}&date=${encodeURIComponent(selectedDate)}`,
        );

        if (!cancelled) {
          setDaySlots(slotData);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiClientError
              ? loadError.message
              : "Unable to load slots for that date right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDaySlots(false);
        }
      }
    }

    loadDaySlots();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedServiceId]);

  function buildPaymentReference() {
    if (paymentMethod === "CARD") {
      const digits = normalizeCardNumber(cardNumber);
      return `CARD ending ${digits.slice(-4)}`;
    }

    return paymentReference.trim() || undefined;
  }

  function validateBooking(slot: SlotItem) {
    if (attendeeCount < 1) {
      return "Please enter at least 1 attendee.";
    }

    if (attendeeCount > slot.availableCapacity) {
      return "The selected slot does not have enough remaining capacity for that many people.";
    }

    if (!phoneNumber.trim()) {
      return "Please enter a phone number before booking.";
    }

    if (paymentMethod === "CARD") {
      const digits = normalizeCardNumber(cardNumber);

      if (!cardholderName.trim()) {
        return "Please enter the cardholder name.";
      }

      if (digits.length < 12 || digits.length > 19) {
        return "Please enter a valid card number.";
      }

      if (!/^\d{2}\/\d{2}$/.test(cardExpiry.trim())) {
        return "Please enter the card expiry in MM/YY format.";
      }

      if (!/^\d{3,4}$/.test(cardCvv.trim())) {
        return "Please enter a valid card CVV.";
      }
    }

    return null;
  }

  async function handleBook() {
    if (!selectedSlot) {
      setError("Please choose a slot before you continue to payment.");
      return;
    }

    const validationError = validateBooking(selectedSlot);
    if (validationError) {
      setError(validationError);
      return;
    }

    setBookingSlotId(selectedSlot.id);
    setError(null);
    setSuccess(null);

    try {
      const booking = await apiRequest<BookingItem>("/bookings", {
        method: "POST",
        token: auth.token,
        body: {
          slotId: selectedSlot.id,
          attendeeCount,
          phoneNumber,
          paymentMethod,
          paymentReference: buildPaymentReference(),
        },
      });

      setSuccess(
        `Booking confirmed for ${booking.serviceName} for ${booking.attendeeCount} ${
          booking.attendeeCount === 1 ? "person" : "people"
        }. Payment recorded: ${formatCurrency(booking.paymentAmountCents)}.`,
      );

      const [refreshedAvailability, refreshedDaySlots] = await Promise.all([
        apiRequest<SlotItem[]>(
          `/slots/available?serviceId=${encodeURIComponent(selectedServiceId)}`,
        ),
        apiRequest<SlotItem[]>(
          `/slots/available?serviceId=${encodeURIComponent(selectedServiceId)}&date=${encodeURIComponent(selectedDate)}`,
        ),
      ]);

      setServiceAvailability(refreshedAvailability);
      setDaySlots(refreshedDaySlots);
      setSelectedSlotId("");
    } catch (bookingError) {
      setError(
        bookingError instanceof ApiClientError
          ? bookingError.message
          : "Unable to complete your booking right now.",
      );
    } finally {
      setBookingSlotId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Book appointments"
        title="Choose a date first, then lock in the best slot."
        description="GrowSpace shows future capacity, lets you select a day, and only opens payment after you pick a real slot."
      />

      {error ? <ErrorBanner message={error} /> : null}
      {success ? (
        <div className="rounded-2xl border border-moss-200 bg-moss-50 px-4 py-3 text-sm text-moss-800">
          {success}
        </div>
      ) : null}

      <section className="panel grid gap-5 px-6 py-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-moss-800">Service</span>
              <select
                className="field-input"
                value={selectedServiceId}
                onChange={(event) => setSelectedServiceId(event.target.value)}
                disabled={isLoadingServices}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-moss-800">Date</span>
              <input
                className="field-input"
                type="date"
                min={firstAvailableDate || todayInputValue()}
                max={lastAvailableDate || undefined}
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSuccess(null);
                }}
                disabled={!selectedServiceId || availableDateSummaries.length === 0}
              />
            </label>
          </div>

          {quickPickDates.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-ink">Quick-pick dates</h2>
                <p className="text-sm text-moss-700">
                  Availability is seeded daily through{" "}
                  {lastAvailableDate ? formatDate(lastAvailableDate) : "--"}.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {quickPickDates.map((summary) => (
                  <button
                    key={summary.date}
                    type="button"
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selectedDate === summary.date
                        ? "border-moss-700 bg-moss-700 text-white"
                        : "border-moss-200 bg-white text-moss-800 hover:bg-moss-50"
                    }`}
                    onClick={() => setSelectedDate(summary.date)}
                  >
                    <div className="text-sm font-semibold">{formatDate(summary.date)}</div>
                    <div className="mt-1 text-xs">
                      {summary.slotCount} slot{summary.slotCount === 1 ? "" : "s"} |{" "}
                      {summary.totalCapacityLeft} spots left
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-moss-100 bg-moss-50 px-5 py-5">
          <p className="text-xs uppercase tracking-[0.18em] text-moss-600">Availability</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm text-moss-800">
              <span>Future dates open</span>
              <span className="font-semibold">{availableDateSummaries.length}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-moss-800">
              <span>Selected day</span>
              <span className="font-semibold">
                {selectedDateSummary ? formatDate(selectedDateSummary.date) : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-moss-800">
              <span>Slots on selected day</span>
              <span className="font-semibold">{selectedDateSummary?.slotCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-moss-200 pt-3 text-sm text-ink">
              <span className="font-medium">Capacity left that day</span>
              <span className="text-lg font-semibold">
                {selectedDateSummary?.totalCapacityLeft ?? 0}
              </span>
            </div>
          </div>
        </div>
      </section>

      {isLoadingServices ? <LoadingBlock label="Loading booking options..." /> : null}
      {isLoadingAvailability ? <LoadingBlock label="Loading future availability..." /> : null}
      {isLoadingDaySlots ? <LoadingBlock label="Loading slots for the selected date..." /> : null}

      {!isLoadingAvailability && !error && availableDateSummaries.length === 0 ? (
        <EmptyBlock
          title="No future availability yet"
          description="This service does not have any upcoming bookable dates right now."
        />
      ) : null}

      {!isLoadingDaySlots && availableDateSummaries.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-ink">Step 2: Choose your slot</h2>
              <p className="mt-2 text-sm text-moss-700">
                Select a date first, then choose one of the open times for{" "}
                {selectedService?.name ?? "this service"}.
              </p>
            </div>
            <div className="text-sm text-moss-700">
              {selectedDateSummary?.slotCount ?? 0} slot
              {selectedDateSummary?.slotCount === 1 ? "" : "s"} on{" "}
              {selectedDateSummary ? formatDate(selectedDateSummary.date) : selectedDate}
            </div>
          </div>

          {daySlots.length === 0 ? (
            <EmptyBlock
              title="No open slots for that date"
              description={
                selectedService
                  ? `There are no bookable ${selectedService.name} slots on ${selectedDate} right now. Pick another future date above.`
                  : "Choose a service and date to look for bookable slots."
              }
            />
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {daySlots.map((slot) => {
                const isSelected = slot.id === selectedSlotId;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`panel flex h-full flex-col gap-4 px-5 py-6 text-left transition ${
                      isSelected
                        ? "border-moss-700 ring-2 ring-moss-200"
                        : "hover:border-moss-300"
                    }`}
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setSuccess(null);
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-ink">{slot.serviceName}</h3>
                        <p className="text-sm text-moss-700">{formatDate(slot.slotDate)}</p>
                      </div>
                      <StatusBadge
                        label={slot.slotType}
                        tone={slot.slotType === "WORKSHOP" ? "accent" : "success"}
                      />
                    </div>

                    <div className="grid gap-3 text-sm text-moss-800 md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-moss-600">
                          Time
                        </p>
                        <p className="mt-2 font-semibold">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-moss-600">
                          Capacity
                        </p>
                        <p className="mt-2 font-semibold">
                          {slot.bookedCount}/{slot.maxCapacity}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-moss-600">
                          Available
                        </p>
                        <p className="mt-2 font-semibold">{slot.availableCapacity} spots left</p>
                      </div>
                    </div>

                    <div className="mt-auto rounded-2xl border border-moss-100 bg-moss-50 px-4 py-4 text-sm text-moss-800">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>Price per person</span>
                        <span className="font-semibold">
                          {selectedService
                            ? formatCurrency(selectedService.priceCents)
                            : "--"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs uppercase tracking-[0.14em] text-moss-600">
                        {isSelected ? "Selected slot" : "Click to select this slot"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      <section className="panel grid gap-5 px-6 py-6 lg:grid-cols-[1fr_20rem]">
        {selectedSlot ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Step 3: Add booking details</h2>
              <p className="mt-2 text-sm text-moss-700">
                You selected the {formatTime(selectedSlot.startTime)} slot on{" "}
                {formatDate(selectedSlot.slotDate)}. Add your attendees, phone number, and payment details to complete the booking.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-moss-800">Number of people</span>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  max={selectedSlot.maxCapacity}
                  value={attendeeCount}
                  onChange={(event) => setAttendeeCount(Number(event.target.value) || 1)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-moss-800">Phone number</span>
                <input
                  className="field-input"
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="+1 555 123 4567"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-moss-800">Payment method</span>
                <select
                  className="field-input"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                >
                  <option value="CARD">CARD</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">CASH</option>
                </select>
              </label>

              {paymentMethod !== "CARD" ? (
                <label className="space-y-2">
                  <span className="text-sm font-medium text-moss-800">
                    Payment reference
                  </span>
                  <input
                    className="field-input"
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder="Optional receipt or transaction reference"
                  />
                </label>
              ) : null}
            </div>

            {paymentMethod === "CARD" ? (
              <div className="rounded-3xl border border-moss-100 bg-moss-50 px-5 py-5">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-ink">Card details</h3>
                  <p className="text-sm text-moss-700">
                    Enter the card details to complete the payment step. GrowSpace stores only masked card metadata, never the full card number or CVV.
                  </p>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-moss-800">
                      Cardholder name
                    </span>
                    <input
                      className="field-input"
                      value={cardholderName}
                      onChange={(event) => setCardholderName(event.target.value)}
                      placeholder="Cardholder full name"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-moss-800">Card number</span>
                    <input
                      className="field-input"
                      inputMode="numeric"
                      value={formatCardNumberInput(cardNumber)}
                      onChange={(event) => setCardNumber(event.target.value)}
                      placeholder="4242 4242 4242 4242"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-moss-800">Expiry</span>
                    <input
                      className="field-input"
                      value={cardExpiry}
                      onChange={(event) =>
                        setCardExpiry(event.target.value.replace(/[^\d/]/g, "").slice(0, 5))
                      }
                      placeholder="MM/YY"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-moss-800">CVV</span>
                    <input
                      className="field-input"
                      inputMode="numeric"
                      value={cardCvv}
                      onChange={(event) =>
                        setCardCvv(event.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="123"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className="primary-button"
              disabled={
                bookingSlotId === selectedSlot.id ||
                attendeeCount < 1 ||
                attendeeCount > selectedSlot.availableCapacity ||
                !phoneNumber.trim()
              }
              onClick={() => {
                void handleBook();
              }}
            >
              {bookingSlotId === selectedSlot.id
                ? "Booking..."
                : attendeeCount > selectedSlot.availableCapacity
                  ? "Not enough capacity"
                  : paymentMethod === "CARD"
                    ? "Make payment & book"
                    : "Confirm booking"}
            </button>
          </div>
        ) : (
          <EmptyBlock
            title="Step 3 unlocks after slot selection"
            description="Select a date, then click one of the available slots above to add people, payment details, and complete the booking."
          />
        )}

        <div className="rounded-3xl border border-moss-100 bg-moss-50 px-5 py-5">
          <p className="text-xs uppercase tracking-[0.18em] text-moss-600">Booking summary</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm text-moss-800">
              <span>Selected slot</span>
              <span className="font-semibold">
                {selectedSlot ? formatTime(selectedSlot.startTime) : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-moss-800">
              <span>Date</span>
              <span className="font-semibold">
                {selectedSlot ? formatDate(selectedSlot.slotDate) : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-moss-800">
              <span>Price per person</span>
              <span className="font-semibold">
                {selectedService ? formatCurrency(selectedService.priceCents) : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-moss-800">
              <span>People</span>
              <span className="font-semibold">{selectedSlot ? attendeeCount : "--"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-moss-800">
              <span>Capacity left</span>
              <span className="font-semibold">
                {selectedSlot ? selectedSlot.availableCapacity : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-moss-200 pt-3 text-sm text-ink">
              <span className="font-medium">Total payment</span>
              <span className="text-lg font-semibold">
                {selectedSlot ? formatCurrency(estimatedTotal) : "--"}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
