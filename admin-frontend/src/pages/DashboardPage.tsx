import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatsCard } from '@/components/StatsCard';
import { SignupTrendChart } from '@/components/SignupTrendChart';
import { Users, UserCheck, Crown, TrendingUp, UserPlus } from 'lucide-react';

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getStats(),
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-tjb-charcoal">Dashboard</h1>
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          Failed to load dashboard data. Please try refreshing the page.
        </div>
      </div>
    );
  }

  const roleBreakdown = stats?.users_by_role || {};
  const subscriptionBreakdown = stats?.subscription_breakdown || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-tjb-charcoal">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your True Joy Birthing platform</p>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={isLoading ? '—' : (stats?.total_users ?? 0).toLocaleString()}
          icon={Users}
          subtitle="Excludes test accounts"
        />
        <StatsCard
          title="New This Week"
          value={isLoading ? '—' : (stats?.signups_last_7_days ?? 0).toLocaleString()}
          icon={UserPlus}
          subtitle="Last 7 days"
        />
        <StatsCard
          title="New This Month"
          value={isLoading ? '—' : (stats?.signups_last_30_days ?? 0).toLocaleString()}
          icon={TrendingUp}
          subtitle="Last 30 days"
        />
        <StatsCard
          title="Trial Conversion"
          value={isLoading ? '—' : `${((stats?.trial_conversion_rate ?? 0) * 100).toFixed(1)}%`}
          icon={Crown}
          subtitle="Trial to paid"
        />
      </div>

      {/* Role breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-tjb-charcoal">Users by Role</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(roleBreakdown).map(([role, count]) => (
              <StatsCard
                key={role}
                title={role === 'MOM' ? 'Moms' : role.charAt(0) + role.slice(1).toLowerCase()}
                value={count}
                icon={role === 'MOM' ? Users : UserCheck}
                className="bg-white"
              />
            ))}
          </div>
        </div>

        {/* Subscription breakdown */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-tjb-charcoal">Subscription Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(subscriptionBreakdown).map(([status, count]) => {
              const statusColors: Record<string, string> = {
                TRIAL: 'bg-tjb-lavender-100 text-tjb-lavender-600 border-tjb-lavender-300',
                ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                PAST_DUE: 'bg-amber-50 text-amber-700 border-amber-200',
                CANCELED: 'bg-gray-50 text-gray-600 border-gray-200',
              };
              return (
                <div
                  key={status}
                  className={`p-4 rounded-xl border ${statusColors[status] || 'bg-muted text-muted-foreground border-border'}`}
                >
                  <p className="text-sm font-medium">
                    {status === 'TRIAL' ? 'Trial' : status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
                  </p>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Signup trend chart */}
      <SignupTrendChart />
    </div>
  );
}