import { createFileRoute } from '@tanstack/react-router';
import { useGetDeal } from '@ataqu/api-client';
import { Tabs, TabsContent, TabsList, TabsTrigger, Skeleton } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import { ActivityTimeline } from '../components/activity-timeline';
import { TaskList } from '../components/task-list';
import { EmailTrackingTab } from '../components/email-tracking-tab';
import { IntegrationToggle } from '../components/integration-toggle';
import { CrossAppBadge } from '../components/cross-app-badge';

export const Route = createFileRoute('/_auth/deals/$id')({
  component: DealDetail,
});

function DealDetail() {
  const { id } = Route.useParams();
  const { data: deal, isLoading } = useGetDeal(id);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!deal) return <div><Trans>Deal not found</Trans></div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{deal.title}</h1>
      <div className="flex gap-4 items-center flex-wrap">
        <span>${deal.amount.toLocaleString()}</span>
        <span className="capitalize">{deal.status}</span>
        <span>Prob: {deal.probability ?? '—'}%</span>
        <CrossAppBadge entityId={id} />
        <IntegrationToggle dealId={id} targetApp="dial" label={<Trans>Create DIAL channel on won</Trans>} />
        <IntegrationToggle dealId={id} targetApp="spark" label={<Trans>Trigger SPARK workflow on won</Trans>} />
      </div>

      <Tabs defaultValue="activities" className="mt-4">
        <TabsList>
          <TabsTrigger value="activities"><Trans>Activities</Trans></TabsTrigger>
          <TabsTrigger value="tasks"><Trans>Tasks</Trans></TabsTrigger>
          <TabsTrigger value="tracking"><Trans>Email Tracking</Trans></TabsTrigger>
        </TabsList>
        <TabsContent value="activities">
          <ActivityTimeline dealId={id} />
        </TabsContent>
        <TabsContent value="tasks">
          <TaskList dealId={id} />
        </TabsContent>
        <TabsContent value="tracking">
          <EmailTrackingTab contactId={deal.contact_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
