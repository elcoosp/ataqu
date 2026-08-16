import { useGetDeal, useUpdateDeal } from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import {
	Bone,
	Button,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ActivityTimeline } from "../components/activity-timeline";
import { CrossAppBadge } from "../components/cross-app-badge";
import { EmailTrackingTab } from "../components/email-tracking-tab";
import { IntegrationToggle } from "../components/integration-toggle";
import { TaskList } from "../components/task-list";

export const Route = createFileRoute("/_auth/deals/$id")({
	component: DealDetail,
});

function DealDetail() {
	const { id } = Route.useParams();
	const { data: deal, isLoading } = useGetDeal(id);
	const updateMutation = useUpdateDeal({
		onSuccess: () => toast.success(t`Deal updated`),
		onError: (err) => toast.error(handleApiError(err)),
	});

	const [editing, setEditing] = useState(false);
	const [title, setTitle] = useState("");
	const [amount, setAmount] = useState("");
	const [status, setStatus] = useState<"open" | "won" | "lost">("open");
	const [probability, setProbability] = useState("");

	if (isLoading)
		return (
			<Bone
				loading
				name="_auth-deals-$id-1"
				fallback={<div className="h-64 w-full" />}
			>
				{null}
			</Bone>
		);
	if (!deal)
		return (
			<div>
				<Trans>Deal not found</Trans>
			</div>
		);

	const startEdit = () => {
		setTitle(deal.title ?? "");
		setAmount(String(deal.amount ?? ""));
		setStatus(deal.status);
		setProbability(String(deal.probability ?? ""));
		setEditing(true);
	};

	const save = () => {
		updateMutation.mutate({
			id: deal.id,
			data: {
				title: title || null,
				amount: amount === "" ? null : Number(amount),
				status,
				probability: probability === "" ? null : Number(probability),
			},
			version: deal.version,
		});
		setEditing(false);
	};

	return (
		<div className="p-4">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold">{deal.title}</h1>
					<div className="flex gap-4 items-center flex-wrap">
						<span>${deal.amount.toLocaleString()}</span>
						<span className="capitalize">{deal.status}</span>
						<span>Prob: {deal.probability ?? "—"}%</span>
					</div>
				</div>
				{!editing && (
					<Button variant="outline" onClick={startEdit}>
						<Trans>Edit</Trans>
					</Button>
				)}
			</div>

			{editing && (
				<div className="mt-4 space-y-3 rounded-lg border border-border p-4">
					<div>
						<Label>
							<Trans>Title</Trans>
						</Label>
						<Input value={title} onChange={(e) => setTitle(e.target.value)} />
					</div>
					<div>
						<Label>
							<Trans>Amount</Trans>
						</Label>
						<Input
							type="number"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
						/>
					</div>
					<div>
						<Label>
							<Trans>Status</Trans>
						</Label>
						<Select
							value={status}
							onValueChange={(v) => setStatus(v as "open" | "won" | "lost")}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="open">
									<Trans>Open</Trans>
								</SelectItem>
								<SelectItem value="won">
									<Trans>Won</Trans>
								</SelectItem>
								<SelectItem value="lost">
									<Trans>Lost</Trans>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>
							<Trans>Probability (%)</Trans>
						</Label>
						<Input
							type="number"
							value={probability}
							onChange={(e) => setProbability(e.target.value)}
						/>
					</div>
					<div className="flex gap-2">
						<Button onClick={save} disabled={updateMutation.isPending}>
							<Trans>Save</Trans>
						</Button>
						<Button variant="ghost" onClick={() => setEditing(false)}>
							<Trans>Cancel</Trans>
						</Button>
					</div>
				</div>
			)}

			<div className="flex gap-4 items-center flex-wrap mt-4">
				<CrossAppBadge entityId={id} />
				<IntegrationToggle
					dealId={id}
					targetApp="dial"
					label={<Trans>Create DIAL channel on won</Trans>}
				/>
				<IntegrationToggle
					dealId={id}
					targetApp="spark"
					label={<Trans>Trigger SPARK workflow on won</Trans>}
				/>
			</div>

			<Tabs defaultValue="activities" className="mt-4">
				<TabsList>
					<TabsTrigger value="activities">
						<Trans>Activities</Trans>
					</TabsTrigger>
					<TabsTrigger value="tasks">
						<Trans>Tasks</Trans>
					</TabsTrigger>
					<TabsTrigger value="tracking">
						<Trans>Email Tracking</Trans>
					</TabsTrigger>
				</TabsList>
				<TabsContent value="activities">
					<ActivityTimeline dealId={id} />
				</TabsContent>
				<TabsContent value="tasks">
					<TaskList />
				</TabsContent>
				<TabsContent value="tracking">
					<EmailTrackingTab contactId={deal.contact_id} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
