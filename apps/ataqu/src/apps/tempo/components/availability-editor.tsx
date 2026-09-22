import {
	type AvailabilitySlot,
	type EventType,
	useCreateAvailabilitySlot,
	useDeleteAvailabilitySlot,
	useListAvailabilitySlots,
	useListEventTypes,
} from "@ataqu/api-client";
import { useOptimisticMutation } from "@ataqu/shared-hooks";
import {
	formatDateMedium,
	formatTime,
	handleApiError,
} from "@ataqu/shared-utils";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Label,
	QueryBoundary,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTimezone } from "../hooks/use-timezone";

/** Default window: the next whole hour, one hour long. */
function defaultWindow(): { start: string; end: string } {
	const start = new Date();
	start.setMinutes(0, 0, 0);
	start.setHours(start.getHours() + 1);
	const end = new Date(start.getTime() + 60 * 60 * 1000);
	const hhmm = (d: Date) =>
		`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
	return { start: hhmm(start), end: hhmm(end) };
}

/** `2026-08-16` for `<input type="date">` in the browser's local calendar. */
function todayIso(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
		now.getDate(),
	).padStart(2, "0")}`;
}

/**
 * Combines a local `YYYY-MM-DD` + `HH:MM` into an RFC3339 **UTC** instant.
 *
 * The backend stores `DateTime<Utc>`, so the browser's local wall-clock time is
 * converted once, here, and every render path formats back with the shared
 * `format*` helpers (which render in the viewer's zone again).
 */
export function localDateTimeToIso(date: string, time: string): string | null {
	if (!date || !time) return null;
	const parsed = new Date(`${date}T${time}:00`);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed.toISOString();
}

/** Local-calendar day key used to group slots into day cards. */
export function dayKey(iso: string): string {
	const d = new Date(iso);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
		d.getDate(),
	).padStart(2, "0")}`;
}

/** Chronological, day-bucketed slot list (exported for direct testing). */
export function groupSlotsByDay(
	slots: AvailabilitySlot[],
): Array<[string, AvailabilitySlot[]]> {
	const sorted = slots
		.slice()
		.sort(
			(a, b) =>
				new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
		);
	const byDay = new Map<string, AvailabilitySlot[]>();
	for (const slot of sorted) {
		const key = dayKey(slot.start_time);
		const bucket = byDay.get(key);
		if (bucket) bucket.push(slot);
		else byDay.set(key, [slot]);
	}
	return Array.from(byDay.entries());
}

interface AvailabilityEditorProps {
	/** Pre-selected event type (e.g. deep-linked from the event type page). */
	initialEventTypeId?: string;
}

type SlotCache = AvailabilitySlot[];

/**
 * TEMPO availability editor (brainstorm P0 §5.1-7, "the missing producer side").
 *
 * The public booking page and `BookingCalendar` both *read* availability
 * slots, and `POST/GET/DELETE /tempo/availability-slots` has existed since day
 * one — but nothing ever called the write endpoints, so every booking surface
 * was provably empty. This is that missing screen.
 */
export function AvailabilityEditor({
	initialEventTypeId,
}: AvailabilityEditorProps) {
	const eventTypesQuery = useListEventTypes({ limit: 100 });
	const eventTypes: EventType[] = eventTypesQuery.data?.items ?? [];

	const [selectedId, setSelectedId] = useState<string | undefined>(
		initialEventTypeId,
	);
	// Fall back to the first event type once the list resolves, without an
	// effect: an explicit selection always wins while it still exists.
	const activeId =
		selectedId && eventTypes.some((et) => et.id === selectedId)
			? selectedId
			: eventTypes[0]?.id;

	const timezone = useTimezone();
	const slotsQuery = useListAvailabilitySlots(activeId ?? "", {
		enabled: Boolean(activeId),
	});

	const createSlot = useCreateAvailabilitySlot();
	const deleteSlot = useDeleteAvailabilitySlot();

	const defaults = useMemo(defaultWindow, []);
	const [date, setDate] = useState(todayIso);
	const [startTime, setStartTime] = useState(defaults.start);
	const [endTime, setEndTime] = useState(defaults.end);
	const [repeatWeeks, setRepeatWeeks] = useState(1);

	// Optimistic delete: the row disappears immediately and comes back if the
	// server rejects the call — the P1-1 kit's whole point.
	const removeSlot = useOptimisticMutation<void, SlotCache, string>({
		listQueryKey: ["tempo", "availability-slots", activeId],
		optimisticUpdate: (old, slotId) => old.filter((s) => s.id !== slotId),
		mutationFn: (slotId) => deleteSlot.mutateAsync(slotId),
		onError: (error) => toast.error(handleApiError(error)),
		onSuccess: () => toast.success(t`Slot removed.`),
	});

	const handleCreate = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!activeId) {
				toast.error(t`Create an event type first.`);
				return;
			}
			const start = localDateTimeToIso(date, startTime);
			const end = localDateTimeToIso(date, endTime);
			if (!start || !end) {
				toast.error(t`Pick a valid date and time.`);
				return;
			}
			if (new Date(end) <= new Date(start)) {
				toast.error(t`The end time must be after the start time.`);
				return;
			}

			const weeks = Math.min(Math.max(repeatWeeks, 1), 12);
			try {
				// Sequential on purpose: on a partial failure the user must not
				// have to guess which of N parallel requests landed.
				for (let week = 0; week < weeks; week++) {
					const offset = week * 7 * 24 * 60 * 60 * 1000;
					await createSlot.mutateAsync({
						event_type_id: activeId,
						start_time: new Date(
							new Date(start).getTime() + offset,
						).toISOString(),
						end_time: new Date(new Date(end).getTime() + offset).toISOString(),
					});
				}
				toast.success(weeks > 1 ? t`${weeks} slots added.` : t`Slot added.`);
				await slotsQuery.refetch();
			} catch (error) {
				toast.error(handleApiError(error));
			}
		},
		[activeId, createSlot, date, endTime, repeatWeeks, slotsQuery, startTime],
	);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Event type</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<QueryBoundary
						query={eventTypesQuery}
						emptyTitle={t`No event types yet`}
						emptyDescription={t`Availability belongs to an event type. Create one first, then share its booking link.`}
					>
						{() => (
							<div
								className="flex flex-wrap gap-2"
								role="radiogroup"
								aria-label={t`Event type`}
							>
								{eventTypes.map((eventType) => {
									const active = eventType.id === activeId;
									return (
										<Button
											key={eventType.id}
											type="button"
											variant={active ? "default" : "outline"}
											size="sm"
											role="radio"
											aria-checked={active}
											onClick={() => setSelectedId(eventType.id)}
										>
											{eventType.name}
											<span className="ml-2 font-mono text-xs">
												{eventType.duration_minutes}m
											</span>
										</Button>
									);
								})}
							</div>
						)}
					</QueryBoundary>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Add availability</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
						onSubmit={handleCreate}
					>
						<div className="space-y-1">
							<Label htmlFor="availability-date">
								<Trans>Date</Trans>
							</Label>
							<Input
								id="availability-date"
								type="date"
								value={date}
								required
								onChange={(e) => setDate(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="availability-start">
								<Trans>Start</Trans>
							</Label>
							<Input
								id="availability-start"
								type="time"
								value={startTime}
								required
								onChange={(e) => setStartTime(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="availability-end">
								<Trans>End</Trans>
							</Label>
							<Input
								id="availability-end"
								type="time"
								value={endTime}
								required
								onChange={(e) => setEndTime(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="availability-repeat">
								<Trans>Repeat weekly</Trans>
							</Label>
							<Input
								id="availability-repeat"
								type="number"
								min={1}
								max={12}
								value={repeatWeeks}
								onChange={(e) => setRepeatWeeks(Number(e.target.value) || 1)}
							/>
						</div>
						<div className="flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
							<p className="text-xs text-muted-foreground">
								<Trans>Times are entered in {timezone} and stored as UTC.</Trans>
							</p>
							<Button type="submit" disabled={createSlot.isPending || !activeId}>
								<Plus className="mr-2 h-4 w-4" aria-hidden="true" />
								{createSlot.isPending ? (
									<Trans>Adding...</Trans>
								) : (
									<Trans>Add slot</Trans>
								)}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<QueryBoundary
				query={slotsQuery}
				emptyTitle={t`No availability yet`}
				emptyDescription={t`Add a slot above: the public booking page serves exactly these times.`}
				emptyAction={
					<span className="flex items-center gap-2 text-xs text-muted-foreground">
						<CalendarClock className="h-4 w-4" aria-hidden="true" />
						<Trans>Bookings can only land on a published slot.</Trans>
					</span>
				}
			>
				{(slots) => (
					<div className="space-y-4">
						{groupSlotsByDay(slots).map(([day, daySlots]) => (
							<div key={day} className="ataqu-glass rounded-lg p-4">
								<h3 className="mb-3 font-heading text-sm font-semibold text-foreground">
									{formatDateMedium(day)}
								</h3>
								<ul className="space-y-2">
									{daySlots.map((slot) => (
										<li
											key={slot.id}
											className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
										>
											<span className="font-mono text-xs text-foreground">
												{formatTime(slot.start_time)} –{" "}
												{formatTime(slot.end_time)}
											</span>
											<span className="flex items-center gap-2">
												{slot.is_booked && (
													<Badge variant="secondary">
														<Trans>Booked</Trans>
													</Badge>
												)}
												<Button
													type="button"
													variant="ghost"
													size="sm"
													aria-label={
														slot.is_booked
															? t`A booked slot cannot be removed`
															: t`Remove slot`
													}
													disabled={slot.is_booked || removeSlot.isPending}
													onClick={() => removeSlot.mutate(slot.id)}
												>
													<Trash2
														className="h-4 w-4 text-destructive"
														aria-hidden="true"
													/>
												</Button>
											</span>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				)}
			</QueryBoundary>
		</div>
	);
}

