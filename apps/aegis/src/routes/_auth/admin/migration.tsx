// apps/aegis/src/routes/_auth/admin/migration.tsx
import {
	type ImportRequest,
	type ParseResponse,
	useImportMigrationData,
	useParseMigrationFile,
} from "@ataqu/api-client";
import {
	Bone,
	Button,
	Card,
	CardContent,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

type TargetApp = "cinq" | "vault" | "pause";

const TARGET_FIELDS: Record<TargetApp, string[]> = {
	cinq: ["name", "email", "phone", "company", "custom:*"],
	vault: ["name", "description", "sku"],
	pause: ["full_name", "email", "job_title", "hire_date"],
};

export const Route = createFileRoute("/_auth/admin/migration")({
	component: MigrationWizard,
});

function MigrationWizard() {
	const fileRef = useRef<HTMLInputElement>(null);
	const [targetApp, setTargetApp] = useState<TargetApp>("cinq");
	const [rawContent, setRawContent] = useState<string | null>(null);
	const [format, setFormat] = useState<"csv" | "json">("csv");
	const [parse, setParse] = useState<ParseResponse | null>(null);
	const [mapping, setMapping] = useState<Record<string, string>>({});
	const [importedCount, setImportedCount] = useState<number | null>(null);

	const parseMut = useParseMigrationFile({
		onSuccess: (data) => setParse(data),
	});
	const importMut = useImportMigrationData({
		onSuccess: (res) => setImportedCount(res.imported),
	});

	const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const text = await file.text();
		const fmt: "csv" | "json" = file.name.endsWith(".json") ? "json" : "csv";
		setFormat(fmt);
		setRawContent(text);
		setParse(null);
		setMapping({});
		setImportedCount(null);
		parseMut.mutate({ file: btoa(text), format: fmt });
	};

	const runImport = () => {
		if (!parse) return;
		// Re-derive full rows from raw content client-side for the import payload.
		const rows = parseRows(rawContent ?? "", format);
		const payload: ImportRequest = {
			target_app: targetApp,
			mapping,
			data: rows,
		};
		importMut.mutate(payload);
	};

	return (
		<div className="p-6">
			<h1 className="mb-4 text-2xl font-heading">
				<Trans>Migration Wizard</Trans>
			</h1>

			<Card className="mb-4">
				<CardContent className="space-y-4 p-4">
					<div className="flex flex-wrap items-end gap-4">
						<div>
							<Label>
								<Trans>Target app</Trans>
							</Label>
							<Select
								value={targetApp}
								onValueChange={(v) => setTargetApp(v as TargetApp)}
							>
								<SelectTrigger className="w-40">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="cinq">CINQ (contacts)</SelectItem>
									<SelectItem value="vault">VAULT (products)</SelectItem>
									<SelectItem value="pause">PAUSE (employees)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Button onClick={() => fileRef.current?.click()}>
								<Trans>Choose file (CSV / JSON)</Trans>
							</Button>
							<input
								ref={fileRef}
								type="file"
								accept=".csv,.json"
								className="hidden"
								onChange={onFile}
							/>
						</div>
						{parseMut.isPending ? (
							<Bone
								loading
								name="migration-1"
								fallback={<div className="h-8 w-32" />}
							>
								{null}
							</Bone>
						) : null}
					</div>

					{parseMut.isError ? (
						<p className="text-sm text-red-500">
							<Trans>Failed to parse file.</Trans>
						</p>
					) : null}
				</CardContent>
			</Card>

			{parse ? (
				<Card className="mb-4">
					<CardContent className="space-y-4 p-4">
						<h2 className="font-medium">
							<Trans>Map columns</Trans>
						</h2>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>
										<Trans>Source column</Trans>
									</TableHead>
									<TableHead>
										<Trans>Target field</Trans>
									</TableHead>
									<TableHead>
										<Trans>Sample</Trans>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{parse.columns.map((col) => (
									<TableRow key={col}>
										<TableCell>{col}</TableCell>
										<TableCell>
											<Select
												value={mapping[col] ?? ""}
												onValueChange={(v) =>
													setMapping((m) => ({ ...m, [col]: v }))
												}
											>
												<SelectTrigger className="w-48">
													<SelectValue placeholder="—" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="">—</SelectItem>
													{TARGET_FIELDS[targetApp].map((f) => (
														<SelectItem key={f} value={f}>
															{f}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{parse.sample[0]?.[col] ?? ""}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						<div className="flex items-center gap-3">
							<Button onClick={runImport} disabled={importMut.isPending}>
								{importMut.isPending ? (
									<Trans>Importing...</Trans>
								) : (
									<Trans>Import</Trans>
								)}
							</Button>
							{importedCount !== null ? (
								<span className="text-sm text-muted-foreground">
									{importedCount} <Trans>records imported</Trans>
								</span>
							) : null}
						</div>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}

function parseRows(
	content: string,
	format: "csv" | "json",
): Record<string, string>[] {
	if (format === "json") {
		try {
			const data = JSON.parse(content) as Record<string, unknown>[];
			return data.map((row) =>
				Object.fromEntries(
					Object.entries(row).map(([k, v]) => [k, String(v ?? "")]),
				),
			);
		} catch {
			return [];
		}
	}
	// Minimal CSV parse (no quoting edge cases) sufficient for the wizard.
	const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
	if (lines.length < 2) return [];
	const headers = lines[0].split(",");
	return lines.slice(1).map((line) => {
		const cells = line.split(",");
		const obj: Record<string, string> = {};
		headers.forEach((h, i) => {
			obj[h] = cells[i] ?? "";
		});
		return obj;
	});
}
