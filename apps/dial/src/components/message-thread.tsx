import {
	useAddMention,
	useAddReaction,
	useDeleteMessage,
	useDeleteReaction,
	useEditMessage,
	useListMentions,
	useListMessages,
	useListReactions,
	useMarkMentionRead,
	useSearchMessages,
	useStartThread,
} from "@ataqu/api-client";
import { useAuthStore } from "@ataqu/shared-stores";
import { handleApiError } from "@ataqu/shared-utils";
import { Avatar, AvatarFallback, Button, cn, Skeleton } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDistanceToNow } from "date-fns";
import { Reply } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageInput } from "./message-input";
import { ReactionPicker } from "./reaction-picker";
import { ThreadSidebar } from "./thread-sidebar";

interface MessageThreadProps {
	channelId: string;
}

export function MessageThread({ channelId }: MessageThreadProps) {
	const { data: messagesData, isLoading } = useListMessages(channelId, {
		limit: 50,
		offset: 0,
	});
	const containerRef = useRef<HTMLDivElement>(null);
	const currentUserId = useAuthStore((s) => s.user?.id);

	const allMessages = (messagesData?.messages ?? []).filter((m) => m != null);

	// Handle reactions
	const addReactionMutation = useAddReaction();
	const deleteReactionMutation = useDeleteReaction();
	const editMutation = useEditMessage({
		onSuccess: () => toast.success(t`Message edited`),
		onError: (err) => toast.error(handleApiError(err)),
	});
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draft, setDraft] = useState("");
	const [searchQuery, setSearchQuery] = useState("");

	const deleteMessage = useDeleteMessage({
		onSuccess: () => toast.success(t`Message deleted`),
		onError: (err) => toast.error(handleApiError(err)),
	});
	const startThread = useStartThread({
		onSuccess: () => {
			toast.success("Thread started.");
		},
		onError: () => toast.error("Failed to start thread"),
	});
	const { data: searchResults } = useSearchMessages(
		{ q: searchQuery },
		{
			enabled: searchQuery.trim().length > 0,
			queryKey: ["dial", "search", searchQuery],
		},
	);
	const _markMentionRead = useMarkMentionRead();
	const _addMention = useAddMention();
	const { data: mentions } = useListMentions();

	const displayedMessages = searchQuery.trim()
		? (searchResults?.messages ?? []).filter((m) => m != null)
		: allMessages;

	// Virtualization
	const virtualizer = useVirtualizer({
		count: displayedMessages.length,
		getScrollElement: () => containerRef.current,
		estimateSize: () => 60,
		overscan: 10,
	});

	// Scroll to bottom on new messages
	useEffect(() => {
		if (virtualizer) {
			virtualizer.scrollToIndex(displayedMessages.length - 1, { align: "end" });
		}
	}, [displayedMessages.length, virtualizer]);

	const handleReactionToggle = (messageId: string, emoji: string) => {
		addReactionMutation.mutate({
			messageId,
			data: { emoji },
		});
	};

	if (isLoading) {
		return (
			<div className="p-4 space-y-4">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-3/4" />
				<Skeleton className="h-10 w-2/3" />
			</div>
		);
	}

	if (!allMessages.length) {
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground">
				{t`No messages yet. Say hello!`}
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<div className="p-2 border-b border-border flex items-center gap-2">
				<input
					data-search-input
					type="text"
					placeholder={t`Search messages...`}
					className="flex-1 px-3 py-1 text-sm bg-background border border-input rounded-md"
					onChange={(_e: React.ChangeEvent<HTMLInputElement>) => {
						setSearchQuery(_e.target.value);
					}}
				/>
				<Button
					variant="outline"
					size="sm"
					onClick={() => window.open(`/api/dial/channels/${channelId}/export`)}
				>
					{t`Export CSV`}
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() =>
						window.open(`/api/dial/channels/${channelId}/export/pdf`)
					}
				>
					{t`Export PDF`}
				</Button>
			</div>
			<div ref={containerRef} className="flex-1 overflow-y-auto">
				<div
					className="relative"
					style={{ height: `${virtualizer.getTotalSize()}px` }}
				>
					{virtualizer.getVirtualItems().map((virtualRow) => {
						const message = displayedMessages[virtualRow.index];
						if (!message) return null;
						const isOwn = message.author_id === currentUserId; // from auth store
						return (
							<div
								key={message.id}
								className={cn(
									"flex px-4 py-2 hover:bg-card/50 transition-colors",
									isOwn ? "justify-end" : "justify-start",
								)}
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "100%",
									height: `${virtualRow.size}px`,
									transform: `translateY(${virtualRow.start}px)`,
								}}
							>
								<div
									className={cn(
										"max-w-[80%]",
										isOwn ? "bg-primary/10 rounded-md p-2" : "",
									)}
								>
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<Avatar className="h-6 w-6 rounded-md">
											<AvatarFallback className="rounded-md text-xs bg-muted">
												{message.author_id.slice(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<span className="font-medium text-foreground">
											{message.author_id}
										</span>
										<span>
											{formatDistanceToNow(new Date(message.sent_at), {
												addSuffix: true,
											})}
										</span>
									</div>
									<div className="mt-1 text-sm whitespace-pre-wrap break-words">
										{editingId === message.id ? (
											<>
												<textarea
													className="w-full rounded-md border border-input bg-background p-2 text-sm"
													value={draft}
													onChange={(e) => setDraft(e.target.value)}
													rows={2}
													autoFocus
												/>
												<div className="mt-1 flex gap-2">
													<Button
														size="sm"
														onClick={() => {
															editMutation.mutate({
																messageId: message.id,
																data: { content: draft },
																version: message.version,
															});
															setEditingId(null);
														}}
														disabled={editMutation.isPending}
													>
														{t`Save`}
													</Button>
													<Button
														size="sm"
														variant="ghost"
														onClick={() => setEditingId(null)}
													>
														{t`Cancel`}
													</Button>
												</div>
											</>
										) : (
											message.content.split(" ").map((word, i) => {
												if (word.startsWith("@")) {
													return (
														<span
															key={i}
															className="bg-primary/20 text-primary-foreground px-0.5 rounded"
														>
															{word}
														</span>
													);
												}
												return `${word} `;
											})
										)}
									</div>
									{/* Reactions */}
									<div className="flex flex-wrap gap-1 mt-1">
										{(() => {
											const { data: reactions } = useListReactions(message.id);
											return reactions?.map((r) => (
												<span
													key={r.id}
													className="text-xs bg-muted/30 px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/50"
													onClick={() => {
														// Toggle reaction: if user already reacted, delete it
														const userReaction = reactions.find(
															(r) => r.user_id === currentUserId,
														);
														if (userReaction) {
															deleteReactionMutation.mutate({
																messageId: message.id,
																reactionId: userReaction.id,
															});
														} else {
															addReactionMutation.mutate({
																messageId: message.id,
																data: { emoji: r.emoji },
															});
														}
													}}
												>
													{r.emoji}
												</span>
											));
										})()}
									</div>
									{/* Action buttons: reaction, reply, edit */}
									<div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<ReactionPicker
											onSelect={(emoji) =>
												handleReactionToggle(message.id, emoji)
											}
										/>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6"
											onClick={() => {
												setDraft(message.content);
												setEditingId(message.id);
											}}
										>
											{t`Edit`}
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 text-destructive"
											onClick={() => deleteMessage.mutate(message.id)}
											disabled={deleteMessage.isPending}
										>
											{t`Delete`}
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6"
											onClick={() =>
												startThread.mutate({
													channel_id: channelId,
													parent_message_id: message.id,
												})
											}
											disabled={startThread.isPending}
										>
											<Reply className="h-3 w-3" />
										</Button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
			<div className="border-t border-border p-2">
				<MessageInput channelId={channelId} />
			</div>
			{/* Thread sidebar will be rendered conditionally */}
			<ThreadSidebar channelId={channelId} />
		</div>
	);
}
