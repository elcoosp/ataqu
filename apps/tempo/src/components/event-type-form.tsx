import type { EventType } from "@ataqu/api-client";
import { useCreateEventType, useUpdateEventType } from "@ataqu/api-client";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import type React from "react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface EventTypeFormProps {
	eventType?: EventType;
	onSuccess?: () => void;
}

export function EventTypeForm({ eventType, onSuccess }: EventTypeFormProps) {
	const createMutation = useCreateEventType();
	const updateMutation = useUpdateEventType();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [name, setName] = useState(eventType?.name ?? "");
	const [durationMinutes, setDurationMinutes] = useState(
		eventType?.duration_minutes ?? 30,
	);
	const [description, setDescription] = useState(eventType?.description ?? "");
	const [location, setLocation] = useState("");
	const [kind, setKind] = useState<"1:1" | "group">("1:1");
	const [bufferBefore, setBufferBefore] = useState(0);
	const [bufferAfter, setBufferAfter] = useState(0);
	const [emailReminder, setEmailReminder] = useState(false);
	const [smsReminder, setSmsReminder] = useState(false);
	const [reminderTime, setReminderTime] = useState("60");
	const [invitationTemplate, setInvitationTemplate] = useState("");
	const [reminderTemplate, setReminderTemplate] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		setIsSubmitting(true);
		try {
			const slug = name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");

			const payload = {
				name: name.trim(),
				slug,
				description: description || undefined,
				duration_minutes: durationMinutes,
			};

			if (eventType) {
				await updateMutation.mutateAsync({
					id: eventType.id,
					data: payload,
					version: eventType.version,
				});
				toast.success("Event type updated.");
			} else {
				await createMutation.mutateAsync(payload);
				toast.success("Event type created.");
			}
			onSuccess?.();
		} catch {
			toast.error("Failed to save event type.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Basic Information</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<Label htmlFor="et-name">
							<Trans>Name</Trans>
						</Label>
						<Input
							id="et-name"
							value={name}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setName(e.target.value)
							}
							required
						/>
					</div>
					<div>
						<Label htmlFor="et-duration">
							<Trans>Duration</Trans>
						</Label>
						<Select
							value={String(durationMinutes)}
							onValueChange={(v: string) => setDurationMinutes(Number(v))}
						>
							<SelectTrigger id="et-duration">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="15">
									<Trans>15 minutes</Trans>
								</SelectItem>
								<SelectItem value="30">
									<Trans>30 minutes</Trans>
								</SelectItem>
								<SelectItem value="60">
									<Trans>60 minutes</Trans>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label htmlFor="et-desc">
							<Trans>Description</Trans>
						</Label>
						<Textarea
							id="et-desc"
							value={description}
							onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
								setDescription(e.target.value)
							}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Event Type</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<Label>
							<Trans>Type</Trans>
						</Label>
						<Select
							value={kind}
							onValueChange={(v: string) => setKind(v as "1:1" | "group")}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="1:1">
									<Trans>1:1</Trans>
								</SelectItem>
								<SelectItem value="group">
									<Trans>Group</Trans>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label htmlFor="et-location">
							<Trans>Location (video/link)</Trans>
						</Label>
						<Input
							id="et-location"
							value={location}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setLocation(e.target.value)
							}
							placeholder="https://meet.ataqu.com/..."
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Availability</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="et-buffer-before">
								<Trans>Buffer before (min)</Trans>
							</Label>
							<Input
								id="et-buffer-before"
								type="number"
								min={0}
								value={bufferBefore}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setBufferBefore(Number(e.target.value))
								}
							/>
						</div>
						<div>
							<Label htmlFor="et-buffer-after">
								<Trans>Buffer after (min)</Trans>
							</Label>
							<Input
								id="et-buffer-after"
								type="number"
								min={0}
								value={bufferAfter}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setBufferAfter(Number(e.target.value))
								}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Reminders</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<Label htmlFor="et-email-reminder">
							<Trans>Email reminder</Trans>
						</Label>
						<Switch
							id="et-email-reminder"
							checked={emailReminder}
							onCheckedChange={setEmailReminder}
						/>
					</div>
					<div className="flex items-center justify-between">
						<Label htmlFor="et-sms-reminder">
							<Trans>SMS reminder</Trans>
						</Label>
						<Switch
							id="et-sms-reminder"
							checked={smsReminder}
							onCheckedChange={setSmsReminder}
						/>
					</div>
					<div>
						<Label>
							<Trans>Reminder time</Trans>
						</Label>
						<Select value={reminderTime} onValueChange={setReminderTime}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="15">
									<Trans>15 minutes before</Trans>
								</SelectItem>
								<SelectItem value="60">
									<Trans>1 hour before</Trans>
								</SelectItem>
								<SelectItem value="1440">
									<Trans>1 day before</Trans>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Custom Emails</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<Label htmlFor="et-invite-tpl">
							<Trans>Invitation template</Trans>
						</Label>
						<Textarea
							id="et-invite-tpl"
							value={invitationTemplate}
							onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
								setInvitationTemplate(e.target.value)
							}
							placeholder="Hi {name}, your meeting is on {date} at {time}."
						/>
						<p className="text-xs text-muted-foreground mt-1">
							<Trans>
								Variables: {"{name}"}, {"{date}"}, {"{time}"}
							</Trans>
						</p>
					</div>
					<div>
						<Label htmlFor="et-reminder-tpl">
							<Trans>Reminder template</Trans>
						</Label>
						<Textarea
							id="et-reminder-tpl"
							value={reminderTemplate}
							onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
								setReminderTemplate(e.target.value)
							}
							placeholder="Reminder: meeting with {name} on {date} at {time}."
						/>
					</div>
				</CardContent>
			</Card>

			<Button type="submit" disabled={isSubmitting}>
				{isSubmitting ? (
					<Trans>Saving...</Trans>
				) : (
					<Trans>Save Event Type</Trans>
				)}
			</Button>
		</form>
	);
}
