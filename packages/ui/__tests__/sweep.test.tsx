import {
	AuthLayout,
	Avatar,
	AvatarFallback,
	Badge,
	BulkActionBar,
	Button,
	Card,
	ChangelogBell,
	Chart,
	Command,
	CommandPalette,
	DataTable,
	Dialog,
	DropdownMenu,
	EmptyState,
	FormBuilder,
	Input,
	KanbanBoard,
	Label,
	OnboardTour,
	Popover,
	Select,
	SelectionCheckbox,
	Skeleton,
	Table,
	Tabs,
	Tooltip,
} from "@ataqu/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../src/components/ui/checkbox";
import { RadioGroup as RadioGroupPrimitive } from "../src/components/ui/radio-group";
import { Slider as SliderPrimitive } from "../src/components/ui/slider";
import { TooltipProvider } from "../src/components/ui/tooltip";

const noop = () => {};

describe("ui component render sweep", () => {
	it("renders primitives", () => {
		render(<Button>Go</Button>);
		render(<Badge>new</Badge>);
		render(<Input placeholder="x" />);
		render(<Label>Label</Label>);
		render(<Skeleton />);
		render(
			<Card>
				<span>card</span>
			</Card>,
		);
		render(
			<Avatar>
				<AvatarFallback>AB</AvatarFallback>
			</Avatar>,
		);
		render(<Checkbox />);
		render(<SliderPrimitive />);
		render(
			<RadioGroupPrimitive>
				<span>a</span>
			</RadioGroupPrimitive>,
		);
		render(
			<Table>
				<tbody>
					<tr>
						<td>cell</td>
					</tr>
				</tbody>
			</Table>,
		);
		render(
			<Tabs>
				<span>t</span>
			</Tabs>,
		);
		render(
			<TooltipProvider>
				<Tooltip>
					<span>t</span>
				</Tooltip>
			</TooltipProvider>,
		);
		render(
			<Dialog>
				<span>d</span>
			</Dialog>,
		);
		render(
			<Popover>
				<span>p</span>
			</Popover>,
		);
		render(
			<DropdownMenu>
				<span>d</span>
			</DropdownMenu>,
		);
		render(
			<Command>
				<span>c</span>
			</Command>,
		);
		render(
			<Select>
				<span>s</span>
			</Select>,
		);
		expect(true).toBe(true);
	});

	it("renders layout & auth components", () => {
		render(
			<AuthLayout>
				<span>auth</span>
			</AuthLayout>,
		);
		render(
			<EmptyState
				title="Empty"
				description="Nothing here"
				ctaLabel="Add"
				onCtaClick={noop}
			/>,
		);
		render(<ChangelogBell />);
		render(<SelectionCheckbox scope="s" id="1" />);
		render(
			<BulkActionBar
				scope="s"
				actions={[{ id: "a", label: "Act", onClick: noop }]}
			/>,
		);
		expect(true).toBe(true);
	});

	it("renders data components", () => {
		const columns: ColumnDef<{ id: string }>[] = [
			{ accessorKey: "id", header: "ID" },
		];
		render(<DataTable columns={columns} data={[{ id: "1" }]} />);
		render(
			<FormBuilder
				fields={[
					{ id: "f", type: "text", label: "Name" },
					{ id: "e", type: "email", label: "Email" },
				]}
				onChange={noop}
			/>,
		);
		render(
			<KanbanBoard
				columns={[
					{ id: "c1", title: "To do", items: [{ id: "i1" }] },
					{ id: "c2", title: "Done", items: [] },
				]}
				onDragEnd={noop}
				renderItem={(item) => <span>{String(item.id)}</span>}
			/>,
		);
		render(
			<Chart
				type="bar"
				data={[{ month: "Jan", v: 1 }]}
				xAxisKey="month"
				series={[{ key: "v" }]}
			/>,
		);
		expect(true).toBe(true);
	});

	it("renders onboarding & command components", () => {
		render(
			<OnboardTour tourId="t1" steps={[{ target: "body", content: "hi" }]}>
				<span>child</span>
			</OnboardTour>,
		);
		render(<CommandPalette searchFn={async () => []} />);
		expect(true).toBe(true);
	});
});
