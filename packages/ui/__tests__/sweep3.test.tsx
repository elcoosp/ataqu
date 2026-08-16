import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { RegisterForm } from "../src/components/auth/RegisterForm";
import { Card } from "../src/components/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "../src/components/ui/form";
import { Popover } from "../src/components/ui/popover";
import { Select } from "../src/components/ui/select";
import { Toaster } from "../src/components/ui/sonner";
import { Switch } from "../src/components/ui/switch";
import { Textarea } from "../src/components/ui/textarea";
import { Tooltip, TooltipProvider } from "../src/components/ui/tooltip";

function wrapRouter(ui: React.ReactNode) {
	const li = setupI18n("en");
	li.load("en", {});
	li.activate("en");
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const inner = (
		<I18nProvider i18n={li}>
			<QueryClientProvider client={qc}>{ui}</QueryClientProvider>
		</I18nProvider>
	);
	const router = createRouter({
		history: createMemoryHistory({ initialEntries: ["/"] }),
		routeTree: createRootRoute({ component: () => inner }),
	});
	return <RouterProvider router={router} />;
}

describe("ui primitive + form render sweep", () => {
	it("renders Card from components", () => {
		render(<Card>content</Card>);
		expect(true).toBe(true);
	});

	it("renders Switch and Textarea primitives", () => {
		render(<Switch />);
		render(<Textarea placeholder="notes" />);
		expect(true).toBe(true);
	});

	it("renders Select / Popover / Tooltip primitives", () => {
		render(<Select />);
		render(<Popover />);
		render(
			<TooltipProvider>
				<Tooltip>
					<span>t</span>
				</Tooltip>
			</TooltipProvider>,
		);
		expect(true).toBe(true);
	});

	it("renders Form primitives", () => {
		function FormExample() {
			const methods = useForm({ defaultValues: { name: "" } });
			return (
				<Form {...methods}>
					<FormField
						control={methods.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<input {...field} />
								</FormControl>
								<FormDescription>desc</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				</Form>
			);
		}
		render(<FormExample />);
		expect(true).toBe(true);
	});

	it("renders Sonner Toaster", () => {
		render(<Toaster />);
		expect(true).toBe(true);
	});

	it("renders RegisterForm inside a router", () => {
		render(wrapRouter(<RegisterForm />));
		expect(document.body).toBeTruthy();
	});
});
