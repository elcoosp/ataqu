import type { UUID } from "@ataqu/types";
import type {
	UseMutationOptions,
	UseQueryOptions,
} from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type {
	AvailabilitySlot,
	Booking,
	CreateAvailabilitySlotRequest,
	CreateBookingRequest,
	CreateEventTypeRequest,
	EventType,
	PublicBookingRequest,
	RescheduleBookingRequest,
	UpdateEventTypeRequest,
} from "./types";

// ---- Event Types ----
export const listEventTypes = (params?: { limit?: number; offset?: number }) =>
	api.get<{ items: EventType[]; total: number; limit: number; offset: number }>(
		"/tempo/event-types",
		{ params },
	);
export const createEventType = (data: CreateEventTypeRequest) =>
	api.post<EventType>("/tempo/event-types", data);
export const getEventType = (id: UUID) =>
	api.get<EventType>(`/tempo/event-types/${id}`);
export const updateEventType = (id: UUID, data: UpdateEventTypeRequest) =>
	api.put<EventType>(`/tempo/event-types/${id}`, data);
export const deleteEventType = (id: UUID) =>
	api.delete<void>(`/tempo/event-types/${id}`);

// ---- Public Event Type ----
export const getPublicEventType = (tenantId: UUID, slug: string) =>
	api.get<EventType>(`/tempo/event-types/public/${tenantId}/${slug}`);

// ---- Availability Slots ----
export const listAvailabilitySlots = (eventTypeId: UUID) =>
	api.get<AvailabilitySlot[]>(`/tempo/availability-slots/${eventTypeId}`);
export const createAvailabilitySlot = (data: CreateAvailabilitySlotRequest) =>
	api.post<AvailabilitySlot>("/tempo/availability-slots", data);
export const deleteAvailabilitySlot = (id: UUID) =>
	api.delete<void>(`/tempo/availability-slots/${id}`);

// ---- Bookings ----
export const listBookings = (params?: { limit?: number; offset?: number }) =>
	api.get<{ items: Booking[]; total: number; limit: number; offset: number }>(
		"/tempo/bookings",
		{ params },
	);
export const createBooking = (data: CreateBookingRequest) =>
	api.post<Booking>("/tempo/bookings", data);
export const getBooking = (id: UUID) =>
	api.get<Booking>(`/tempo/bookings/${id}`);
export const cancelBooking = (id: UUID) =>
	api.post<Booking>(`/tempo/bookings/${id}/cancel`);
export const confirmBooking = (id: UUID) =>
	api.post<Booking>(`/tempo/bookings/${id}/confirm`);
export const rescheduleBooking = (id: UUID, data: RescheduleBookingRequest) =>
	api.post<Booking>(`/tempo/bookings/${id}/reschedule`, data);
export const bulkCancelBookings = (data: { ids: UUID[] }) =>
	api.post<void>("/tempo/bookings/bulk-cancel", data);

// ---- Public Booking ----
export const publicCreateBooking = (
	tenantId: UUID,
	data: PublicBookingRequest,
) => api.post<Booking>(`/tempo/public/${tenantId}/bookings`, data);

// ---- React Query hooks ----
export const useListEventTypes = (
	params?: { limit?: number; offset?: number },
	options?: UseQueryOptions<{
		items: EventType[];
		total: number;
		limit: number;
		offset: number;
	}>,
) =>
	useQuery({
		queryKey: ["tempo", "event-types", params],
		queryFn: () => listEventTypes(params),
		...options,
	});
export const useGetEventType = (
	id: UUID,
	options?: UseQueryOptions<EventType>,
) =>
	useQuery({
		queryKey: ["tempo", "event-type", id],
		queryFn: () => getEventType(id),
		...options,
	});
export const useGetPublicEventType = (
	tenantId: UUID,
	slug: string,
	options?: UseQueryOptions<EventType>,
) =>
	useQuery({
		queryKey: ["tempo", "public-event-type", tenantId, slug],
		queryFn: () => getPublicEventType(tenantId, slug),
		...options,
	});
export const useListAvailabilitySlots = (
	eventTypeId: UUID,
	options?: UseQueryOptions<AvailabilitySlot[]>,
) =>
	useQuery({
		queryKey: ["tempo", "availability-slots", eventTypeId],
		queryFn: () => listAvailabilitySlots(eventTypeId),
		...options,
	});
export const useListBookings = (
	params?: { limit?: number; offset?: number },
	options?: UseQueryOptions<{
		items: Booking[];
		total: number;
		limit: number;
		offset: number;
	}>,
) =>
	useQuery({
		queryKey: ["tempo", "bookings", params],
		queryFn: () => listBookings(params),
		...options,
	});
export const useGetBooking = (id: UUID, options?: UseQueryOptions<Booking>) =>
	useQuery({
		queryKey: ["tempo", "booking", id],
		queryFn: () => getBooking(id),
		...options,
	});

export const useCreateEventType = (
	options?: UseMutationOptions<EventType, Error, CreateEventTypeRequest>,
) => useMutation({ mutationFn: createEventType, ...options });
export const useUpdateEventType = (
	options?: UseMutationOptions<
		EventType,
		Error,
		{ id: UUID; data: UpdateEventTypeRequest }
	>,
) =>
	useMutation({
		mutationFn: ({ id, data }) => updateEventType(id, data),
		...options,
	});
export const useDeleteEventType = (
	options?: UseMutationOptions<void, Error, UUID>,
) => useMutation({ mutationFn: deleteEventType, ...options });

export const useCreateAvailabilitySlot = (
	options?: UseMutationOptions<
		AvailabilitySlot,
		Error,
		CreateAvailabilitySlotRequest
	>,
) => useMutation({ mutationFn: createAvailabilitySlot, ...options });
export const useDeleteAvailabilitySlot = (
	options?: UseMutationOptions<void, Error, UUID>,
) => useMutation({ mutationFn: deleteAvailabilitySlot, ...options });

export const useCreateBooking = (
	options?: UseMutationOptions<Booking, Error, CreateBookingRequest>,
) => useMutation({ mutationFn: createBooking, ...options });
export const useCancelBooking = (
	options?: UseMutationOptions<Booking, Error, UUID>,
) => useMutation({ mutationFn: cancelBooking, ...options });
export const useConfirmBooking = (
	options?: UseMutationOptions<Booking, Error, UUID>,
) => useMutation({ mutationFn: confirmBooking, ...options });
export const useRescheduleBooking = (
	options?: UseMutationOptions<
		Booking,
		Error,
		{ id: UUID; data: RescheduleBookingRequest }
	>,
) =>
	useMutation({
		mutationFn: ({ id, data }) => rescheduleBooking(id, data),
		...options,
	});
export const useBulkCancelBookings = (
	options?: UseMutationOptions<void, Error, { ids: UUID[] }>,
) => useMutation({ mutationFn: bulkCancelBookings, ...options });
export const usePublicCreateBooking = (
	options?: UseMutationOptions<
		Booking,
		Error,
		{ tenantId: UUID; data: PublicBookingRequest }
	>,
) =>
	useMutation({
		mutationFn: ({ tenantId, data }) => publicCreateBooking(tenantId, data),
		...options,
	});
