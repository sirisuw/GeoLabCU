import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

type OAuthDetails = {
  client?: { name?: string; client_id?: string };
  redirect_uri?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthDecideResult = { redirect_url?: string; redirect_to?: string };

type SupabaseWithOAuth = {
  auth: {
    oauth: {
      getAuthorizationDetails: (id: string) => Promise<{
        data: OAuthDetails | null;
        error: { message: string } | null;
      }>;
      approveAuthorization: (id: string) => Promise<{
        data: OAuthDecideResult | null;
        error: { message: string } | null;
      }>;
      denyAuthorization: (id: string) => Promise<{
        data: OAuthDecideResult | null;
        error: { message: string } | null;
      }>;
    };
  };
};


export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id:
      typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get(
      "authorization_id",
    )!;
    const client = supabase as SupabaseWithOAuth;
    const { data, error } =
      await client.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="container-page grid min-h-[60vh] place-items-center py-14">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold">Authorization error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an application";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const client = supabase as SupabaseWithOAuth;
    const { data, error } = approve
      ? await client.auth.oauth.approveAuthorization(authorization_id)
      : await client.auth.oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="container-page grid min-h-[70vh] place-items-center py-14">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Connect {clientName}</h1>
            <p className="text-xs text-muted-foreground">
              to your Geo Labs account
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {clientName} will be able to call this app's enabled tools while you
          are signed in. This does not bypass Geo Labs permissions or backend
          policies.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <Button
            className="flex-1"
            disabled={busy}
            onClick={() => decide(true)}
          >
            Approve
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => decide(false)}
          >
            Deny
          </Button>
        </div>
      </div>
    </main>
  );
}
