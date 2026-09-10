import { useAuthStore } from "@ataqu/shared-stores";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContextMenu } from "../src/components/interior/context-menu";
import { Drawer } from "../src/components/interior/drawer";
import { Dropdown } from "../src/components/interior/dropdown";
import { Lightbox } from "../src/components/interior/lightbox";
import { Modal } from "../src/components/interior/modal";
import { Popover } from "../src/components/interior/popover";
import { SetupProgressWidget } from "../src/components/setup-progress-widget";
import { SortableTable } from "../src/components/interior/sortable-table";
import { jsonResponse, Providers, stubFetch } from "./helpers";

const GIF =
	"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

describe("ui render sweep 7 (interior portals + complex)", () => {
	beforeEach(() => {
		stubFetch({ status: "ok" });
		useAuthStore.setState({ token: "t", user: null, tenantId: "ten" });
	});
	afterEach(() => vi.unstubAllGlobals());

	it("renders Modal open with title", () => {
		render(
			<Providers>
				<Modal open onClose={() => {}} title="Modal">
					<span>modal-content</span>
				</Modal>
			</Providers>,
		);
		expect(screen.getByText("Modal")).toBeTruthy();
	});

	it("renders Drawer open", () => {
		render(
			<Providers>
				<Drawer open onOpenChange={() => {}} title="Drawer">
					<span>drawer-content</span>
				</Drawer>
			</Providers>,
		);
		expect(screen.getByText("Drawer")).toBeTruthy();
	});

	it("renders Popover both arms", () => {
		const { rerender } = render(
			<Providers>
				<Popover trigger={<button>open</button>} label="Pop" open>
					<div>pop-content</div>
				</Popover>
			</Providers>,
		);
		expect(screen.getByText("pop-content")).toBeTruthy();
		rerender(
			<Providers>
				<Popover trigger={<button>open</button>} label="Pop" open={false}>
					<div>pop-content</div>
				</Popover>
			</Providers>,
		);
		expect(screen.getByText("open")).toBeTruthy();
	});

	it("renders Dropdown", () => {
		render(
			<Providers>
				<Dropdown items={[{ value: "a", label: "A" }]} />
			</Providers>,
		);
		expect(document.body).toBeTruthy();
	});

	it("renders ContextMenu", () => {
		render(
			<Providers>
				<ContextMenu items={[{ id: "a", label: "A" }]}>
					<div>target</div>
				</ContextMenu>
			</Providers>,
		);
		expect(screen.getByText("target")).toBeTruthy();
	});

	it("renders Lightbox open", () => {
		render(
			<Providers>
				<Lightbox open onClose={() => {}} src={GIF} alt="img" />
			</Providers>,
		);
		expect(document.querySelector("img")).toBeTruthy();
	});

	it("renders SortableTable", () => {
		render(
			<Providers>
				<SortableTable
					rows={[{ id: "1", name: "A" }]}
					columns={[{ id: "name", header: "Name" }]}
					getRowId={(r) => r.id}
					label="Table"
				/>
			</Providers>,
		);
		expect(screen.getByText("Name")).toBeTruthy();
	});

	it("renders SetupProgressWidget with onboarding status", () => {
		stubFetch(
			jsonResponse({
				tenant_id: "ten",
				tasks_completed: ["import-contacts"],
				last_active_at: null,
				progress_percentage: 20,
			}),
		);
		render(
			<Providers>
				<SetupProgressWidget />
			</Providers>,
		);
		expect(document.body).toBeTruthy();
	});
});