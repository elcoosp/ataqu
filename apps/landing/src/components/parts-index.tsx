"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

/**
 * Parts index — the ten apps as the schedule of parts on a drawing:
 * one ruled table, callout numbers, no card grid.
 */

const PARTS = [
	{ id: "cinq", name: "CINQ", domain: "CRM", replaces: "HubSpot" },
	{
		id: "pivot",
		name: "PIVOT",
		domain: "Docs & databases",
		replaces: "Notion",
	},
	{
		id: "dial",
		name: "DIAL",
		domain: "Chat & support",
		replaces: "Slack + Intercom",
	},
	{ id: "spark", name: "SPARK", domain: "Automation", replaces: "Zapier" },
	{ id: "tempo", name: "TEMPO", domain: "Scheduling", replaces: "Calendly" },
	{ id: "sond", name: "SOND", domain: "Forms & surveys", replaces: "Typeform" },
	{ id: "vault", name: "VAULT", domain: "Inventory", replaces: "Cin7" },
	{ id: "pause", name: "PAUSE", domain: "HR & leave", replaces: "Personio" },
	{ id: "aegis", name: "AEGIS", domain: "SSO & security", replaces: "Okta" },
	{ id: "vista", name: "VISTA", domain: "Analytics & BI", replaces: "Tableau" },
];

function PartIcon({ id, name }: { id: string; name: string }) {
	const [imgError, setImgError] = useState(false);

	return (
		<span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-hairline-strong bg-paper">
			{!imgError ? (
				<Image
					src={`/apps/${id}.png`}
					alt=""
					width={36}
					height={36}
					className="h-full w-full object-cover"
					onError={() => setImgError(true)}
				/>
			) : (
				<span className="font-mono text-sm font-semibold text-redline-ink">
					{name.charAt(0)}
				</span>
			)}
		</span>
	);
}

function PartRow({ part, no }: { part: (typeof PARTS)[number]; no: number }) {
	return (
		<motion.div
			className="group border-b border-hairline last:border-b-0"
			initial="rest"
			whileHover="hover"
			variants={{
				rest: { backgroundColor: "rgba(0,0,0,0)" },
				hover: {
					backgroundColor: "var(--color-paper-raised)",
					transition: { duration: 0.15, ease: "easeOut" },
				},
			}}
		>
			<Link
				href={`/apps/${part.id}`}
				className="grid grid-cols-[2.5rem_1fr] items-center gap-x-3 px-3 py-4 sm:grid-cols-[3rem_1fr_1fr_auto] sm:gap-x-4 sm:px-4"
			>
				<span className="tnum font-mono text-xs text-ink-soft">
					{String(no).padStart(2, "0")}
				</span>
				<span className="flex items-center gap-3">
					<PartIcon id={part.id} name={part.name} />
					<span className="display text-base font-semibold tracking-tight text-ink-strong">
						{part.name}
					</span>
					<span className="hidden text-sm text-ink-soft md:inline">
						{part.domain}
					</span>
				</span>
				<span className="col-start-2 row-start-2 text-sm text-ink-soft md:col-auto md:row-auto">
					<span className="md:hidden">{part.domain} · </span>
					<span className="font-mono text-xs">
						REPLACES {part.replaces.toUpperCase()}
					</span>
				</span>
				<span
					aria-hidden="true"
					className="hidden text-ink-soft transition-all duration-150 group-hover:translate-x-1 group-hover:text-redline sm:block"
				>
					→
				</span>
			</Link>
		</motion.div>
	);
}

export function PartsIndex() {
	return (
		<div className="plate mt-10">
			<div className="meta hidden grid-cols-[3rem_1fr_1fr_auto] gap-x-4 border-b border-hairline-strong px-4 py-2.5 text-ink-soft sm:grid">
				<span>NO.</span>
				<span>APP / DOMAIN</span>
				<span>REPLACES</span>
				<span className="w-4" aria-hidden="true" />
			</div>
			{PARTS.map((part, i) => (
				<PartRow key={part.id} part={part} no={i + 1} />
			))}
		</div>
	);
}
