import {
	useAddReaction,
	useBulkDeleteMessages,
	useDeleteMessage,
	useEditMessage,
	useListMentions,
	useListMessages,
	useSearchMessages,
	useStartThread,
} from "@ataqu/api-client";
import { useAuthStore } from "@ataqu/shared-stores";
import { handleApiError } from "@ataqu/shared-utils";
import {
	Avatar,
	AvatarFallback,
	Button,
	cn,
	HoldToConfirm,
	PresenceAvatars,
	SkeletonSwap,
	TypingIndicator,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatDistanceToNow } from "date-fns";
import { Reply } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageInput } from "./message-input";
import { MessageReactions } from "./message-reactions";
import { ReactionPicker } from "./reaction-picker";
import { ThreadSidebar } from "./thread-sidebar";

interface MessageThreadProps {
	channelId: string;
}

export function MessageThread({ channelId }: MessageThreadProps) {
	const queryClient = useQueryClient();
	const { data: messagesData, isLoading } = useListMessages(channelId, {
		limit: 50,
		offset: 0,
	});
	const containerRef = useRef<HTMLDivElement>(null);
	const currentUserId = useAuthStore((s) => s.user?.id);

	const allMessages = (messagesData?.items ?? []).filter((m) => m != null);

	// Handle reactions
	const addReactionMutation = useAddReaction();
	const editMutation = useEditMessage({
		onSuccess: () => toast.success(t`Message edited`),
		onError: (err) => toast.error(handleApiError(err)),
	});
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draft, setDraft] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [activeTypists] = useState<string[]>([]);

	// Derive unique participants from messages (fallback until presence API is wired)
	const channelParticipants = Array.from(
		new Map(
			allMessages
				.filter((m) => m.author_id !== currentUserId)
				.map((m) => [
					m.author_id,
					{ id: m.author_id, name: m.author_id.slice(0, 8) },
				]),
		).values(),
	).slice(0, 6);

	const deleteMessage = useDeleteMessage({
		onSuccess: () => toast.success(t`Message deleted`),
		onError: (err) => toast.error(handleApiError(err)),
	});
	const bulkDeleteMessages = useBulkDeleteMessages({
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["dial", "messages", channelId],
			});
			toast.success("Messages deleted.");
		},
		onError: () => toast.error("Delete failed"),
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
	useListMentions(); // mentions fetched for potential UI display

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
			<SkeletonSwap ready={false} lines={5}>
				<div className="p-4 space-y-4">
					<div className="h-10 w-full" />
					<div className="h-10 w-3/4" />
					<div className="h-10 w-2/3" />
				</div>
			</SkeletonSwap>
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
				<PresenceAvatars people={channelParticipants} max={4} />
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
				<HoldToConfirm
					onConfirm={() => {
						bulkDeleteMessages.mutate({
							ids: displayedMessages.map((m) => m.id),
						});
					}}
					disabled={
						bulkDeleteMessages.isPending || displayedMessages.length === 0
					}
					className="variant-outline text-destructive"
				>
					{t`Delete all`}
				</HoldToConfirm>
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
											{message.edited_at && (
												<span className="text-[10px] text-muted-foreground ml-1">
													(edited)
												</span>
											)}
										</span>
									</div>
									{
										message.deleted_at ? (
											<div className="mt-1 text-sm text-muted-foreground italic">
												Message deleted
											</div>
										) : (
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
										) /* end deleted_at check */
									}
									{/* Reactions */}
									<MessageReactions messageId={message.id} />
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
			<div className="px-3 pb-2">
				<TypingIndicator typists={activeTypists} />
			</div>
			{/* Thread sidebar will be rendered conditionally */}
			<ThreadSidebar channelId={channelId} />
		</div>
	);
}
