import { useCreateLeaveRequest } from "@ataqu/api-client";
import { Button, Input, Label, LoadingButton } from "@ataqu/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z
	.object({
		leave_type: z.enum(["annual", "sick", "personal", "unpaid"]),
		start_date: z.string().min(1, "Start date is required"),
		end_date: z.string().min(1, "End date is required"),
		reason: z.string().optional(),
	})
	.refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
		message: "End date must be after start date",
		path: ["end_date"],
	});

interface LeaveRequestFormProps {
	employeeId: string;
	onSuccess?: () => void;
	onClose?: () => void;
}

export function LeaveRequestForm({
	employeeId,
	onSuccess,
	onClose,
}: LeaveRequestFormProps) {
	const mutation = useCreateLeaveRequest({
		onSuccess: () => {
			toast.success(t`Leave requested.`);
			onSuccess?.();
			onClose?.();
		},
		onError: () => toast.error(t`Failed to request leave.`),
	});

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<z.infer<typeof schema>>({
		resolver: zodResolver(schema),
	});

	const onSubmit = (data: z.infer<typeof schema>) => {
		mutation.mutate({ employee_id: employeeId, ...data });
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div>
				<Label htmlFor="leave_type">
					<Trans>Leave Type</Trans>
				</Label>
				<select
					id="leave_type"
					className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					{...register("leave_type")}
				>
					<option value="annual">
						<Trans>Annual</Trans>
					</option>
					<option value="sick">
						<Trans>Sick</Trans>
					</option>
					<option value="personal">
						<Trans>Personal</Trans>
					</option>
					<option value="unpaid">
						<Trans>Unpaid</Trans>
					</option>
				</select>
			</div>
			<div>
				<Label htmlFor="start_date">
					<Trans>Start Date</Trans>
				</Label>
				<Input id="start_date" type="date" {...register("start_date")} />
				{errors.start_date && (
					<p className="text-red-500 text-sm">
						{errors.start_date.message?.toString()}
					</p>
				)}
			</div>
			<div>
				<Label htmlFor="end_date">
					<Trans>End Date</Trans>
				</Label>
				<Input id="end_date" type="date" {...register("end_date")} />
				{errors.end_date && (
					<p className="text-red-500 text-sm">
						{errors.end_date.message?.toString()}
					</p>
				)}
			</div>
			<div>
				<Label htmlFor="reason">
					<Trans>Reason</Trans>
				</Label>
				<textarea
					id="reason"
					className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base"
					{...register("reason")}
				/>
			</div>
			<LoadingButton
				onAction={() => {
					handleSubmit(onSubmit)();
				}}
				data-tour="request-leave"
				disabled={mutation.isPending}
			>
				Request Leave
			</LoadingButton>
		</form>
	);
}
