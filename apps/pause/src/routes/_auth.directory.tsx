import { useCreateEmployee } from '@ataqu/api-client';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Shell,
} from '@ataqu/ui';
import { Trans, t } from '@lingui/macro';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmployeeDirectory } from '../components/employee-directory';

export const Route = createFileRoute('/_auth/directory')({
  component: DirectoryPage,
});

function DirectoryPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <Shell activeApp="pause">
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-8">
          <Trans>Employee Directory</Trans>
        </h1>
        <EmployeeDirectory onAddEmployee={() => setIsAddOpen(true)} />

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <Trans>Add Employee</Trans>
              </DialogTitle>
            </DialogHeader>
            <AddEmployeeForm onClose={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </Shell>
  );
}

function AddEmployeeForm({ onClose }: { onClose: () => void }) {
  const mutation = useCreateEmployee({
    onSuccess: () => {
      toast.success(t`Employee added.`);
      onClose();
    },
    onError: () => toast.error(t`Failed to add employee.`),
  });

  return (
    <form
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        mutation.mutate({
          full_name: formData.get('full_name') as string,
          email: formData.get('email') as string,
          job_title: formData.get('job_title') as string,
          hire_date: formData.get('hire_date') as string,
        });
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="full_name">
          <Trans>Full Name</Trans>
        </Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div>
        <Label htmlFor="email">
          <Trans>Email</Trans>
        </Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="job_title">
          <Trans>Job Title</Trans>
        </Label>
        <Input id="job_title" name="job_title" required />
      </div>
      <div>
        <Label htmlFor="hire_date">
          <Trans>Hire Date</Trans>
        </Label>
        <Input id="hire_date" name="hire_date" type="date" required />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        <Trans>Save</Trans>
      </Button>
    </form>
  );
}
