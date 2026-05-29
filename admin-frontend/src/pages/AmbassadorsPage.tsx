import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Sparkles } from 'lucide-react';

export default function AmbassadorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-tjb-charcoal">Ambassadors</h1>
        <p className="text-muted-foreground mt-1">Referral and ambassador program management</p>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-tjb-rose-100 flex items-center justify-center">
              <Heart className="w-8 h-8 text-tjb-rose-600" />
            </div>
          </div>
          <CardTitle className="text-xl font-semibold">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4 max-w-md mx-auto">
          <p className="text-muted-foreground">
            The Ambassador Program module is under active development. This section will allow 
            you to manage referral codes, track ambassador performance, and configure 
            commission structures.
          </p>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Planned features include:</p>
            <ul className="text-sm text-muted-foreground text-left space-y-2 max-w-xs mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-tjb-rose-600 mt-0.5">•</span>
                <span>Create and manage ambassador accounts with unique referral codes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-tjb-rose-600 mt-0.5">•</span>
                <span>Track referrals, conversions, and commission earnings in real time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-tjb-rose-600 mt-0.5">•</span>
                <span>Configure tier-based commission structures and bonus incentives</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-tjb-rose-600 mt-0.5">•</span>
                <span>Export reports and automate payout processing</span>
              </li>
            </ul>
          </div>
          <div className="pt-4">
            <Button variant="outline" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Notify Me When Live
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Have ideas for this feature? Reach out to the product team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}