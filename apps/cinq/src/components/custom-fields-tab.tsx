import { useState } from 'react';
import { useUpdateContact } from '@ataqu/api-client';
import { Input } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import type { ContactResponse } from '@ataqu/api-client';

export function CustomFieldsTab({ contact }: { contact: ContactResponse }) {
  const [fields, setFields] = useState<Record<string, any>>(contact.custom_fields || {});
  const updateContact = useUpdateContact();

  const handleChange = (key: string, value: string) => {
    const newFields = { ...fields, [key]: value };
    setFields(newFields);
    updateContact.mutate({
      id: contact.id,
      data: { custom_fields: newFields },
    });
  };

  return (
    <div className="space-y-4">
      {Object.entries(fields).map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <label className="w-32 font-medium">{key}</label>
          <Input
            value={String(value ?? '')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(key, e.target.value)}
          />
        </div>
      ))}
      {Object.keys(fields).length === 0 && (
        <p className="text-muted-foreground"><Trans>No custom fields</Trans></p>
      )}
    </div>
  );
}
