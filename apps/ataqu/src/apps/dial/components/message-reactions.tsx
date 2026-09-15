import {
	useAddReaction,
	useDeleteReaction,
	useListReactions,
} from "@ataqu/api-client";
import { useAuthStore } from "@ataqu/shared-stores";
import { cn } from "@ataqu/ui";

interface AggregatedReaction {
	count: number;
	userIds: string[];
}

/**
 * Renders one message's reactions. Extracted into its own component because
 * `useListReactions` is a hook — it must not be called inside a `.map()` loop
 * in the parent (React rules of hooks / runtime crash).
 */
export function MessageReactions({ messageId }: { messageId: string }) {
	const currentUserId = useAuthStore((s) => s.user?.id);
	const { data: reactions } = useListReactions(messageId);
	const addReactionMutation = useAddReaction();
	const deleteReactionMutation = useDeleteReaction();

	if (!reactions || reactions.length === 0) return null;

	const aggregated = reactions.reduce<Record<string, AggregatedReaction>>(
		(acc, r) => {
			if (!acc[r.emoji]) acc[r.emoji] = { count: 0, userIds: [] };
			acc[r.emoji].count++;
			acc[r.emoji].userIds.push(r.user_id);
			return acc;
		},
		{},
	);

	return (
		<div className="flex flex-wrap gap-1 mt-1">
			{Object.entries(aggregated).map(([emoji, { count, userIds }]) => {
				const hasReacted = userIds.includes(currentUserId ?? "");
				return (
					<button
						type="button"
						key={emoji}
						className={cn(
							"text-xs px-1.5 py-0.5 rounded transition-colors border",
							hasReacted
								? "bg-primary/20 border-primary/40 hover:bg-primary/30"
								: "bg-muted/30 border-transparent hover:bg-muted/50",
						)}
						onClick={() => {
							if (hasReacted) {
								const userReaction = reactions.find(
									(r) => r.user_id === currentUserId && r.emoji === emoji,
								);
								if (userReaction) {
									deleteReactionMutation.mutate({
										messageId,
										reactionId: userReaction.id,
									});
								}
							} else {
								addReactionMutation.mutate({
									messageId,
									data: { emoji },
								});
							}
						}}
					>
						{emoji}
						{count > 1 && (
							<span className="ml-0.5 text-[10px] font-medium">{count}</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
