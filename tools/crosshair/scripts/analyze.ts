import 'dotenv/config';
import { db } from '../src/db/client';
import { rawSignals, insights } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { classifySignal } from '../src/agents/classifier';
import { extractLeadData } from '../src/agents/lead_agent';
import { extractProductData } from '../src/agents/product_agent';

const BATCH_SIZE = 3;
const DELAY_MS = 3000;

async function analyzeNewSignals() {
  console.log('🧠 Starting high-precision analysis...');

  let processed = 0;
  let hasMore = true;

  while (hasMore) {
    const signals = await db.query.rawSignals.findMany({
      where: (fields, { eq }) => eq(fields.status, 'new'),
      limit: BATCH_SIZE,
    });

    if (signals.length === 0) {
      hasMore = false;
      break;
    }

    for (const signal of signals) {
      console.log(`   🔍 Processing signal ${signal.id}...`);

      try {
        // 1. Classify
        const classification = await classifySignal(signal.raw_text);
        if (!classification.is_complaint || classification.confidence < 0.7) {
          console.log(`   ⏭️ Not a complaint (conf=${classification.confidence.toFixed(2)}).`);
          continue;
        }

        console.log(`   ✅ Complaint detected for ${classification.competitor}`);

        // 2. Extract lead
        const leadData = await extractLeadData(signal.raw_text);

        // 3. Extract product
        const productData = await extractProductData(signal.raw_text);

        // 4. Calculate scores
        const leadScore = (leadData.urgency_score + leadData.buying_intent_score + leadData.frequency_score) / 3;

        // 5. Determine if insight is high-value (has concrete data)
        const hasConcreteData = (productData.feature_gap && productData.feature_gap.length > 5) ||
                                (productData.pricing_complaint && productData.pricing_complaint.length > 5) ||
                                (productData.ux_friction && productData.ux_friction.length > 5);

        // 6. Save insights
        await db.insert(insights).values({
          signal_id: signal.id,
          buyer_segment: leadData.buyer_segment,
          workflow: leadData.workflow,
          current_workaround: leadData.current_workaround,
          direct_quote: leadData.direct_quote,
          root_cause: productData.root_cause,
          competitor: classification.competitor || '',
          feature_gap: productData.feature_gap,
          pricing_complaint: productData.pricing_complaint,
          ux_friction: productData.ux_friction,
          urgency: leadData.urgency_score,
          buying_intent: leadData.buying_intent_score,
          frequency: leadData.frequency_score,
          overall_lead_score: Math.round(leadScore * 10) / 10,
          feature_impact: productData.feature_impact_score,
          human_reviewed: false,
        });

        // 7. Mark signal as analyzed
        await db.update(rawSignals)
          .set({ status: 'analyzed', analyzed_at: new Date() })
          .where(eq(rawSignals.id, signal.id));

        processed++;
        console.log(`   ✅ Done (Lead: ${leadScore.toFixed(1)}, Impact: ${productData.feature_impact_score})`);
        if (!hasConcreteData) {
          console.log(`      ⚠️ Warning: no concrete feature/pricing/UX details extracted.`);
        }

      } catch (error) {
        console.error(`   ❌ Error on signal ${signal.id}:`, (error as Error).message);
        // Keep 'new' for retry
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`✅ Analysis complete. ${processed} signals processed.`);
  process.exit(0);
}

analyzeNewSignals().catch(console.error);
