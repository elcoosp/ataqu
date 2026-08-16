import {
	type Document,
	useDeactivateEmployee,
	useGetEmployee,
	useListEmployeeDocuments,
	useUpdateEmployee,
	useUploadDocument,
} from "@ataqu/api-client";
import { handleApiError } from "@ataqu/shared-utils";
import {
	Button,
	Card,
	Input,
	Skeleton,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

async function uploadFileToS3(employeeId: string, file: File): Promise<string> {
	const response = await fetch(
		`/api/pause/employees/${employeeId}/presigned-url`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ file_name: file.name, content_type: file.type }),
		},
	);

	if (!response.ok) {
		throw new Error("Failed to get presigned URL");
	}

	const { upload_url, file_url } = await response.json();

	const uploadResponse = await fetch(upload_url, {
		method: "PUT",
		body: file,
		headers: {
			"Content-Type": file.type,
		},
	});

	if (!uploadResponse.ok) {
		throw new Error("Failed to upload file to S3");
	}

	return file_url;
}

export function EmployeeDetail({ id }: { id: string }) {
	const { data: employee, isLoading } = useGetEmployee(id);
	const { data: documents, isLoading: docsLoading } =
		useListEmployeeDocuments(id);

	const uploadMutation = useUploadDocument({
		onSuccess: () => toast.success(t`Document uploaded.`),
		onError: (err) => toast.error(err.message || t`Failed to upload document.`),
	});

	const deactivateMutation = useDeactivateEmployee({
		onSuccess: () => {
			toast.success(t`Employee offboarded. AEGIS access revoked.`);
		},
		onError: () => toast.error(t`Failed to offboard employee.`),
	});

	const updateEmployee = useUpdateEmployee({
		onSuccess: () => {
			toast.success(t`Employee updated.`);
			setEditing(false);
		},
		onError: (err) => toast.error(handleApiError(err)),
	});
	const [editing, setEditing] = useState(false);
	const [fullName, setFullName] = useState("");
	const [jobTitle, setJobTitle] = useState("");
	const [department, setDepartment] = useState("");

	const startEdit = () => {
		if (!employee) return;
		setFullName(employee.full_name);
		setJobTitle(employee.job_title);
		setDepartment(employee.department ?? "");
		setEditing(true);
	};

	const save = () => {
		if (!employee) return;
		updateEmployee.mutate({
			id: employee.id,
			data: {
				full_name: fullName,
				job_title: jobTitle,
				department: department || null,
			},
			version: employee.version,
		});
	};

	if (isLoading || !employee) {
		return <Skeleton className="h-64 w-full" />;
	}

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const fileUrl = await uploadFileToS3(id, file);
			uploadMutation.mutate({
				employeeId: id,
				data: { file_name: file.name, file_url: fileUrl, doc_type: "contract" },
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t`Upload failed`);
		}
	};

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-6">
					<div className="h-24 w-24 rounded-full bg-amber/20 flex items-center justify-center text-amber font-bold text-4xl">
						{employee.full_name.charAt(0)}
					</div>
					<div>
						{editing ? (
							<div className="space-y-2">
								<Input
									value={fullName}
									onChange={(e) => setFullName(e.target.value)}
									placeholder={t`Full name`}
								/>
								<div className="flex gap-2">
									<Input
										value={jobTitle}
										onChange={(e) => setJobTitle(e.target.value)}
										placeholder={t`Job title`}
									/>
									<Input
										value={department}
										onChange={(e) => setDepartment(e.target.value)}
										placeholder={t`Department`}
									/>
								</div>
								<div className="flex gap-2">
									<Button onClick={save} disabled={updateEmployee.isPending}>
										<Trans>Save</Trans>
									</Button>
									<Button variant="ghost" onClick={() => setEditing(false)}>
										<Trans>Cancel</Trans>
									</Button>
								</div>
							</div>
						) : (
							<>
								<h1 className="text-3xl font-bold text-white">
									{employee.full_name}
								</h1>
								<p className="text-lg text-gray-400">{employee.job_title}</p>
								<p className="text-sm text-gray-500">
									{employee.email} | {employee.phone || t`No phone`}
								</p>
								<Button
									variant="outline"
									size="sm"
									className="mt-2"
									onClick={startEdit}
								>
									<Trans>Edit Profile</Trans>
								</Button>
							</>
						)}
					</div>
				</div>
				<Button
					variant="destructive"
					onClick={() => deactivateMutation.mutate(employee.id)}
					disabled={deactivateMutation.isPending}
				>
					<Trans>Offboard</Trans>
				</Button>
			</div>

			<Tabs defaultValue="leave">
				<TabsList>
					<TabsTrigger value="leave">
						<Trans>Leave Balance</Trans>
					</TabsTrigger>
					<TabsTrigger value="documents">
						<Trans>Documents</Trans>
					</TabsTrigger>
					<TabsTrigger value="onboarding">
						<Trans>Onboarding</Trans>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="leave">
					<Card className="p-6">
						<h3 className="text-xl font-semibold mb-4">
							<Trans>Leave Balance</Trans>
						</h3>
						<div className="grid grid-cols-3 gap-4">
							<div>
								<p className="text-sm text-gray-400">
									<Trans>Accrued</Trans>
								</p>
								<p className="text-2xl font-bold">
									<Trans>15d</Trans>
								</p>
							</div>
							<div>
								<p className="text-sm text-gray-400">
									<Trans>Used</Trans>
								</p>
								<p className="text-2xl font-bold">
									<Trans>5d</Trans>
								</p>
							</div>
							<div>
								<p className="text-sm text-gray-400">
									<Trans>Remaining</Trans>
								</p>
								<p className="text-2xl font-bold text-amber">
									<Trans>10d</Trans>
								</p>
							</div>
						</div>
					</Card>
				</TabsContent>

				<TabsContent value="documents">
					<Card className="p-6">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-xl font-semibold">
								<Trans>Documents</Trans>
							</h3>
							<label className="cursor-pointer">
								<input
									type="file"
									className="hidden"
									onChange={handleFileChange}
									disabled={uploadMutation.isPending}
								/>
								<Button
									variant="outline"
									asChild
									disabled={uploadMutation.isPending}
								>
									<span>
										<Upload className="h-4 w-4 mr-2" />{" "}
										{uploadMutation.isPending ? (
											<Trans>Uploading...</Trans>
										) : (
											<Trans>Upload Document</Trans>
										)}
									</span>
								</Button>
							</label>
						</div>
						{docsLoading ? (
							<Skeleton className="h-20 w-full" />
						) : documents && documents.length > 0 ? (
							<ul className="space-y-2">
								{documents.map((doc: Document) => (
									<li
										key={doc.id}
										className="flex items-center justify-between border-b border-gray-700 pb-2"
									>
										<span>{doc.file_name}</span>
										<span className="text-xs text-gray-400">
											{doc.doc_type}
										</span>
									</li>
								))}
							</ul>
						) : (
							<p className="text-gray-400">
								<Trans>No documents uploaded.</Trans>
							</p>
						)}
					</Card>
				</TabsContent>

				<TabsContent value="onboarding">
					<Card className="p-6">
						<h3 className="text-xl font-semibold mb-4">
							<Trans>Onboarding Checklist</Trans>
						</h3>
						<div className="space-y-2">
							{[
								t`Create account`,
								t`Sign contract`,
								t`Setup workspace`,
								t`Assign mentor`,
							].map((task) => (
								<div key={task} className="flex items-center space-x-2">
									<input
										type="checkbox"
										id={`task-${task}`}
										className="rounded border-gray-600 text-amber focus:ring-amber"
									/>
									<label htmlFor={`task-${task}`} className="text-gray-300">
										{task}
									</label>
								</div>
							))}
						</div>
						<div className="mt-4 w-full bg-gray-700 rounded-full h-2.5">
							<div
								className="bg-amber h-2.5 rounded-full"
								style={{ width: "50%" }}
							></div>
						</div>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
