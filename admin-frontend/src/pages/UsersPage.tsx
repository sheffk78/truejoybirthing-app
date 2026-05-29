import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const roleTabs = [
  { value: '', label: 'All' },
  { value: 'MOM', label: 'Moms' },
  { value: 'DOULA', label: 'Doulas' },
  { value: 'MIDWIFE', label: 'Midwives' },
];

const subscriptionStatusColors: Record<string, string> = {
  TRIAL: 'bg-tjb-lavender-100 text-tjb-lavender-600 border-tjb-lavender-300',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAST_DUE: 'bg-amber-50 text-amber-700 border-amber-200',
  CANCELED: 'bg-gray-50 text-gray-600 border-gray-200',
  FREE: 'bg-gray-50 text-gray-600 border-gray-200',
};

function SubscriptionBadge({ status }: { status: string }) {
  const colorClass = subscriptionStatusColors[status] || 'bg-muted text-muted-foreground border';
  const label = status === 'TRIAL' ? 'Trial' : status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const roleColors: Record<string, string> = {
    MOM: 'bg-tjb-lavender-100 text-tjb-lavender-600 border-tjb-lavender-300',
    DOULA: 'bg-tjb-rose-100 text-tjb-rose-600 border-tjb-rose-200',
    MIDWIFE: 'bg-purple-50 text-purple-700 border-purple-200',
    ADMIN: 'bg-tjb-charcoal/10 text-tjb-charcoal border-tjb-charcoal/20',
  };
  const label = role === 'MOM' ? 'Mom' : role.charAt(0) + role.slice(1).toLowerCase();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[role] || 'bg-muted text-muted-foreground border'}`}>
      {label}
    </span>
  );
}

export default function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    const timer = setTimeout(() => setSearchDebounced(value), 300);
    return () => clearTimeout(timer);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', searchDebounced, role, page],
    queryFn: () =>
      api.getUsers({
        q: searchDebounced || undefined,
        role: role || undefined,
        page,
        limit,
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-tjb-charcoal">Users</h1>
        <p className="text-muted-foreground mt-1">Manage and view all platform users</p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Tabs value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
          <TabsList className="h-10">
            {roleTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <div className="border rounded-xl bg-white overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-destructive">
            Failed to load users. Please try again.
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading users...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Subscription</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.users?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.users?.map((user: any) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                      >
                        <TableCell className="font-medium text-tjb-charcoal">
                          {user.full_name || user.name || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell>
                          <SubscriptionBadge status={user.subscription_status || 'FREE'} />
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)} of {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Prev
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {data.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}