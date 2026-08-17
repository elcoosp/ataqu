"use client";

import { Trans } from "@lingui/react/macro";
import { useRef, useState } from "react";
import {
	FilterGrid,
	HideOnScroll,
	IPopover,
	ITooltip,
	ITooltipGroup,
	LoadMore,
	LongPressButton,
	OtpInput,
	PollResults,
	ReadingProgress,
	ReorderList,
	ScrollSpy,
	SortableTable,
	StickyHeader,
	StreamingText,
	SwipeDeck,
	Tooltip,
	WizardSteps,
} from "@ataqu/ui";

type AppItem = { id: string; name: string; tier: "free" | "pro" | "suite" };

const APPS: AppItem[] = [
	{ id: "cinq", name: "CINQ", tier: "free" },
	{ id: "pivot", name: "PIVOT", tier: "free" },
	{ id: "dial", name: "DIAL", tier: "pro" },
	{ id: "spark", name: "SPARK", tier: "pro" },
	{ id: "vault", name: "VAULT", tier: "suite" },
	{ id: "vista", name: "VISTA", tier: "suite" },
];

const APP_FILTERS = [
	{ id: "all", label: "All", match: () => true },
	{ id: "free", label: "Free", match: (a: AppItem) => a.tier === "free" },
	{ id: "pro", label: "Pro", match: (a: AppItem) => a.tier === "pro" },
	{ id: "suite", label: "Suite", match: (a: AppItem) => a.tier === "suite" },
];

type PriceRow = { id: string; plan: string; price: number; seats: number };
const PRICES: PriceRow[] = [
	{ id: "single", plan: "Single app", price: 15, seats: 1 },
	{ id: "five", plan: "5 apps", price: 39, seats: 5 },
	{ id: "ten", plan: "All 10", price: 79, seats: 10 },
];

const POLL_OPTIONS = [
	{ id: "price", label: "Pricing", votes: 42 },
	{ id: "lockin", label: "No lock-in", votes: 31 },
	{ id: "native", label: "Native suite", votes: 27 },
];

const WIZARD = [
	{ id: "signup", label: "Sign up", content: <Trans>Create your workspace.</Trans> },
	{ id: "pick", label: "Pick apps", content: <Trans>Choose the apps you need.</Trans> },
	{ id: "invite", label: "Invite team", content: <Trans>Bring your team along.</Trans> },
	{ id: "go", label: "Go live", content: <Trans>Start using Ataqu.</Trans> },
];

const SWIPE = [
	{ id: "t1", text: "Kill HubSpot" },
	{ id: "t2", text: "Kill Slack" },
	{ id: "t3", text: "Kill Notion" },
];

export function InteractiveDemo() {
	const [apps, setApps] = useState<AppItem[]>(APPS);
	const [loadCount, setLoadCount] = useState(1);
	const [vote, setVote] = useState<string | null>(null);
	const [wizardIndex, setWizardIndex] = useState(0);
	const [otp, setOtp] = useState("");
	const [deck, setDeck] = useState(SWIPE);
	const articleRef = useRef<HTMLElement | null>(null);

	return (
		<section className="space-y-16">
			<div id="interactive-intro">
				<h2 className="font-display text-3xl md:text-4xl font-bold text-center">
					<Trans>Built on interior.dev micro-interactions</Trans>
				</h2>
				<p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
					<Trans>
						Every control below is a real, accessible component from the
						interior.dev library — wired into Ataqu, not faked.
					</Trans>
				</p>
			</div>

			{/* StickyHeader */}
			<StickyHeader title={String(<Trans>Compare plans</Trans>)}>
				<Trans>Sticky, condensing header that stays in view as you scroll.</Trans>
			</StickyHeader>

			{/* ScrollSpy + ReadingProgress */}
			<div className="grid gap-8 md:grid-cols-[200px_1fr]">
				<ScrollSpy
					sections={[
						{ id: "interactive-intro", label: "Intro" },
						{ id: "interactive-filter", label: "Filter" },
						{ id: "interactive-reorder", label: "Reorder" },
						{ id: "interactive-table", label: "Table" },
					]}
				/>
				<div>
					<ReadingProgress
						target={articleRef}
						label={String(<Trans>Article progress</Trans>)}
					/>
				</div>
			</div>

			{/* FilterGrid */}
			<div id="interactive-filter">
				<FilterGrid
					label={String(<Trans>Filter apps</Trans>)}
					items={apps}
					filters={APP_FILTERS}
					getKey={(a) => a.id}
					renderItem={(a) => (
						<div className="text-sm font-medium">{a.name}</div>
					)}
				/>
			</div>

			{/* ReorderList */}
			<div id="interactive-reorder">
				<ReorderList
					label={String(<Trans>Reorder your apps</Trans>)}
					items={apps}
					getId={(a) => a.id}
					getLabel={(a) => a.name}
					onReorder={(next) => setApps(next)}
				>
					{(a) => <span className="text-sm">{a.name}</span>}
				</ReorderList>
			</div>

			{/* SortableTable */}
			<div id="interactive-table">
				<SortableTable
					label={String(<Trans>Pricing</Trans>)}
					rows={PRICES}
					getRowId={(r) => r.id}
					columns={[
						{ id: "plan", header: "Plan", value: (r) => r.plan },
						{
							id: "price",
							header: "Price",
							numeric: true,
							value: (r) => r.price,
						},
						{
							id: "seats",
							header: "Seats",
							numeric: true,
							value: (r) => r.seats,
						},
					]}
				/>
			</div>

			{/* HideOnScroll */}
			<HideOnScroll
				bar={<div className="text-xs text-muted-foreground">Ataqu Suite</div>}
			>
				<div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
					<Trans>Scroll this section — the bar above hides and reveals.</Trans>
				</div>
			</HideOnScroll>

			{/* StreamingText */}
			<div className="rounded-lg border border-border p-6">
				<StreamingText text="Ataqu replaces HubSpot, Slack, and Notion with one native suite." />
			</div>

			{/* WizardSteps */}
			<WizardSteps
				steps={WIZARD}
				index={wizardIndex}
				onIndexChange={(i) => setWizardIndex(i)}
			/>

			{/* PollResults */}
			<PollResults
				options={POLL_OPTIONS}
				value={vote}
				onVote={(id) => setVote(id)}
				label={String(<Trans>Why are you interested?</Trans>)}
			/>

			{/* SwipeDeck */}
			<SwipeDeck
				items={deck}
				itemKey={(d) => d.id}
				itemLabel={(d) => d.text}
				onDecide={(d) => setDeck((prev) => prev.filter((x) => x.id !== d.id))}
			>
				{(d) => <div className="p-4 text-center">{d.text}</div>}
			</SwipeDeck>

			{/* OtpInput */}
			<div className="rounded-lg border border-border p-6">
				<OtpInput length={6} onChange={setOtp} defaultValue={otp} label={String(<Trans>Verification code</Trans>)} />
				<p className="mt-2 text-xs text-muted-foreground">
					<Trans>Entered: {otp || "—"}</Trans>
				</p>
			</div>

			{/* LongPressButton */}
			<LongPressButton onLongPress={() => alert("Confirmed!")}>
				<Trans>Long-press to confirm</Trans>
			</LongPressButton>

			{/* LoadMore */}
			<LoadMore
				onLoad={() => setLoadCount((c) => c + 1)}
				hasMore={loadCount < 5}
			/>
			<p className="text-xs text-muted-foreground">
				<Trans>Loaded batches: {loadCount}</Trans>
			</p>

			{/* IPopover + ITooltipGroup */}
			<div className="flex flex-wrap items-center gap-4">
				<IPopover
					trigger={<button className="rounded-md border border-border px-3 py-1.5 text-sm">Open popover</button>}
					label={String(<Trans>Popover</Trans>)}
				>
					<div className="p-3 text-sm">Popover content goes here.</div>
				</IPopover>
				<ITooltipGroup>
					<ITooltip label="Helpful tip">
						<button className="rounded-md border border-border px-3 py-1.5 text-sm">
							Hover me
						</button>
					</ITooltip>
					</ITooltipGroup>
			</div>
		</section>
	);
}
