import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Users,
  Eye,
  ArrowDownUp,
  Clock,
  BarChart3,
  MapPin,
} from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  Skeleton placeholder                                               */
/* ------------------------------------------------------------------ */

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className}`}
    />
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="shadow-sm border-border/60">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 w-3/4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56 mt-1" />
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

function SkeletonTable() {
  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Connect GA4 card (shown on 503)                                   */
/* ------------------------------------------------------------------ */

function ConnectGA4Card() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-tjb-charcoal">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Website traffic and location analytics
        </p>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-tjb-lavender-100 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-tjb-lavender-600" />
            </div>
          </div>
          <CardTitle className="text-xl font-semibold">
            Connect Google Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4 max-w-md mx-auto">
          <p className="text-muted-foreground">
            The analytics service is not available. A Google Analytics 4
            service account must be configured on the backend to enable
            real-time traffic insights.
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
          <p className="text-xs text-muted-foreground pt-2">
            Contact the engineering team to configure the GA4 service account
            and enable this feature.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main AnalyticsPage                                                 */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  /* ---- queries ---- */

  const overviewQuery = useQuery({
    queryKey: ['analytics-overview', period],
    queryFn: () => api.getAnalyticsOverview(period),
    retry: false,
  });

  const trafficQuery = useQuery({
    queryKey: ['analytics-traffic', period],
    queryFn: () => api.getAnalyticsTraffic(period),
    retry: false,
  });

  const pagesQuery = useQuery({
    queryKey: ['analytics-pages', period],
    queryFn: () => api.getAnalyticsPages(period),
    retry: false,
  });

  const geographyQuery = useQuery({
    queryKey: ['analytics-geography', period],
    queryFn: () => api.getAnalyticsGeography(period),
    retry: false,
  });

  const acquisitionQuery = useQuery({
    queryKey: ['analytics-acquisition', period],
    queryFn: () => api.getAnalyticsAcquisition(period),
    retry: false,
  });

  const locationPagesQuery = useQuery({
    queryKey: ['analytics-location-pages', period],
    queryFn: () => api.getAnalyticsLocationPages(period),
    retry: false,
  });

  /* ---- 503 check ---- */

  const is503 = (err: unknown) =>
    err instanceof ApiError && err.status === 503;

  if (
    is503(overviewQuery.error) ||
    is503(trafficQuery.error) ||
    is503(pagesQuery.error)
  ) {
    return <ConnectGA4Card />;
  }

  /* ---- derived data ---- */

  const overview = overviewQuery.data as any;
  const traffic = (trafficQuery.data as Array<any>) || [];
  const topPages = (pagesQuery.data as Array<any>) || [];
  const geography = (geographyQuery.data as Array<any>) || [];
  const acquisition = (acquisitionQuery.data as Array<any>) || [];
  const locationPagesData = (locationPagesQuery.data as any) || { location_pages: [], total_location_pageviews: 0, count: 0 };

  const chartData = traffic.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    Pageviews: d.pageviews ?? 0,
    Users: d.users ?? 0,
  }));

  /* ---- render ---- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tjb-charcoal">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Website traffic and location analytics
          </p>
        </div>

        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as '7d' | '30d' | '90d')}
        >
          <TabsList>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
            <TabsTrigger value="90d">90 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Overview stat cards */}
      {overviewQuery.isLoading ? (
        <SkeletonCards />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Active Users"
            value={formatNumber(overview?.active_users ?? 0)}
            icon={Users}
            subtitle={`Last ${period === '7d' ? '7' : period === '90d' ? '90' : '30'} days`}
          />
          <StatsCard
            title="Pageviews"
            value={formatNumber(overview?.pageviews ?? 0)}
            icon={Eye}
            subtitle="Total views"
          />
          <StatsCard
            title="Bounce Rate"
            value={
              overview?.bounce_rate != null
                ? formatPercent(overview.bounce_rate)
                : '—'
            }
            icon={ArrowDownUp}
            subtitle="Percentage"
          />
          <StatsCard
            title="Avg Session"
            value={
              overview?.avg_session_duration != null
                ? formatDuration(overview.avg_session_duration)
                : '—'
            }
            icon={Clock}
            subtitle="mm:ss"
          />
        </div>
      )}

      {/* Traffic trend chart */}
      {trafficQuery.isLoading ? (
        <SkeletonChart />
      ) : (
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-tjb-charcoal">
              Traffic Trend
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Daily pageviews &amp; active users
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {trafficQuery.error ? (
              <div className="h-[300px] flex items-center justify-center text-destructive text-sm">
                Failed to load traffic data
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No traffic data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow:
                        '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Pageviews"
                    stroke="#6D28D9"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Users"
                    stroke="#1A1A2E"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Two-column: Top Pages + Top Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pagesQuery.isLoading ? (
          <SkeletonTable />
        ) : (
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-tjb-charcoal">
                Top Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Bounce Rate</TableHead>
                    <TableHead className="text-right">Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPages.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        No page data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    topPages.map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {p.page_path || p.page}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(p.pageviews ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.bounce_rate != null
                            ? formatPercent(p.bounce_rate)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.avg_time_on_page != null
                            ? formatDuration(p.avg_time_on_page)
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {acquisitionQuery.isLoading ? (
          <SkeletonTable />
        ) : (
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-tjb-charcoal">
                Top Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Bounce Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acquisition.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        No acquisition data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    acquisition.map((s: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {s.source || s.medium || 'Direct'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(s.users ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(s.sessions ?? 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.bounce_rate != null
                            ? formatPercent(s.bounce_rate)
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Location Pages table */}
      {locationPagesQuery.isLoading ? (
        <SkeletonTable />
      ) : (
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-tjb-lavender-600" />
              <CardTitle className="text-lg font-semibold text-tjb-charcoal">
                Top Location Pages
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              City & state birth support pages — your local SEO footprint
            </p>
          </CardHeader>
          <CardContent>
            {locationPagesData.count > 0 && (
              <div className="mb-4 flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  Total pageviews: <span className="font-semibold text-tjb-charcoal">{formatNumber(locationPagesData.total_location_pageviews)}</span>
                </span>
                <span className="text-muted-foreground">
                  Location pages with traffic: <span className="font-semibold text-tjb-charcoal">{locationPagesData.count}</span>
                </span>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Pageviews</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Active Users</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locationPagesData.location_pages.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      No location page traffic yet. As your /birth-support/ pages get indexed and ranked, they'll appear here.
                    </TableCell>
                  </TableRow>
                ) : (
                  locationPagesData.location_pages.map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        <a
                          href={`https://truejoybirthing.com${p.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-tjb-lavender-600 hover:underline"
                        >
                          {p.path}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {p.title}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(p.pageviews ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(p.sessions ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(p.active_users ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Geography table */}
      {geographyQuery.isLoading ? (
        <SkeletonTable />
      ) : (
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-tjb-charcoal">
              Geography
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Pageviews</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {geography.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      No geographic data available
                    </TableCell>
                  </TableRow>
                ) : (
                  geography.map((g: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {g.country || '—'}
                      </TableCell>
                      <TableCell>{g.region || g.city || '—'}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(g.users ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(g.sessions ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(g.pageviews ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}