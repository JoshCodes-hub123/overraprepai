import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown } from 'lucide-react';
import { useSubscriptionPlans, useMySubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { SEO } from '@/components/seo/SEO';

export default function Pricing() {
  const plans = useSubscriptionPlans();
  const sub = useMySubscription();

  const handleSubscribe = (planId: string) => {
    if (planId === 'free') return;
    toast.info('Pro checkout opens soon — stay tuned!');
  };

  const paidPlans = (plans.data ?? []).filter((p: any) => p.id !== 'free' && p.price_cents > 0);
  const pricingStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "OverraPrep Pro",
    description: "Pro plan for OverraPrep AI — faster AI, priority study coach, and bonus tokens every month.",
    brand: { "@type": "Brand", name: "OverraPrep AI" },
    offers: paidPlans.length > 0
      ? paidPlans.map((p: any) => ({
          "@type": "Offer",
          name: p.name,
          price: (p.price_cents / 100).toFixed(2),
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: "https://prep-mentor-hub-50.lovable.app/pricing",
        }))
      : [{
          "@type": "Offer",
          name: "OverraPrep Pro",
          price: "0.00",
          priceCurrency: "USD",
          availability: "https://schema.org/PreOrder",
          url: "https://prep-mentor-hub-50.lovable.app/pricing",
        }],
  };

  return (
    <>
      <SEO
        title="Pricing — Pro plans & token packs"
        description="OverraPrep Pro pricing: faster AI, priority study coach, and bonus tokens every month. Pick a plan that fits your FUTA exam prep."
        url="/pricing"
        structuredData={pricingStructuredData}
      />
    <div className="container mx-auto p-4 max-w-3xl space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2"><Crown className="w-7 h-7 text-primary"/>Go Pro</h1>
        <p className="text-muted-foreground">Faster AI. Priority coach. Bonus tokens every month.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        {(plans.data ?? []).map((p: any) => {
          const features = Array.isArray(p.features) ? p.features : [];
          const isCurrent = sub.data?.plan_id === p.id;
          return (
            <Card key={p.id} className={p.id === 'pro_monthly' ? 'border-primary border-2' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {p.name}
                  {isCurrent && <Badge>Current</Badge>}
                </CardTitle>
                <div className="text-3xl font-bold">
                  ${(p.price_cents / 100).toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground">/{p.interval}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  {features.map((f: string, i: number) => (
                    <li key={i} className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5"/>{f}</li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={p.id === 'pro_monthly' ? 'default' : 'outline'}
                  disabled={isCurrent || p.id === 'free'}
                  onClick={() => handleSubscribe(p.id)}
                >
                  {isCurrent ? 'Active' : p.id === 'free' ? 'Default' : 'Subscribe'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
    </>
  );
}
