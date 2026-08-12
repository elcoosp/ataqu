import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import Papa from 'papaparse';
import { Button, Card, CardContent } from '@ataqu/ui';
import { toast } from 'sonner';
import { Trans } from '@lingui/react/macro';
import { api } from '@ataqu/api-client';

export function CsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const firstFile = acceptedFiles[0];
    if (!firstFile) return;
    setFile(firstFile);
    Papa.parse(firstFile, {
      header: true,
      preview: 5,
      complete: (results) => {
        setHeaders(results.meta.fields || []);
        setPreviewData(results.data as Record<string, string>[]);
        const autoMap: Record<string, string> = {};
        results.meta.fields?.forEach((field) => {
          const lower = field.toLowerCase();
          if (lower.includes('name')) autoMap[field] = 'name';
          else if (lower.includes('email')) autoMap[field] = 'email';
          else if (lower.includes('phone')) autoMap[field] = 'phone';
          else if (lower.includes('company')) autoMap[field] = 'company';
          else autoMap[field] = 'customFields';
        });
        setMapping(autoMap);
      },
    });
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));
      return api.post('/cinq/csv/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (data: any) => {
      toast.success(`CSV imported: ${data.imported} contacts. Failed: ${data.failed}`);
    },
    onError: () => {
      toast.error('Import failed');
    },
  });

  const handleImport = () => {
    if (file) importMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <Card {...getRootProps()} className="border-dashed cursor-pointer p-8">
        <input {...getInputProps()} />
        <div className="text-center">
          <Trans>Drop your CSV here or click to browse</Trans>
        </div>
      </Card>

      {file && (
        <Card>
          <CardContent className="p-4">
            <p><Trans>File:</Trans> {file.name}</p>
            <div className="mt-4">
              <h4 className="font-medium"><Trans>Column Mapping</Trans></h4>
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-2">
                  <span className="w-32 truncate">{h}</span>
                  <select
                    value={mapping[h] || ''}
                    onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                    className="border rounded px-2 py-1"
                  >
                    <option value="">Ignore</option>
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="company">Company</option>
                    <option value="customFields">Custom</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <h4 className="font-medium"><Trans>Preview</Trans></h4>
              <table className="w-full text-sm">
                <thead>
                  <tr>{headers.map((h) => <th key={h} className="text-left">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h} className="border px-2 py-1">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={handleImport} disabled={importMutation.isPending} className="mt-4">
              <Trans>Import</Trans>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
