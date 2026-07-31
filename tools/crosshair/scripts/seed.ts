import { db } from '../src/db/client';
import { competitors } from '../src/db/schema';

const COMPETITOR_MAP = [
  // AEGIS
  { name: 'Okta', mapped_app: 'AEGIS' },
  { name: 'Auth0', mapped_app: 'AEGIS' },
  { name: '1Password', mapped_app: 'AEGIS' },
  // PIVOT
  { name: 'Notion', mapped_app: 'PIVOT' },
  { name: 'ClickUp', mapped_app: 'PIVOT' },
  { name: 'Airtable', mapped_app: 'PIVOT' },
  // SOND
  { name: 'Typeform', mapped_app: 'SOND' },
  { name: 'SurveyMonkey', mapped_app: 'SOND' },
  // DIAL
  { name: 'Slack', mapped_app: 'DIAL' },
  { name: 'Intercom', mapped_app: 'DIAL' },
  { name: 'Zendesk', mapped_app: 'DIAL' },
  // SPARK
  { name: 'Zapier', mapped_app: 'SPARK' },
  { name: 'Make', mapped_app: 'SPARK' },
  // TEMPO
  { name: 'Calendly', mapped_app: 'TEMPO' },
  // CINQ
  { name: 'HubSpot', mapped_app: 'CINQ' },
  { name: 'Salesforce', mapped_app: 'CINQ' },
  { name: 'Pipedrive', mapped_app: 'CINQ' },
  // VAULT
  { name: 'NetSuite', mapped_app: 'VAULT' },
  { name: 'Cin7', mapped_app: 'VAULT' },
  // PAUSE
  { name: 'BambooHR', mapped_app: 'PAUSE' },
  { name: 'Personio', mapped_app: 'PAUSE' },
  // VISTA
  { name: 'Tableau', mapped_app: 'VISTA' },
  { name: 'Metabase', mapped_app: 'VISTA' },
];

async function seed() {
  console.log('🌱 Seeding competitors...');
  for (const comp of COMPETITOR_MAP) {
    await db.insert(competitors).values(comp).onConflictDoNothing();
  }
  console.log('✅ Competitors seeded.');
  process.exit(0);
}

seed().catch(console.error);
