import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Accordion } from "../src/components/interior/accordion";
import { BlurUpImage } from "../src/components/interior/blur-up-image";
import { CollapsibleBanner } from "../src/components/interior/collapsible-banner";
import { ExpandingSearch } from "../src/components/interior/expanding-search";
import { FloatingLabelInput } from "../src/components/interior/floating-label-input";
import { IconMorph } from "../src/components/interior/icon-morph";
import { InlineValidation } from "../src/components/interior/inline-validation";
import { LikeBurst } from "../src/components/interior/like-burst";
import { LiveActivity } from "../src/components/interior/live-activity";
import { LogoMarquee } from "../src/components/interior/logo-marquee";
import { LongPressButton } from "../src/components/interior/long-press";
import { NewItemsPill } from "../src/components/interior/new-items-pill";
import { Pagination } from "../src/components/interior/pagination";
import { PasswordStrength } from "../src/components/interior/password-strength";
import { PollResults } from "../src/components/interior/poll-results";
import { PresenceAvatars } from "../src/components/interior/presence-avatars";
import { PressDepth } from "../src/components/interior/press-depth";
import { ProgressBar } from "../src/components/interior/progress-bar";
import { ReadingProgress } from "../src/components/interior/reading-progress";
import { ReorderList } from "../src/components/interior/reorder-list";
import { Ripple } from "../src/components/interior/ripple";
import { ScrollSpy } from "../src/components/interior/scroll-spy";
import { SegmentedControl } from "../src/components/interior/segmented-control";
import { SkeletonSwap } from "../src/components/interior/skeleton-swap";
import { SliderDetents } from "../src/components/interior/slider-detents";
import { SnapCarousel } from "../src/components/interior/snap-carousel";
import { StickyHeader } from "../src/components/interior/sticky-header";
import { StreamingText } from "../src/components/interior/streaming-text";
import { SwipeDeck } from "../src/components/interior/swipe-deck";
import { Tabs } from "../src/components/interior/tabs";
import { TextReveal } from "../src/components/interior/text-reveal";
import { TreeView } from "../src/components/interior/tree-view";
import { TypingIndicator } from "../src/components/interior/typing-indicator";
import { ValueFlash } from "../src/components/interior/value-flash";
import { WizardSteps } from "../src/components/interior/wizard-steps";
import { Providers } from "./helpers";

const GIF =
	"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

describe("ui render sweep 6 (interior batch 1)", () => {
	it("renders Accordion", () => {
		render(
			<Providers>
				<Accordion items={[{ id: "a", title: "A", content: "body" }]} />
			</Providers>,
		);
		expect(screen.getByText("body")).toBeTruthy();
	});

	it("renders BlurUpImage", () => {
		render(
			<Providers>
				<BlurUpImage alt="x" width={100} height={100} src={GIF} />
			</Providers>,
		);
		expect(document.querySelector("img")).toBeTruthy();
	});

	it("renders CollapsibleBanner", () => {
		render(
			<Providers>
				<CollapsibleBanner title="Notice" />
			</Providers>,
		);
		expect(screen.getByText("Notice")).toBeTruthy();
	});

	it("renders ExpandingSearch", () => {
		render(
			<Providers>
				<ExpandingSearch />
			</Providers>,
		);
		expect(screen.getByRole("searchbox")).toBeTruthy();
	});

	it("renders FloatingLabelInput", () => {
		render(
			<Providers>
				<FloatingLabelInput label="Email" />
			</Providers>,
		);
		expect(screen.getByLabelText("Email")).toBeTruthy();
	});

	it("renders IconMorph", () => {
		render(
			<Providers>
				<IconMorph />
			</Providers>,
		);
		expect(document.querySelector("svg")).toBeTruthy();
	});

	it("renders InlineValidation", () => {
		render(
			<Providers>
				<InlineValidation
					label="Email"
					value="a@b.c"
					onChange={() => {}}
					validate={(v) => (v.includes("@") ? null : "bad email")}
				/>
			</Providers>,
		);
		expect(screen.getByLabelText("Email")).toBeTruthy();
	});

	it("renders LikeBurst", () => {
		render(
			<Providers>
				<LikeBurst />
			</Providers>,
		);
		expect(document.body).toBeTruthy();
	});

	it("renders LiveActivity", () => {
		render(
			<Providers>
				<LiveActivity activity={{ id: "1", title: "Deal", phase: "running" }} />
			</Providers>,
		);
		expect(screen.getAllByText("Deal").length).toBeGreaterThan(0);
	});

	it("renders LogoMarquee", () => {
		render(
			<Providers>
				<LogoMarquee items={[{ id: "1", label: "One" }]} />
			</Providers>,
		);
		expect(screen.getAllByText("One").length).toBeGreaterThan(0);
	});

	it("renders LongPressButton", () => {
		render(
			<Providers>
				<LongPressButton onLongPress={() => {}}>Press</LongPressButton>
			</Providers>,
		);
		expect(screen.getAllByText("Press").length).toBeGreaterThan(0);
	});

	it("renders NewItemsPill", () => {
		render(
			<Providers>
				<NewItemsPill count={5} onJump={() => {}} />
			</Providers>,
		);
		expect(document.body).toBeTruthy();
	});

	it("renders Pagination", () => {
		render(
			<Providers>
				<Pagination count={10} />
			</Providers>,
		);
		expect(document.body).toBeTruthy();
	});

	it("renders PasswordStrength", () => {
		render(
			<Providers>
				<PasswordStrength value="secret" />
			</Providers>,
		);
		expect(document.body).toBeTruthy();
	});

	it("renders PollResults", () => {
		render(
			<Providers>
				<PollResults options={[{ id: "a", label: "A", votes: 1 }]} label="Vote" />
			</Providers>,
		);
		expect(screen.getAllByText("A").length).toBeGreaterThan(0);
	});

	it("renders PresenceAvatars", () => {
		render(
			<Providers>
				<PresenceAvatars people={[{ id: "u1", name: "Ada", src: "" }]} />
			</Providers>,
		);
		expect(document.body).toBeTruthy();
	});

	it("renders PressDepth", () => {
		render(
			<Providers>
				<PressDepth>
					<span>click</span>
				</PressDepth>
			</Providers>,
		);
		expect(screen.getByText("click")).toBeTruthy();
	});

	it("renders ProgressBar determinate and indeterminate", () => {
		const { rerender } = render(
			<Providers>
				<ProgressBar value={50} />
			</Providers>,
		);
		expect(screen.getByRole("progressbar")).toBeTruthy();
		rerender(
			<Providers>
				<ProgressBar value={null} />
			</Providers>,
		);
		expect(screen.getByRole("progressbar")).toBeTruthy();
	});

	it("renders ReadingProgress", () => {
		render(
			<Providers>
				<ReadingProgress />
			</Providers>,
		);
		expect(screen.getByRole("progressbar")).toBeTruthy();
	});

	it("renders ReorderList", () => {
		render(
			<Providers>
				<ReorderList
					items={[{ id: "1", label: "One" }]}
					getId={(i) => i.id}
					getLabel={(i) => i.label}
					onReorder={() => {}}
					label="List"
				>
					{(item) => <span>{String(item.id)}</span>}
				</ReorderList>
			</Providers>,
		);
		expect(screen.getAllByText("One").length).toBeGreaterThan(0);
	});

	it("renders Ripple", () => {
		render(
			<Providers>
				<Ripple>
					<span>hit</span>
				</Ripple>
			</Providers>,
		);
		expect(screen.getByText("hit")).toBeTruthy();
	});

	it("renders ScrollSpy", () => {
		render(
			<Providers>
				<ScrollSpy sections={[{ id: "s1", label: "Sec" }]} label="Nav" />
			</Providers>,
		);
		expect(screen.getAllByText("Sec").length).toBeGreaterThan(0);
	});

	it("renders SegmentedControl", () => {
		render(
			<Providers>
				<SegmentedControl options={[{ value: "a", label: "A" }]} label="Mode" />
			</Providers>,
		);
		expect(screen.getAllByText("A").length).toBeGreaterThan(0);
	});

	it("renders SkeletonSwap ready both arms", () => {
		const { rerender } = render(
			<Providers>
				<SkeletonSwap ready={false}>
					<span>content</span>
				</SkeletonSwap>
			</Providers>,
		);
		rerender(
			<Providers>
				<SkeletonSwap ready={true}>
					<span>content</span>
				</SkeletonSwap>
			</Providers>,
		);
		expect(document.body).toBeTruthy();
	});

	it("renders SliderDetents", () => {
		render(
			<Providers>
				<SliderDetents value={50} onValueChange={() => {}} />
			</Providers>,
		);
		expect(screen.getByRole("slider")).toBeTruthy();
	});

	it("renders SnapCarousel", () => {
		render(
			<Providers>
				<SnapCarousel label="Carousel">
					<div>slide</div>
				</SnapCarousel>
			</Providers>,
		);
		expect(screen.getByText("slide")).toBeTruthy();
	});

	it("renders StickyHeader", () => {
		render(
			<Providers>
				<StickyHeader title="Header">
					<div>body</div>
				</StickyHeader>
			</Providers>,
		);
		expect(screen.getAllByText("Header").length).toBeGreaterThan(0);
	});

	it("renders StreamingText", () => {
		render(
			<Providers>
				<StreamingText text="hello world" autoStart={false} />
			</Providers>,
		);
		expect(document.body).toBeTruthy();
	});

	it("renders SwipeDeck", () => {
		render(
			<Providers>
				<SwipeDeck
					items={[{ id: "1" }]}
					itemKey={(i) => String(i.id)}
					itemLabel={(i) => String(i.id)}
				>
					{() => <div>card</div>}
				</SwipeDeck>
			</Providers>,
		);
		expect(screen.getByText("card")).toBeTruthy();
	});

	it("renders Tabs", () => {
		render(
			<Providers>
				<Tabs
					items={[{ value: "t", label: "Tab" }]}
					renderPanel={(v) => <span>{v}</span>}
				/>
			</Providers>,
		);
		expect(screen.getAllByText("Tab").length).toBeGreaterThan(0);
	});

	it("renders TextReveal", () => {
		render(
			<Providers>
				<TextReveal text="hello" />
			</Providers>,
		);
		expect(document.body).toBeTruthy();
	});

	it("renders TreeView", () => {
		render(
			<Providers>
				<TreeView nodes={[{ id: "n", label: "Node" }]} label="Tree" />
			</Providers>,
		);
		expect(screen.getByText("Node")).toBeTruthy();
	});

	it("renders TypingIndicator", () => {
		render(
			<Providers>
				<TypingIndicator typists={["Ada"]} />
			</Providers>,
		);
		expect(document.body).toBeTruthy();
	});

	it("renders ValueFlash", () => {
		render(
			<Providers>
				<ValueFlash value={42} />
			</Providers>,
		);
		expect(screen.getAllByText("42").length).toBeGreaterThan(0);
	});

	it("renders WizardSteps", () => {
		render(
			<Providers>
				<WizardSteps steps={[{ id: "s1", label: "One" }]} />
			</Providers>,
		);
		expect(screen.getAllByText("One").length).toBeGreaterThan(0);
	});
});