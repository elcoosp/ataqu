import React from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './button';
import { Input } from './input';

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'select' | 'textarea' | 'number' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  className?: string;
}

function SortableField({
  field,
  index,
  onDelete,
}: {
  field: FormField;
  index: number;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-deep-night/50 border border-gray-700/40 rounded-lg">
      <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-white">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{field.label}</span>
          <span className="text-xs text-gray-400">{field.type}</span>
          {field.required && <span className="text-xs text-amber">*</span>}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-400" onClick={() => onDelete(field.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FormBuilder({ fields, onChange, className }: FormBuilderProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDelete = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newFields = [...fields];
    const [moved] = newFields.splice(oldIndex, 1);
    newFields.splice(newIndex, 0, moved);
    onChange(newFields);
  };

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      label: `New ${type} field`,
      placeholder: `Enter ${type}`,
      required: false,
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined,
    };
    onChange([...fields, newField]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => addField('text')} className="border-gray-700/40 text-gray-300">
          + Text
        </Button>
        <Button variant="outline" size="sm" onClick={() => addField('email')} className="border-gray-700/40 text-gray-300">
          + Email
        </Button>
        <Button variant="outline" size="sm" onClick={() => addField('select')} className="border-gray-700/40 text-gray-300">
          + Select
        </Button>
        <Button variant="outline" size="sm" onClick={() => addField('textarea')} className="border-gray-700/40 text-gray-300">
          + Textarea
        </Button>
        <Button variant="outline" size="sm" onClick={() => addField('number')} className="border-gray-700/40 text-gray-300">
          + Number
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 text-gray-400 border border-dashed border-gray-700/40 rounded-lg">
          No fields yet. Add a field above to start building your form.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <SortableField key={field.id} field={field} index={index} onDelete={handleDelete} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
