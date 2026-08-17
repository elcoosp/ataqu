// packages/ui/src/components/interior/index.ts
// interior.dev micro-interaction components vendored into @ataqu/ui.
// Source is the authoritative interior.dev registry (https://www.interior.dev/r/<slug>.json),
// fetched into this directory. Each component is a copy-paste implementation from
// interior.dev (single runtime dependency: motion).
//
// Names are aliased with an `I` prefix (e.g. ICommandPalette) to avoid collisions with
// ataq's own UI primitives (CommandPalette, Popover, Tabs, Tooltip, CommandItem) that
// already ship from @ataqu/ui. Apps can import both; interior.dev's versions are opted
// into explicitly by name.
export * from "./accordion";
export * from "./blur-up-image";
export * from "./collapsible-banner";
export type { CommandItem as ICommandItem } from "./command-palette";
// Aliased to avoid name clashes with ataq's own primitives.
export {
	CommandPalette as ICommandPalette,
	type CommandPaletteProps as ICommandPaletteProps,
} from "./command-palette";
export * from "./context-menu";
export * from "./copy-button";
export * from "./drawer";
export * from "./dropdown";
export * from "./expanding-search";
export * from "./filter-grid";
export * from "./floating-label-input";
export * from "./hide-on-scroll";
export * from "./hold-to-confirm";
export * from "./icon-morph";
export * from "./inline-validation";
export * from "./lightbox";
export * from "./like-burst";
export * from "./live-activity";
export * from "./load-more";
export * from "./loading-button";
export * from "./logo-marquee";
export * from "./long-press";
export {
	Modal as IModal,
	type ModalProps as IModalProps,
	type UseModalOptions as IUseModalOptions,
	type UseModalResult as IUseModalResult,
} from "./modal";
export * from "./new-items-pill";
export * from "./otp-input";
export * from "./pagination";
export * from "./password-strength";
export * from "./poll-results";
export {
	Popover as IPopover,
	type PopoverProps as IPopoverProps,
	type UsePopoverOptions as IUsePopoverOptions,
	type UsePopoverResult as IUsePopoverResult,
} from "./popover";
export * from "./presence-avatars";
export * from "./press-depth";
export * from "./progress-bar";
export * from "./reading-progress";
export * from "./reorder-list";
export * from "./ripple";
export * from "./scroll-spy";
export * from "./segmented-control";
export * from "./show-more";
export * from "./skeleton-swap";
export * from "./slider-detents";
export * from "./snap-carousel";
export * from "./sortable-table";
export * from "./sticky-header";
export * from "./streaming-text";
export * from "./swipe-deck";
export {
	Tabs as ITabs,
	type TabsProps as ITabsProps,
	type UseTabsOptions as IUseTabsOptions,
	type UseTabsReturn as IUseTabsReturn,
	useTabs as IUseTabs,
} from "./tabs";
export * from "./tag-input";
export * from "./task-steps";
export * from "./text-reveal";
export {
	Tooltip as ITooltip,
	TooltipGroup as ITooltipGroup,
	type TooltipGroupProps as ITooltipGroupProps,
	type TooltipProps as ITooltipProps,
	type UseTooltipOptions as IUseTooltipOptions,
	type UseTooltipReturn as IUseTooltipReturn,
	useTooltip as IUseTooltip,
} from "./tooltip-group";
export * from "./tree-view";
export * from "./typing-indicator";
export * from "./value-flash";
export * from "./wizard-steps";
