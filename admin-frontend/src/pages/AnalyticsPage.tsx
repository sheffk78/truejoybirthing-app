import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ExternalLink } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-tjb-charcoal">Analytics</h1>
        <p className="text-muted-foreground mt-1">Website traffic and location analytics</p>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-tjb-lavender-100 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-tjb-lavender-600" />
            </div>
          </div>
          <CardTitle className="text-xl font-semibold">Connect Google Analytics</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4 max-w-md mx-auto">
          <p className="text-muted-foreground">
            Connect your Google Analytics 4 property to view website traffic, 
            user demographics, and location-based insights directly in this dashboard.
          </p>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Once connected, you'll be able to see:
            </p>
            <ul className="text-sm text-muted-foreground text-left space-y-2 max-w-xs mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-tjb-lavender-600 mt-0.5">•</span>
                <span>Page views and unique visitors by location</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-tjb-lavender-600 mt-0.5">•</span>
                <span>User acquisition channels and referral sources</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-tjb-lavender-600 mt-0.5">•</span>
                <span>Geographic distribution of signups and engagement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-tjb-lavender-600 mt-0.5">•</span>
                <span>Real-time active users and session metrics</span>
              </li>
            </ul>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="bg-tjb-lavender-600 hover:bg-tjb-rose-600 text-white">
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect GA4
            </Button>
            <Button variant="outline">
              Learn More
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            This feature is under development. Contact the engineering team to get early access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}