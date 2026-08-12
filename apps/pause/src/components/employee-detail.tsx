import {
  type Document,
  useGetEmployee,
  useListEmployeeDocuments,
  useUploadDocument,
} from '@ataqu/api-client';
import { Button, Card, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@ataqu/ui';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Helper function to handle S3 presigned URL upload flow.
 * 1. Fetches presigned URL from backend.
 * 2. Uploads file directly to S3.
 * 3. Returns the final S3 object URL.
 */
async function uploadFileToS3(file: File): Promise<string> {
  // 1. Fetch presigned URL from backend
  // Note: Assuming an endpoint /api/v1/pause/presigned-url exists
  const response = await fetch('/api/v1/pause/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_name: file.name, content_type: file.type }),
  });

  if (!response.ok) {
    throw new Error('Failed to get presigned URL');
  }

  const { upload_url, file_url } = await response.json();

  // 2. Upload file to S3
  const uploadResponse = await fetch(upload_url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file to S3');
  }

  return file_url;
}

export function EmployeeDetail({ id }: { id: string }) {
  const { data: employee, isLoading } = useGetEmployee(id);
  const { data: documents, isLoading: docsLoading } = useListEmployeeDocuments(id);

  const uploadMutation = useUploadDocument({
    onSuccess: () => toast.success('Document uploaded.'),
    onError: (err) => toast.error(err.message || 'Failed to upload document.'),
  });

  if (isLoading || !employee) {
    return <Skeleton className="h-64 w-full" />;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileUrl = await uploadFileToS3(file);
      uploadMutation.mutate({
        employeeId: id,
        data: { file_name: file.name, file_url: fileUrl, doc_type: 'contract' },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-6">
        <div className="h-24 w-24 rounded-full bg-amber/20 flex items-center justify-center text-amber font-bold text-4xl">
          {employee.full_name.charAt(0)}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{employee.full_name}</h1>
          <p className="text-lg text-gray-400">{employee.job_title}</p>
          <p className="text-sm text-gray-500">
            {employee.email} | {employee.phone || 'No phone'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="leave">
        <TabsList>
          <TabsTrigger value="leave">Leave Balance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="leave">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Leave Balance</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-400">Accrued</p>
                <p className="text-2xl font-bold">15d</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Used</p>
                <p className="text-2xl font-bold">5d</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Remaining</p>
                <p className="text-2xl font-bold text-amber">10d</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Documents</h3>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploadMutation.isPending}
                />
                <Button variant="outline" asChild disabled={uploadMutation.isPending}>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />{' '}
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
                  </span>
                </Button>
              </label>
            </div>
            {docsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : documents && documents.length > 0 ? (
              <ul className="space-y-2">
                {documents.map((doc: Document) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between border-b border-gray-700 pb-2"
                  >
                    <span>{doc.file_name}</span>
                    <span className="text-xs text-gray-400">{doc.doc_type}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No documents uploaded.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Onboarding Checklist</h3>
            <div className="space-y-2">
              {['Create account', 'Sign contract', 'Setup workspace', 'Assign mentor'].map(
                (task) => (
                  <div key={task} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`task-${task}`}
                      className="rounded border-gray-600 text-amber focus:ring-amber"
                    />
                    <label htmlFor={`task-${task}`} className="text-gray-300">
                      {task}
                    </label>
                  </div>
                )
              )}
            </div>
            <div className="mt-4 w-full bg-gray-700 rounded-full h-2.5">
              <div className="bg-amber h-2.5 rounded-full" style={{ width: '50%' }}></div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
