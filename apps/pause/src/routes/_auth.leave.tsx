import { useAuthStore } from '@ataqu/shared-stores';
import { Button, Dialog, DialogContent, DialogTrigger, OnboardTour, Shell } from '@ataqu/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ApprovalDashboard } from '../components/approval-dashboard';
import { LeaveRequestForm } from '../components/leave-request-form';

export const Route = createFileRoute('/_auth/leave')({
  component: LeavePage,
});

function LeavePage() {
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  return (
    <Shell activeApp="pause">
      <OnboardTour
        tourId="pause-leave-tour"
        steps={[
          {
            target: '[data-tour="request-leave"]',
            content: 'No payroll bloat. Just leave tracking.',
          },
          {
            target: '[data-tour="pending-list"]',
            content: 'Approve here, and their system access updates automatically via AEGIS.',
          },
        ]}
      >
        <div className="p-8">
          <div className="flex justify-between mb-8">
            <h1 className="text-2xl font-bold">Leave Requests</h1>
            <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
              <DialogTrigger asChild>
                <Button>Request Leave</Button>
              </DialogTrigger>
              <DialogContent>
                <LeaveRequestForm
                  employeeId={user?.id || 'unknown'}
                  onClose={() => setIsLeaveOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          <ApprovalDashboard />
        </div>
      </OnboardTour>
    </Shell>
  );
}
