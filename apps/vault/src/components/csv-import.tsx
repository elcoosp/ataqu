import { useCreateProduct } from '@ataqu/api-client';
import { handleApiError } from '@ataqu/shared-utils';
import { Button } from '@ataqu/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line.charAt(index);
    const next = line.charAt(index + 1);

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function CsvImport({ onImported }: { onImported?: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);

  const createProduct = useCreateProduct({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vault', 'products'] });
    },
  });

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const headerLine = lines[0];

      if (!headerLine) {
        setStatus('CSV file is empty.');
        return;
      }

      const header = parseCsvLine(headerLine).map((cell) => cell.trim().toLowerCase());
      const nameIndex = header.indexOf('name');
      const skuIndex = header.indexOf('sku');
      const descriptionIndex = header.indexOf('description');

      if (nameIndex === -1 || skuIndex === -1) {
        setStatus('CSV must include name and sku columns.');
        return;
      }

      let imported = 0;

      for (const line of lines.slice(1)) {
        const cells = parseCsvLine(line);
        const name = (cells[nameIndex] ?? '').trim();
        const sku = (cells[skuIndex] ?? '').trim();
        const description = descriptionIndex === -1 ? '' : (cells[descriptionIndex] ?? '').trim();

        if (!name || !sku) continue;

        await createProduct.mutateAsync({
          name,
          sku,
          description,
        });
        imported += 1;
      }

      setStatus(`Imported ${imported} product${imported === 1 ? '' : 's'}.`);
      onImported?.();
    } catch (error) {
      setStatus(handleApiError(error));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
          event.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={createProduct.isPending}
      >
        {createProduct.isPending ? 'Importing...' : 'Import CSV'}
      </Button>
      {status ? (
        <p role="status" className="text-sm text-muted-foreground">
          {status}
        </p>
      ) : null}
    </div>
  );
}
