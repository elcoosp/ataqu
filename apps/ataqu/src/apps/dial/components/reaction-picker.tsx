import { Button, Popover, PopoverContent, PopoverTrigger } from "@ataqu/ui";
import { Smile } from "lucide-react";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface ReactionPickerProps {
	onSelect: (emoji: string) => void;
}

export function ReactionPicker({ onSelect }: ReactionPickerProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" className="h-6 w-6">
					<Smile className="h-3 w-3" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-2 flex gap-1">
				{EMOJIS.map((emoji) => (
					<button
						type="button"
						key={emoji}
						className="text-xl hover:bg-muted rounded p-1 transition-colors"
						onClick={() => onSelect(emoji)}
					>
						{emoji}
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
}
