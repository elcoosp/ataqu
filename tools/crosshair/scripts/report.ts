import 'dotenv/config';
import { db } from '../src/db/client';
import { actionItems, clusters, insights, rawSignals } from '../src/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import fs from 'fs';

async function generateActionItems() {
  console.log('🎯 Génération des action items...');

  const topLeads = await db.query.insights.findMany({
    where: (fields, { eq }) => eq(fields.human_reviewed, false),
    orderBy: (fields, { desc }) => [desc(fields.overall_lead_score)],
    limit: 5,
  });

  for (const lead of topLeads) {
    const signal = await db.query.rawSignals.findFirst({
      where: (fields, { eq }) => eq(fields.id, lead.signal_id)
    });
    if (!signal) continue;

    const competitor = lead.competitor || 'that tool';
    const message = `Hey, I saw your post about ${competitor}. We built ${signal.mapped_app} to fix exactly that (${lead.feature_gap || 'the problem you mentioned'}). Looking for beta testers. Free 1-year access. Want to chat?`;

    await db.insert(actionItems).values({
      type: 'lead_outreach',
      target_app: signal.mapped_app || 'SaaS Factory',
      author: signal.author,
      source_url: signal.source_url,
      raw_quote: lead.direct_quote || lead.workflow || '',
      personalized_message: message,
      status: 'pending',
    });
  }

  const topClusters = await db.query.clusters.findMany({
    orderBy: (fields, { desc }) => [desc(fields.total_opportunity_score)],
    limit: 3,
  });

  for (const cluster of topClusters) {
    const existing = await db.query.actionItems.findFirst({
      where: (fields, { and, eq }) => and(
        eq(fields.type, 'feature_build'),
        eq(fields.related_cluster_id, cluster.id)
      )
    });
    if (existing) continue;

    const evidence = cluster.evidence_count || 0;
    const effort = evidence > 10 ? 'medium' : 'low';

    await db.insert(actionItems).values({
      type: 'feature_build',
      target_app: cluster.mapped_app,
      related_cluster_id: cluster.id,
      feature_title: cluster.name,
      feature_description: cluster.core_pain,
      effort_estimate: effort,
      status: 'pending',
    });
  }

  console.log(`✅ ${topLeads.length} leads et ${topClusters.length} features générés.`);
}

async function generateDailyBrief() {
  console.log('📄 Génération du rapport...');

  const pendingActions = await db.query.actionItems.findMany({
    where: (fields, { eq }) => eq(fields.status, 'pending'),
    orderBy: (fields, { desc }) => [desc(fields.created_at)],
  });

  const leads = pendingActions.filter(a => a.type === 'lead_outreach').slice(0, 5);
  const features = pendingActions.filter(a => a.type === 'feature_build').slice(0, 3);

  let markdown = `# 🎯 CROSSHAIR - Daily Intel Brief\n`;
  markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;

  markdown += `## 🔥 Hot Leads to Contact\n\n`;
  if (leads.length === 0) {
    markdown += `_No hot leads today._\n\n`;
  } else {
    for (const lead of leads) {
      markdown += `### ${lead.author || 'Anonymous'}\n`;
      markdown += `- **App:** ${lead.target_app}\n`;
      markdown += `- **Quote:** "${lead.raw_quote}"\n`;
      markdown += `- **Source:** ${lead.source_url || 'N/A'}\n`;
      markdown += `- **Message:**\n  > ${lead.personalized_message}\n\n`;
    }
  }

  markdown += `## 🛠️ Top Features to Build\n\n`;
  if (features.length === 0) {
    markdown += `_No features identified yet._\n\n`;
  } else {
    for (const feat of features) {
      const cluster = await db.query.clusters.findFirst({
        where: (fields, { eq }) => eq(fields.id, feat.related_cluster_id!)
      });
      markdown += `### ${feat.feature_title}\n`;
      markdown += `- **App:** ${feat.target_app}\n`;
      markdown += `- **The Pain:** ${feat.feature_description}\n`;
      markdown += `- **Evidence:** ${cluster?.evidence_count || 0} complaints\n`;
      markdown += `- **Effort:** ${feat.effort_estimate}\n`;
      markdown += `- **Score:** ${cluster?.total_opportunity_score || 0}/100\n\n`;
    }
  }

  fs.writeFileSync('./intel-brief.md', markdown);
  console.log('📄 Rapport sauvegardé dans intel-brief.md');
  console.log(markdown);
}

async function main() {
  await generateActionItems();
  await generateDailyBrief();
  process.exit(0);
}

main().catch(console.error);
