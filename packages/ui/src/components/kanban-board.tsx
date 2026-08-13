import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Card } from './card';

export interface KanbanColumn<T = any> {
  id: string;
  title: string;
  items: T[];
}

export interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[];
  onDragEnd: (columns: KanbanColumn<T>[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderColumnHeader?: (column: KanbanColumn<T>) => React.ReactNode;
  onAddItem?: (columnId: string) => void;
  className?: string;
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
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab">
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
  className,
}: KanbanBoardProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    let sourceColumnIndex = -1;
    let targetColumnIndex = -1;
    let sourceItemIndex = -1;
    let targetItemIndex = -1;

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const itemIndex = col?.items?.findIndex((_, idx) => `${col.id}-${idx}` === activeId) ?? -1;
      if (itemIndex !== -1) {
        sourceColumnIndex = i;
        sourceItemIndex = itemIndex;
      }
      const overItemIndex = col?.items?.findIndex((_, idx) => `${col.id}-${idx}` === overId) ?? -1;
      if (overItemIndex !== -1) {
        targetColumnIndex = i;
        targetItemIndex = overItemIndex;
      }
    }

    if (sourceColumnIndex === -1 || targetColumnIndex === -1) return;

    const newColumns = [...columns];
    const [movedItem] = newColumns[sourceColumnIndex]?.items?.splice(sourceItemIndex, 1) ?? [];

    if (movedItem === undefined) return;

    if (sourceColumnIndex === targetColumnIndex) {
      newColumns[targetColumnIndex]?.items?.splice(targetItemIndex, 0, movedItem);
    } else {
      const isOverColumn = columns.some((col) => col.id === overId);
      if (isOverColumn) {
        const targetColIndex = columns.findIndex((col) => col.id === overId);
        if (targetColIndex !== -1) {
          newColumns[targetColIndex]?.items?.push(movedItem);
        }
      } else {
        newColumns[targetColumnIndex]?.items?.splice(targetItemIndex, 0, movedItem);
      }
    }

    onDragEnd(newColumns);
  };

  const getItemId = (colId: string, index: number) => `${colId}-${index}`;
  const getItems = () => {
    const items: string[] = [];
    for (const col of columns) {
      for (let i = 0; i < col.items.length; i++) {
        items.push(getItemId(col.id, i));
      }
    }
    return items;
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className={cn('flex gap-4 overflow-x-auto p-4', className)}>
        {columns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-80 bg-deep-night/50 rounded-lg border border-gray-700/40 flex flex-col max-h-[600px]">
            <div className="p-3 border-b border-gray-700/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{renderColumnHeader?.(column) || column.title}</span>
                <span className="text-xs text-gray-400 bg-gray-700/40 px-2 py-0.5 rounded-full">
                  {column.items.length}
                </span>
              </div>
              {onAddItem && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-white"
                  onClick={() => onAddItem(column.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              <SortableContext
                items={column.items.map((_, idx) => getItemId(column.id, idx))}
                strategy={verticalListSortingStrategy}
              >
                {column.items.map((item, index) => (
                  <SortableItem
                    key={getItemId(column.id, index)}
                    id={getItemId(column.id, index)}
                    item={item}
                    index={index}
                    renderItem={renderItem}
                  />
                ))}
              </SortableContext>
              {column.items.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">Drop items here</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </DndContext>
  );
}
