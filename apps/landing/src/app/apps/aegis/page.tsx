"use client";
import Image from "next/image";

import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export default function AegisPage() {
  return (
    <div className="container section-padding max-w-4xl mx-auto">
      <Link href="/" className="text-primary hover:underline text-sm inline-block mb-6">
      <div className="flex justify-center my-4">
        <Image
          src="/apps/aegis.png"
          alt="aegis"
          width={80}
          height={80}
          className="rounded-full border border-primary/20"
        />
      </div>
      <div className="flex justify-center my-4">
        <Image
          src="/apps/aegis.png"
          alt="aegis"
          width={80}
          height={80}
          className="rounded-full border border-primary/20"
        />
      </div>
        ← Back to home
      </Link>

      <h1 className="font-display text-4xl md:text-5xl font-bold">
        Okta is a gatekeeper. AEGIS is the vault built into your foundation.
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        
          AEGIS provides SSO, MFA, and RBAC — natively integrated with PAUSE and all 10 apps.
          No per‑user fees. No separate identity product. Just native security.
        
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Features</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• SSO (Google, Microsoft)</li>
            <li>• MFA (TOTP with Google Authenticator)</li>
            <li>• RBAC (Admin, Member, Viewer, Custom)</li>
            <li>• JWT sessions & refresh tokens</li>
            <li>• API keys for developers</li>
            <li>• Native PAUSE deprovisioning</li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card/30">
          <h2 className="font-display text-xl font-bold text-primary">Why replace Okta?</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-display text-muted-foreground">Okta</th>
                <th className="text-left py-2 font-display text-muted-foreground">AEGIS</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">$15/user/mo</td>
                <td className="py-2 text-primary font-bold">$15/mo (whole team)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">No native HR integration</td>
                <td className="py-2 text-primary font-bold">Native PAUSE deprovisioning</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">Complex admin UI</td>
                <td className="py-2 text-primary font-bold">Simple, minimal interface</td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground">Support: 1.3/5 on Trustpilot</td>
                <td className="py-2 text-primary font-bold">Human support, 24h SLA</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-12 p-6 rounded-lg border border-primary/30 bg-card/50">
        <h2 className="font-display text-2xl font-bold text-primary">
          Native integration across the OS
        </h2>
        <p className="mt-2 text-muted-foreground">
          
            AEGIS is woven into the source code of Ataqu. When an employee is offboarded in PAUSE,
            AEGIS instantly revokes their access to all 10 apps. No manual deprovisioning.
          
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-center">
          Ready to escape Okta?
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          Start with aegis for $15/mo (or get all 10 for $79/mo). No credit card required for the trial.
        </p>
        <div className="mt-6">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
