import { useCreateProduct } from '@ataqu/api-client';
import { Button } from '@ataqu/ui';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useQueryClient } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { showToast } from './toast-store';

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

export function CsvImport() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);

  const createProduct = useCreateProduct({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vault', 'products'] });
    },
  });

  const handleFile = async (file: File) => {
    setIsImporting(true);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const headerLine = lines[0];

      if (!headerLine) {
        showToast({
          variant: 'error',
          title: <Trans>CSV import failed.</Trans>,
          description: <Trans>The selected CSV file is empty.</Trans>,
        });
        return;
      }

      const header = parseCsvLine(headerLine).map((cell) => cell.trim().toLowerCase());
      const nameIndex = header.indexOf('name');
      const skuIndex = header.indexOf('sku');
      const descriptionIndex = header.indexOf('description');

      if (nameIndex === -1 || skuIndex === -1) {
        showToast({
          variant: 'error',
          title: <Trans>CSV import failed.</Trans>,
          description: <Trans>The CSV must include name and sku columns.</Trans>,
        });
        return;
      }

      let imported = 0;

      for (const line of lines.slice(1)) {
        const cells = parseCsvLine(line);
        const name = (cells[nameIndex] ?? '').trim();
        const sku = (cells[skuIndex] ?? '').trim();
        const description = descriptionIndex === -1 ? '' : (cells[descriptionIndex] ?? '').trim();

        if (!name || !sku) continue;

        await createProduct.mutateAsync({ name, sku, description });
        imported += 1;
      }

      showToast({
        variant: 'success',
        title: <Trans>Import complete.</Trans>,
        description: t`${imported} products imported.`,
      });
    } catch {
      showToast({
        variant: 'error',
        title: <Trans>CSV import failed.</Trans>,
        description: <Trans>The selected file could not be imported.</Trans>,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
    event.target.value = '';
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={isImporting}
      >
        {isImporting ? <Trans>Importing...</Trans> : <Trans>Import CSV</Trans>}
      </Button>
    </div>
  );
}
