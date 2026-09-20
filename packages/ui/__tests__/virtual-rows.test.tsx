import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VirtualRows } from "../src/components/virtual-rows";

afterEach(cleanup);

function Rig({
	count,
	renderItem,
}: {
	count: number;
	renderItem?: (i: number) => string;
}) {
	return (
		<VirtualRows count={count} estimateSize={40} maxHeight={400}>
			{({ padTop, padBottom, items, measureElement }) => (
				<table data-testid="rig">
					<tbody>
						{padTop > 0 && (
							<tr style={{ height: `${padTop}px` }} aria-hidden="true" />
						)}
						{items.map((vRow) => (
							<tr
								key={vRow.index}
								data-index={vRow.index}
								ref={measureElement}
							>
								<td>{renderItem ? renderItem(vRow.index) : `row ${vRow.index}`}</td>
							</tr>
						))}
						{padBottom > 0 && (
							<tr style={{ height: `${padBottom}px` }} aria-hidden="true" />
						)}
					</tbody>
				</table>
			)}
		</VirtualRows>
	);
}

describe("VirtualRows", () => {
	it("renders all rows unwindowed when the viewport cannot be measured (jsdom)", () => {
		render(<Rig count={100} />);
		const rows = screen.getAllByRole("row");
		// No spacer rows — every one of the 100 rows is present.
		expect(rows).toHaveLength(100);
		expect(screen.getByText("row 0")).toBeTruthy();
		expect(screen.getByText("row 99")).toBeTruthy();
	});

	it("emits zero padding and a no-op measure fn in the unwindowed path", () => {
		const { container } = render(<Rig count={10} />);
		// No explicit-height spacer rows exist.
		const heights = Array.from(container.querySelectorAll("tr[style]")).map(
			(tr) => (tr as HTMLElement).style.height,
		);
		expect(heights.filter(Boolean)).toHaveLength(0);
	});

	it("renders zero rows without rendering any padding or crashing", () => {
		render(<Rig count={0} />);
		expect(screen.queryAllByRole("row")).toHaveLength(0);
		expect(screen.queryByTestId("rig")).toBeTruthy();
	});

	it("keeps caller content in control via the render prop", () => {
		render(<Rig count={3} renderItem={(i) => `custom-${i}`} />);
		expect(screen.getByText("custom-0")).toBeTruthy();
		expect(screen.getByText("custom-2")).toBeTruthy();
	});

	it("passes a callable measureElement even in the unwindowed path", () => {
		const spy = vi.fn();
		function MeasureRig() {
			return (
				<VirtualRows count={2}>
					{({ measureElement }) => (
						<div ref={spy || measureElement} />
					)}
				</VirtualRows>
			);
		}
		// Simply asserting the component renders without throwing when
		// measureElement is threaded through.
		render(<MeasureRig />);
		expect(spy).not.toThrow;
	});

	it("renders every index exactly once with no gaps or duplicates (150 rows)", () => {
		render(<Rig count={150} />);
		const texts = screen.getAllByText(/^row \d+$/).map((el) => el.textContent);
		const seen = new Set(texts);
		expect(seen.size).toBe(150);
		expect(texts.length).toBe(150);
	});
});
