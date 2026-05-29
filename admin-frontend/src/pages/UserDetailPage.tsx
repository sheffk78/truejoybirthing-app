import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Mail,
  Calendar,
  CreditCard,
  Shield,
  User,
} from 'lucide-react';

const subscriptionStatusColors: Record<string, string> = {
  TRIAL: 'bg-tjb-teal/10 text-tjb-teal border-tjb-teal/20',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAST_DUE: 'bg-amber-50 text-amber-700 border-amber-200',
  CANCELED: 'bg-gray-50 text-gray-600 border-gray-200',
  FREE: 'bg-gray-50 text-gray-600 border-gray-200',
};

const roleColors: Record<string, string> = {
  MOM: 'bg-tjb-teal/10 text-tjb-teal border-tjb-teal/20',
  DOULA: 'bg-tjb-coral/10 text-tjb-coral border-tjb-coral/20',
  MIDWIFE: 'bg-purple-50 text-purple-700 border-purple-200',
  ADMIN: 'bg-tjb-dark/10 text-tjb-dark border-tjb-dark/20',
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => api.getUser(id!),
    enabled: !!id,
  });

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/users')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Button>
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          Failed to load user data. The user may not exist.
        </div>
      </div>
    );
  }

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/users')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Button>
        <div className="text-center py-12 text-muted-foreground">Loading user profile...</div>
      </div>
    );
  }

  const initials = (user.full_name || user.name || user.email || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const subStatus = user.subscription_status || 'FREE';
  const subColor = subscriptionStatusColors[subStatus] || 'bg-muted text-muted-foreground border';
  const roleLabel = user.role === 'MOM' ? 'Mom' : (user.role || 'User').charAt(0) + (user.role || 'User').slice(1).toLowerCase();
  const roleColor = roleColors[user.role] || 'bg-muted text-muted-foreground border';

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin/users')} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Button>

      {/* Profile header */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-16 w-16 text-xl">
              <AvatarFallback className="bg-tjb-teal/10 text-tjb-teal font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 flex-1">
              <h1 className="text-2xl font-bold text-tjb-dark">
                {user.full_name || user.name || 'Unnamed User'}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColor}`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {roleLabel}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${subColor}`}>
                  <CreditCard className="h-3 w-3 mr-1" />
                  {subStatus === 'TRIAL' ? 'Trial' : subStatus.charAt(0) + subStatus.slice(1).toLowerCase().replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact info */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-tjb-teal" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm font-medium">{user.phone}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Joined</span>
              <span className="text-sm font-medium">
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Unknown'}
              </span>
            </div>
            {user.last_login && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Login</span>
                <span className="text-sm font-medium">
                  {new Date(user.last_login).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription info */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-tjb-teal" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${subColor}`}>
                {subStatus === 'TRIAL' ? 'Trial' : subStatus.charAt(0) + subStatus.slice(1).toLowerCase().replace('_', ' ')}
              </span>
            </div>
            {user.subscription_plan && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="text-sm font-medium capitalize">{user.subscription_plan}</span>
              </div>
            )}
            {user.trial_start_date && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Trial Start</span>
                <span className="text-sm font-medium">
                  {new Date(user.trial_start_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {user.trial_end_date && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Trial End</span>
                <span className="text-sm font-medium">
                  {new Date(user.trial_end_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {user.subscription_start_date && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subscription Start</span>
                <span className="text-sm font-medium">
                  {new Date(user.subscription_start_date).toLocaleDateString()}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Stripe Customer ID</span>
              <span className="text-sm font-mono text-muted-foreground">
                {user.stripe_customer_id || '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Role-specific info */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-tjb-teal" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Role</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColor}`}>
                {roleLabel}
              </span>
            </div>
            {user.location && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Location</span>
                <span className="text-sm font-medium">{user.location}</span>
              </div>
            )}
            {user.bio && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Bio</span>
                <p className="text-sm">{user.bio}</p>
              </div>
            )}
            {user.certifications && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Certifications</span>
                <span className="text-sm font-medium">{user.certifications}</span>
              </div>
            )}
            {user.due_date && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Due Date</span>
                <span className="text-sm font-medium">
                  {new Date(user.due_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {user.number_of_children !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Children</span>
                <span className="text-sm font-medium">{user.number_of_children}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-tjb-teal" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Email Verified</span>
              <Badge variant={user.is_verified || user.email_verified ? 'default' : 'secondary'} className="text-xs">
                {user.is_verified || user.email_verified ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Account Active</span>
              <Badge variant={user.is_active !== false ? 'default' : 'secondary'} className="text-xs">
                {user.is_active !== false ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {user.login_count !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Login Count</span>
                <span className="text-sm font-medium">{user.login_count}</span>
              </div>
            )}
            {user.last_active && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Active</span>
                <span className="text-sm font-medium">
                  {new Date(user.last_active).toLocaleDateString()}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">User ID</span>
              <span className="text-xs font-mono text-muted-foreground">{user.id}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}