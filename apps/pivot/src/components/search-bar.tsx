import { searchDocuments } from "@ataqu/api-client";
import { useDebounce } from "@ataqu/shared-hooks";
import { cn, Input } from "@ataqu/ui";
import { i18n } from "@lingui/core";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon, X } from "lucide-react";
import { useState } from "react";

interface SearchBarProps {
	onResultClick?: (result: any) => void;
	className?: string;
}

export function SearchBar({ onResultClick, className }: SearchBarProps) {
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebounce(query, 200);
	const { data } = useQuery<any[]>({
		queryKey: ["search", debouncedQuery],
		queryFn: () => {
			if (!debouncedQuery || debouncedQuery.length < 2) return [];
			return searchDocuments({ q: debouncedQuery, limit: 20 });
		},
		enabled: debouncedQuery.length >= 2,
	});

	const handleClear = () => setQuery("");

	return (
		<div className={cn("relative", className)}>
			<div className="relative">
				<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					value={query}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setQuery(e.target.value)
					}
					placeholder={i18n._("Search documents, databases, rows…")}
					className="pl-9 pr-8 bg-background border-border"
				/>
				{query && (
					<button
						onClick={handleClear}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>
			{debouncedQuery.length >= 2 && data && data.length > 0 && (
				<div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
					{data.map((result: any) => (
						<button
							key={result.id}
							className="w-full text-left px-4 py-2 hover:bg-accent text-sm flex items-center gap-2"
							onClick={() => {
								onResultClick?.(result);
								setQuery("");
							}}
						>
							<span className="font-mono text-xs text-muted-foreground">
								{result.type}
							</span>
							<span>{result.title || result.name}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
