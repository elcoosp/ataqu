import 'dotenv/config';
import { db } from '../src/db/client';
import { insights, clusters } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { clusterComplaints } from '../src/agents/cluster_agent';

async function createClusters() {
  console.log('📊 Démarrage du clustering...');

  const unclustered = await db.query.insights.findMany({
    where: (fields, { eq }) => eq(fields.human_reviewed, false),
    limit: 50,
  });

  if (unclustered.length < 3) {
    console.log('   ⏭️ Pas assez d\'insights pour former un cluster (minimum 3).');
    process.exit(0);
  }

  console.log(`   🔍 ${unclustered.length} insights à clusteriser`);

  const grouped: Record<string, typeof unclustered> = {};
  for (const insight of unclustered) {
    const key = insight.competitor || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(insight);
  }

  let clusteredCount = 0;

  for (const [competitor, items] of Object.entries(grouped)) {
    if (items.length < 2) continue;

    const dataStr = items.map(i => `- ${i.direct_quote || i.feature_gap || i.workflow}`).join('\n');

    try {
      const result = await clusterComplaints(dataStr);

      const existing = await db.query.clusters.findFirst({
        where: (fields, { and, eq }) => and(
          eq(fields.name, result.name),
          eq(fields.mapped_app, competitor)
        )
      });

      const score = Math.min(items.length * 5, 100);

      if (existing) {
        const newCount = (existing.evidence_count || 0) + items.length;
        const newScore = Math.round(((existing.total_opportunity_score || 0) + score) / 2);
        await db.update(clusters).set({
          evidence_count: newCount,
          total_opportunity_score: newScore,
          updated_at: new Date(),
        }).where(eq(clusters.id, existing.id));
      } else {
        await db.insert(clusters).values({
          name: result.name || `${competitor} Pain Cluster`,
          mapped_app: competitor,
          core_pain: result.core_pain || items[0]?.feature_gap || 'General pain',
          evidence_count: items.length,
          best_quotes: JSON.stringify(items.slice(0, 3).map(i => i.direct_quote)),
          common_workarounds: result.common_workarounds || '',
          competitors_mentioned: JSON.stringify([competitor]),
          total_opportunity_score: Math.round(score),
          verdict: result.verdict || 'needs_research',
          manual_mvp_idea: result.manual_mvp || '',
        });
      }

      for (const item of items) {
        await db.update(insights)
          .set({ human_reviewed: true })
          .where(eq(insights.id, item.id));
      }

      clusteredCount += items.length;
      console.log(`   ✅ Cluster créé: ${result.name} (${items.length} insights)`);

    } catch (error) {
      console.error(`   ❌ Erreur de clustering pour ${competitor}:`, (error as Error).message);
    }
  }

  console.log(`✅ Clustering terminé. ${clusteredCount} insights clusterisés.`);
  process.exit(0);
}

createClusters().catch(console.error);
