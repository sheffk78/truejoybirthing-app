import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { StatsCard } from '@/components/StatsCard';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  UserPlus,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  MessageSquare,
  Send,
} from 'lucide-react';

const STATUS_VALUES = ['new', 'contacted', 'scheduled', 'completed', 'declined'] as const;

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
];

const statusColors: Record<string, string> = {
  new: 'bg-sky-50 text-sky-700 border-sky-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  scheduled: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-rose-50 text-rose-700 border-rose-200',
};

const leadTypeTabs = [
  { value: '', label: 'All' },
  { value: 'mom', label: 'Moms' },
  { value: 'provider', label: 'Providers' },
];

function StatusBadge({ status }: { status: string }) {
  const colorClass = statusColors[status] || 'bg-muted text-muted-foreground border';
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {label}
    </span>
  );
}

function TypeBadge({ leadType }: { leadType: string }) {
  const isMom = leadType === 'mom';
  const colorClass = isMom
    ? 'bg-tjb-rose-100 text-tjb-rose-600 border-tjb-rose-200'
    : 'bg-tjb-lavender-100 text-tjb-lavender-600 border-tjb-lavender-200';
  const label = isMom ? 'Mom' : 'Provider';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {label}
    </span>
  );
}

function StatusSelect({ status, leadId }: { status: string; leadId: string }) {
  return (
    <select
      className="flex h-8 w-auto rounded-lg border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
      value={status}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('shelbi-status-change', { detail: { leadId, status: e.target.value } }));
      }}
    >
      {STATUS_VALUES.map((s) => (
        <option key={s} value={s}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </option>
      ))}
    </select>
  );
}

export default function ShelbiLeadsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [leadTypeFilter, setLeadTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Detail sheet
  const [detailLead, setDetailLead] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('admin');

  // Stats query
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['shelbi-leads-stats'],
    queryFn: () => api.getShelbiLeadsStats(),
  });

  // List query
  const { data, isLoading, error } = useQuery({
    queryKey: ['shelbi-leads', statusFilter, leadTypeFilter, search, page],
    queryFn: () =>
      api.getShelbiLeads({
        status: statusFilter || undefined,
        lead_type: leadTypeFilter || undefined,
        search: search || undefined,
        page,
        limit,
      }),
  });

  // Detail query — only when a detail sheet is opened
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['shelbi-lead-detail', detailLead?.id],
    queryFn: () => api.getShelbiLead(detailLead.id),
    enabled: !!detailLead,
  });

  const leads = data?.leads || [];

  // Mutations
  const statusMutation = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) =>
      api.updateShelbiLeadStatus(leadId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelbi-leads'] });
      queryClient.invalidateQueries({ queryKey: ['shelbi-leads-stats'] });
      queryClient.invalidateQueries({ queryKey: ['shelbi-lead-detail'] });
    },
  });

  const noteMutation = useMutation({
    mutationFn: ({ leadId, text, author }: { leadId: string; text: string; author: string }) =>
      api.addShelbiLeadNote(leadId, text, author),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelbi-lead-detail'] });
      setNoteText('');
    },
  });

  // Listen for status changes from inline dropdown
  useMemo(() => {
    const handler = (e: Event) => {
      const { leadId, status } = (e as CustomEvent).detail;
      statusMutation.mutate({ leadId, status });
    };
    window.addEventListener('shelbi-status-change', handler);
    return () => window.removeEventListener('shelbi-status-change', handler);
  }, [statusMutation]);

  function openDetail(lead: any) {
    setDetailLead(lead);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function handleAddNote() {
    if (!detailLead || !noteText.trim()) return;
    noteMutation.mutate({
      leadId: detailLead.id,
      text: noteText.trim(),
      author: noteAuthor.trim() || 'admin',
    });
  }

  function handleDetailStatusChange(newStatus: string) {
    if (!detailLead) return;
    statusMutation.mutate({ leadId: detailLead.id, status: newStatus });
  }

  // Format date helper
  function formatDate(dt: string | undefined) {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatDateTime(dt: string | undefined) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-tjb-charcoal">Shelbi Leads</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">CRM for leads from the Shelbi chatbot — moms and providers</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatsCard
          title="Total"
          value={statsLoading ? '—' : (statsData?.total ?? 0)}
          icon={Users}
          subtitle="All leads"
        />
        <StatsCard
          title="New"
          value={statsLoading ? '—' : (statsData?.new ?? 0)}
          icon={UserPlus}
          subtitle="Awaiting contact"
        />
        <StatsCard
          title="Contacted"
          value={statsLoading ? '—' : (statsData?.contacted ?? 0)}
          icon={MessageSquare}
          subtitle="Reached out"
        />
        <StatsCard
          title="Scheduled"
          value={statsLoading ? '—' : (statsData?.scheduled ?? 0)}
          icon={Calendar}
          subtitle="Appointment set"
        />
        <StatsCard
          title="Completed"
          value={statsLoading ? '—' : (statsData?.completed ?? 0)}
          icon={CheckCircle}
          subtitle="Done"
        />
      </div>

      {/* Moms vs Providers breakdown */}
      {statsData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-tjb-rose-600 mb-2">Moms Breakdown</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="text-muted-foreground">Total: <strong className="text-tjb-charcoal">{statsData.moms?.total ?? 0}</strong></span>
                <span className="text-muted-foreground">New: <strong className="text-tjb-charcoal">{statsData.moms?.new ?? 0}</strong></span>
                <span className="text-muted-foreground">Contacted: <strong className="text-tjb-charcoal">{statsData.moms?.contacted ?? 0}</strong></span>
                <span className="text-muted-foreground">Scheduled: <strong className="text-tjb-charcoal">{statsData.moms?.scheduled ?? 0}</strong></span>
                <span className="text-muted-foreground">Completed: <strong className="text-tjb-charcoal">{statsData.moms?.completed ?? 0}</strong></span>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-tjb-lavender-600 mb-2">Providers Breakdown</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="text-muted-foreground">Total: <strong className="text-tjb-charcoal">{statsData.providers?.total ?? 0}</strong></span>
                <span className="text-muted-foreground">New: <strong className="text-tjb-charcoal">{statsData.providers?.new ?? 0}</strong></span>
                <span className="text-muted-foreground">Contacted: <strong className="text-tjb-charcoal">{statsData.providers?.contacted ?? 0}</strong></span>
                <span className="text-muted-foreground">Scheduled: <strong className="text-tjb-charcoal">{statsData.providers?.scheduled ?? 0}</strong></span>
                <span className="text-muted-foreground">Completed: <strong className="text-tjb-charcoal">{statsData.providers?.completed ?? 0}</strong></span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Status tabs */}
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <TabsList className="h-10 whitespace-nowrap">
              {statusTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Lead type toggle + search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="overflow-x-auto -mx-1 px-1 pb-1 w-full sm:w-auto">
            <Tabs value={leadTypeFilter} onValueChange={(v) => { setLeadTypeFilter(v); setPage(1); }}>
              <TabsList className="h-10 whitespace-nowrap">
                {leadTypeTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" className="shrink-0">
              Search
            </Button>
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              >
                Clear
              </Button>
            )}
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl bg-white overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-destructive">
            Failed to load leads. Please try again.
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading leads...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Email</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Topic</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Created</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No leads found
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead: any) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => openDetail(lead)}
                      >
                        <TableCell className="font-medium text-tjb-charcoal">
                          {lead.name || '—'}
                        </TableCell>
                        <TableCell>
                          <TypeBadge leadType={lead.lead_type} />
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell">
                          {lead.email || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell">
                          {lead.phone || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell">
                          {lead.topic || '—'}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <StatusSelect status={lead.status} leadId={lead.id} />
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell">
                          {formatDate(lead.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="View detail"
                              onClick={() => openDetail(lead)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Lead Detail Sheet */}
      <Sheet open={!!detailLead} onOpenChange={(open) => { if (!open) setDetailLead(null); }}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-lg">
              {detailData?.name || detailLead?.name || 'Lead Detail'}
            </SheetTitle>
            <SheetDescription>
              {detailData?.email || detailLead?.email || 'No email provided'}
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading details...</div>
          ) : detailData ? (
            <div className="space-y-6 p-4">
              {/* Status & Type badges */}
              <div className="flex items-center gap-3">
                <StatusBadge status={detailData.status} />
                <TypeBadge leadType={detailData.lead_type} />
              </div>

              {/* Status changer */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Change Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_VALUES.map((s) => (
                    <Button
                      key={s}
                      variant={detailData.status === s ? 'default' : 'outline'}
                      size="sm"
                      disabled={statusMutation.isPending || detailData.status === s}
                      onClick={() => handleDetailStatusChange(s)}
                      className="capitalize"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quick info grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="shadow-none border-border/60">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground font-medium">Email</p>
                    <p className="text-sm font-medium text-tjb-charcoal mt-0.5 break-all">
                      {detailData.email || '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-none border-border/60">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground font-medium">Phone</p>
                    <p className="text-sm font-medium text-tjb-charcoal mt-0.5">
                      {detailData.phone || '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-none border-border/60">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground font-medium">Topic</p>
                    <p className="text-sm font-medium text-tjb-charcoal mt-0.5">
                      {detailData.topic || '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-none border-border/60">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground font-medium">Lead Type</p>
                    <p className="text-sm font-medium text-tjb-charcoal mt-0.5 capitalize">
                      {detailData.lead_type || '—'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional info if present */}
              {detailData.message && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Initial Message</p>
                  <p className="text-sm text-tjb-charcoal whitespace-pre-wrap bg-muted/30 rounded-lg p-3 border border-border/60">
                    {detailData.message}
                  </p>
                </div>
              )}

              {detailData.metadata && Object.keys(detailData.metadata).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Additional Data</p>
                  <pre className="text-xs bg-muted/30 rounded-lg p-3 border border-border/60 overflow-x-auto">
                    {JSON.stringify(detailData.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Dates */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Dates</p>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    {formatDateTime(detailData.created_at)}
                  </p>
                  {detailData.updated_at && (
                    <p>
                      <span className="text-muted-foreground">Updated:</span>{' '}
                      {formatDateTime(detailData.updated_at)}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes timeline */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium">Notes Timeline</p>
                {Array.isArray(detailData.notes) && detailData.notes.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {[...detailData.notes].reverse().map((note: any, i: number) => (
                      <div key={note.id || i} className="border-l-2 border-tjb-lavender-200 pl-3 py-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-tjb-lavender-600">
                            {note.author || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(note.created_at || note.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-tjb-charcoal whitespace-pre-wrap">{note.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                )}

                {/* Add note */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Author name"
                      value={noteAuthor}
                      onChange={(e) => setNoteAuthor(e.target.value)}
                      className="w-32 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddNote();
                        }
                      }}
                      className="flex-1 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={noteMutation.isPending || !noteText.trim()}
                      style={{ backgroundColor: '#2CB67D' }}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      {noteMutation.isPending ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}