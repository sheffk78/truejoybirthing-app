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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const roleColors: Record<string, string> = {
  MOM: '#2CB67D',
  DOULA: '#E85D4A',
  MIDWIFE: '#4FD19B',
  ADMIN: '#1A1A2E',
};

export function SignupTrendChart() {
  const { data: trendData, isLoading, error } = useQuery({
    queryKey: ['signup-trend'],
    queryFn: () => api.getSignupTrend(),
  });

  if (error) {
    return (
      <Card className="shadow-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Signup Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load trend data</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = (trendData || []).map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Total: d.total,
    MOM: d.MOM,
    DOULA: d.DOULA,
    MIDWIFE: d.MIDWIFE,
    ADMIN: d.ADMIN,
  }));

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Signup Trend</CardTitle>
        <p className="text-sm text-muted-foreground">Last 30 days by role</p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              />
              <Line
                type="monotone"
                dataKey="Total"
                stroke="#1A1A2E"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line type="monotone" dataKey="MOM" stroke={roleColors.MOM} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="DOULA" stroke={roleColors.DOULA} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="MIDWIFE" stroke={roleColors.MIDWIFE} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}