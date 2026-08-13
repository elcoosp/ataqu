import { useUploadFile } from '@ataqu/api-client';
import { t } from '@lingui/core/macro';
import { Button } from '@ataqu/ui';
import { Loader2, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface FileUploadProps {
  channelId: string;
  onUploadComplete?: (fileId: string) => void;
}

export function FileUpload({ channelId, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const uploadFile = useUploadFile();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile.mutateAsync({
        channelId,
        data: { filename: file.name },
      });
      // Upload to presigned URL
      const response = await fetch(result.upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!response.ok) throw new Error('Upload failed');
      toast.success(t`File uploaded`);
      onUploadComplete?.(result.file_id);
    } catch (error) {
      console.error('Upload error', error);
      toast.error(t`Failed to upload file`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full"
        onClick={() => document.getElementById('file-input')?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
      <input id="file-input" type="file" className="hidden" onChange={handleFileSelect} />
    </>
  );
}
