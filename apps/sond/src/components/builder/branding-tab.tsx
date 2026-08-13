import {
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ataqu/ui";
import { Trans } from "@lingui/macro";
import { useId } from "react";
import type { SondBranding } from "./types";

interface Props {
	branding: SondBranding;
	onUpdate: (updates: Partial<SondBranding>) => void;
}

export function BrandingTab({ branding, onUpdate }: Props) {
	const colorId = useId();
	const logoId = useId();
	const fontId = useId();

	return (
		<div className="space-y-6 p-4">
			<div>
				<label htmlFor={colorId} className="mb-2 block text-sm font-medium">
					<Trans>Primary Color</Trans>
				</label>
				<Input
					id={colorId}
					type="color"
					value={branding.primaryColor || "#f59e0b"}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ primaryColor: e.target.value })}
					className="h-10 w-20 p-1"
				/>
			</div>
			<div>
				<label htmlFor={logoId} className="mb-2 block text-sm font-medium">
					<Trans>Logo URL</Trans>
				</label>
				<Input
					id={logoId}
					value={branding.logoUrl || ""}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ logoUrl: e.target.value })}
					placeholder="https://example.com/logo.png"
				/>
			</div>
			<div>
				<label htmlFor={fontId} className="mb-2 block text-sm font-medium">
					<Trans>Font Family</Trans>
				</label>
				<Select
					value={branding.fontFamily || "inter"}
					onValueChange={(v: "inter" | "jetbrains") =>
						onUpdate({ fontFamily: v })
					}
				>
					<SelectTrigger id={fontId}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="inter">Inter</SelectItem>
						<SelectItem value="jetbrains">JetBrains Mono</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
