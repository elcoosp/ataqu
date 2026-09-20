import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragStartEvent,
	DragOverlay,
	KeyboardSensor,
	PointerSensor,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";

export interface KanbanColumn<T = any> {
	id: string;
	title: string;
	items: T[];
}

export interface KanbanBoardProps<T> {
	columns: KanbanColumn<T>[];
	/** Called with the new column arrangement after a drop. */
	onDragEnd: (columns: KanbanColumn<T>[]) => void;
	renderItem: (item: T, index: number) => ReactNode;
	renderColumnHeader?: (column: KanbanColumn<T>) => ReactNode;
	onAddItem?: (columnId: string) => void;
	/**
	 * Stable per-item id (defaults to `item.id`). Index-based ids
	 * (`col-0`, `col-1`, …) shift on every move and corrupt in-flight drags.
	 */
	getItemId?: (item: T) => string;
	className?: string;
}

const columnDropPrefix = "column-drop:";
const columnDropId = (columnId: string) => `${columnDropPrefix}${columnId}`;

function ColumnBody({
	dropId,
	children,
}: {
	dropId: string;
	children: ReactNode;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: dropId });
	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex-1 overflow-y-auto p-2 space-y-2 transition-colors",
				isOver && "bg-primary/5 ring-1 ring-inset ring-primary/30",
			)}
		>
			{children}
		</div>
	);
}

function SortableItem<T>({
	id,
	item,
	index,
	renderItem,
}: {
	id: string;
	item: T;
	index: number;
	renderItem: (item: T, index: number) => ReactNode;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			className="cursor-grab"
		>
			{renderItem(item, index)}
		</div>
	);
}

export function KanbanBoard<T>({
	columns,
	onDragEnd,
	renderItem,
	renderColumnHeader,
	onAddItem,
	getItemId,
	className,
}: KanbanBoardProps<T>) {
	const [activeItem, setActiveItem] = useState<T | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const resolveItemId =
		getItemId ?? ((item: T) => String((item as { id?: unknown }).id));

	const findItemLocation = (
		cols: KanbanColumn<T>[],
		itemId: string,
	): { colIndex: number; itemIndex: number } | null => {
		for (let i = 0; i < cols.length; i++) {
			const idx = cols[i]?.items.findIndex(
				(it) => resolveItemId(it) === itemId,
			);
			if (idx !== undefined && idx !== -1) {
				return { colIndex: i, itemIndex: idx };
			}
		}
		return null;
	};

	const handleDragStart = (event: DragStartEvent) => {
		const loc = findItemLocation(columns, String(event.active.id));
		setActiveItem(
			loc ? (columns[loc.colIndex]?.items[loc.itemIndex] ?? null) : null,
		);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveItem(null);
		const { active, over } = event;
		if (!over) return;

		const activeId = String(active.id);
		const overId = String(over.id);
		if (activeId === overId) return;

		const src = findItemLocation(columns, activeId);
		if (!src) return;

		// Shallow copies so the caller can diff / roll back.
		const newColumns = columns.map((c) => ({ ...c, items: [...c.items] }));
		const [movedItem] = newColumns[src.colIndex]?.items.splice(
			src.itemIndex,
			1,
		);
		if (movedItem === undefined) return;

		// Dropped on a column body (the only way to hit an empty column).
		if (overId.startsWith(columnDropPrefix)) {
			const targetId = overId.slice(columnDropPrefix.length);
			const ti = newColumns.findIndex((c) => c.id === targetId);
			if (ti === -1) return;
			newColumns[ti]?.items.push(movedItem);
			onDragEnd(newColumns);
			return;
		}

		// Dropped on/beside an item: insert at its index in the already-mutated
		// copy so same-column reorders stay index-correct after the removal.
		const dst = findItemLocation(newColumns, overId);
		if (!dst) return;
		newColumns[dst.colIndex]?.items.splice(dst.itemIndex, 0, movedItem);
		onDragEnd(newColumns);
	};

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={() => setActiveItem(null)}
		>
			<div className={cn("flex gap-4 overflow-x-auto p-4", className)}>
				{columns.map((column) => (
					<div
						key={column.id}
						className="flex-shrink-0 w-80 bg-deep-night/50 rounded-lg border border-border/40 flex flex-col max-h-[600px]"
					>
						<div className="p-3 border-b border-border/40 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className="font-medium text-white">
									{renderColumnHeader?.(column) || column.title}
								</span>
								<span className="text-xs text-muted-foreground bg-border/40 px-2 py-0.5 rounded-full">
									{column.items.length}
								</span>
							</div>
							{onAddItem && (
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 text-muted-foreground hover:text-white"
									onClick={() => onAddItem(column.id)}
								>
									<Plus className="h-4 w-4" />
								</Button>
							)}
						</div>
						<ColumnBody dropId={columnDropId(column.id)}>
							<SortableContext
								items={column.items.map(resolveItemId)}
								strategy={verticalListSortingStrategy}
							>
								{column.items.map((item, index) => (
									<SortableItem
										key={resolveItemId(item)}
										id={resolveItemId(item)}
										item={item}
										index={index}
										renderItem={renderItem}
									/>
								))}
							</SortableContext>
							{column.items.length === 0 && (
								<div className="text-center py-8 text-muted-foreground text-sm">
									Drop items here
								</div>
							)}
						</ColumnBody>
					</div>
				))}
			</div>
			<DragOverlay>
				{activeItem ? (
					<div className="shadow-lg">{renderItem(activeItem, -1)}</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
