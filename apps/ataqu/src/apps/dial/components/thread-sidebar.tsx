import { useGetThread, useListThreadMessages } from "@ataqu/api-client";
import {
	Button,
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { MessageInput } from "./message-input";

interface ThreadSidebarProps {
	channelId: string;
}

export function ThreadSidebar({ channelId }: ThreadSidebarProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [threadId, setThreadId] = useState<string | null>(null);
	const { data: messages, isLoading } = useListThreadMessages(
		threadId!,
		{ limit: 100, offset: 0 },
		{ enabled: !!threadId, queryKey: ["thread-messages", threadId] },
	);
	const { data: thread } = useGetThread(threadId!, {
		enabled: !!threadId,
		queryKey: ["dial", "thread", threadId],
	});

	useEffect(() => {
		const handler = (e: CustomEvent) => {
			setThreadId(e.detail.messageId);
			setIsOpen(true);
		};
		window.addEventListener("openThread", handler as EventListener);
		return () =>
			window.removeEventListener("openThread", handler as EventListener);
	}, []);

	if (!isOpen) return null;

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetContent side="right" className="w-80 sm:w-96">
				<SheetHeader>
					<SheetTitle>{t`Thread`}</SheetTitle>
					{thread && (
						<p className="text-xs text-muted-foreground">
							{t`Started ${new Date(thread.created_at).toLocaleString()}`}
						</p>
					)}
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsOpen(false)}
						className="absolute right-2 top-2"
					>
						<X className="h-4 w-4" />
					</Button>
				</SheetHeader>
				<div className="flex flex-col h-full">
					<div className="flex-1 overflow-y-auto space-y-2 p-2">
						{isLoading && (
							<div className="text-center text-muted-foreground">{t`Loading...`}</div>
						)}
						{messages?.map((msg) => (
							<div key={msg.id} className="text-sm">
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<span className="font-medium text-foreground">
										{msg.author_id}
									</span>
									<span>{new Date(msg.sent_at).toLocaleString()}</span>
								</div>
								<div className="mt-1">{msg.content}</div>
							</div>
						))}
					</div>
					<div className="border-t border-border p-2">
						<MessageInput
							channelId={channelId}
							threadId={threadId!}
							placeholder={t`Reply in thread...`}
						/>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
