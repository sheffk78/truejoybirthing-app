import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ApprovalItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { StatsCard } from '@/components/StatsCard';
import {
  MessageSquare,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

const URGENCY_ORDER = ['critical', 'high', 'normal', 'low'] as const;

const urgencyColors: Record<string, string> = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  normal: 'bg-tjb-lavender-100 text-tjb-lavender-600 border-tjb-lavender-200',
  low: 'bg-muted text-muted-foreground border',
};

const decisionColors: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-rose-50 text-rose-700 border-rose-200',
};

const stateTabs = [
  { value: 'pending', label: 'Pending' },
  { value: 'decided', label: 'Decided' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'cancelled', label: 'Cancelled' },
];

function UrgencyBadge({ urgency }: { urgency: string }) {
  const colorClass = urgencyColors[urgency] || 'bg-muted text-muted-foreground border';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
    </span>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const colorClass = decisionColors[decision] || 'bg-muted text-muted-foreground border';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {decision === 'approved' ? 'Approved' : 'Declined'}
    </span>
  );
}

function StateBadge({ state }: { state: string }) {
  const map: Record<string, string> = {
    pending: 'bg-sky-50 text-sky-700 border-sky-200',
    decided: 'bg-amber-50 text-amber-700 border-amber-200',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-muted text-muted-foreground border',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[state] || 'bg-muted text-muted-foreground border'}`}>
      {state.charAt(0).toUpperCase() + state.slice(1)}
    </span>
  );
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [stateFilter, setStateFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Detail sheet
  const [detailItem, setDetailItem] = useState<ApprovalItem | null>(null);
  const [noteText, setNoteText] = useState('');

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['approvals-stats'],
    queryFn: () => api.getApprovalStats(),
    refetchInterval: 60_000,
  });

  // List
  const { data, isLoading, error } = useQuery({
    queryKey: ['approvals', stateFilter, page],
    queryFn: () =>
      api.getApprovals({
        state: stateFilter,
        page,
        limit,
        include_expired: stateFilter !== 'pending',
      }),
    refetchInterval: 60_000,
  });

  const items = data?.items || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['approvals'] });
    queryClient.invalidateQueries({ queryKey: ['approvals-stats'] });
  };

  const decideMutation = useMutation({
    mutationFn: ({ itemId, decision, note }: { itemId: string; decision: 'approved' | 'declined'; note?: string }) =>
      api.decideApproval(itemId, decision, note),
    onSuccess: invalidateAll,
  });

  const cancelMutation = useMutation({
    mutationFn: (itemId: string) => api.cancelApproval(itemId),
    onSuccess: invalidateAll,
  });

  // Relay Jeff's typed message to Kit via Discord (#truejoybirthing-main)
  const respondMutation = useMutation({
    mutationFn: ({ itemId, message }: { itemId: string; message: string }) =>
      api.respondApproval(itemId, message),
    onSuccess: () => {
      invalidateAll();
      setRespondText('');
      setRespondSentFor(detailItem?.item_id ?? null);
    },
  });

  const [respondText, setRespondText] = useState('');
  const [respondSentFor, setRespondSentFor] = useState<string | null>(null);

  const handleDecide = (item: ApprovalItem, decision: 'approved' | 'declined') => {
    decideMutation.mutate({ itemId: item.item_id, decision, note: noteText || undefined });
    setNoteText('');
    setDetailItem(null);
  };

  const handleRespond = (item: ApprovalItem) => {
    const msg = respondText.trim();
    if (!msg) return;
    respondMutation.mutate({ itemId: item.item_id, message: msg });
  };

  // Sort pending by urgency rank then newest
  const sorted = [...items].sort((a, b) => {
    if (stateFilter !== 'pending') return 0;
    const ra = URGENCY_ORDER.indexOf(a.urgency as typeof URGENCY_ORDER[number]);
    const rb = URGENCY_ORDER.indexOf(b.urgency as typeof URGENCY_ORDER[number]);
    if (ra !== rb) return ra - rb;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-tjb-charcoal">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Approve or decline items queued by Kit and automations. Decisions are recorded and
          automations unblock automatically.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Pending"
          value={stats?.pending ?? '—'}
          subtitle="Awaiting decision"
          icon={ClipboardCheck}
        />
        <StatsCard
          title="Critical"
          value={stats?.by_urgency?.critical ?? 0}
          subtitle="High-priority pending"
          icon={AlertTriangle}
        />
        <StatsCard
          title="Decided"
          value={stats?.decided_total ?? '—'}
          subtitle="Awaiting requester action"
          icon={CheckCircle}
        />
        <StatsCard
          title="Resolved"
          value={stats?.resolved_total ?? '—'}
          subtitle="Completed loop"
          icon={Archive}
        />
      </div>

      {/* Queue */}
      <Tabs value={stateFilter} onValueChange={(v) => { setStateFilter(v); setPage(1); }}>
        <TabsList>
          {stateTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-lg border border-border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Urgency</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="w-28">Kind</TableHead>
              <TableHead className="w-28">Source</TableHead>
              <TableHead className="w-36">Created</TableHead>
              <TableHead className="w-56 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-destructive">
                  Failed to load approvals — retry shortly.
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nothing here. Queue is clear.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((item) => (
                <TableRow key={item.item_id}>
                  <TableCell>
                    <UrgencyBadge urgency={item.urgency} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-tjb-charcoal">{item.title}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                        {item.description}
                      </div>
                    )}
                    {item.state !== 'pending' && item.decision && (
                      <div className="mt-1 flex items-center gap-2">
                        <DecisionBadge decision={item.decision} />
                        {item.decided_by && (
                          <span className="text-xs text-muted-foreground">by {item.decided_by}</span>
                        )}
                      </div>
                    )}
                    {item.state !== 'pending' && !item.decision && (
                      <div className="mt-1">
                        <StateBadge state={item.state} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{item.kind || '—'}</TableCell>
                  <TableCell className="text-sm">{item.source || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fmtDate(item.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setDetailItem(item); setNoteText(''); }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {item.state === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={decideMutation.isPending}
                            onClick={() => handleDecide(item, 'approved')}
                          >
                            <ThumbsUp className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={decideMutation.isPending}
                            onClick={() => handleDecide(item, 'declined')}
                          >
                            <ThumbsDown className="w-4 h-4 mr-1" /> Decline
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Detail sheet */}
      <Sheet open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detailItem && (
            <>
              <SheetHeader>
                <SheetTitle className="text-tjb-charcoal">{detailItem.title}</SheetTitle>
                <SheetDescription>
                  {detailItem.kind ? `${detailItem.kind} · ` : ''}
                  {detailItem.source || 'unknown source'} ·{' '}
                  {fmtDate(detailItem.created_at)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {detailItem.description && (
                  <div className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap">
                    {detailItem.description}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <UrgencyBadge urgency={detailItem.urgency} />
                  {detailItem.state !== 'pending' && (
                    <StateBadge state={detailItem.state} />
                  )}
                  {detailItem.decision && <DecisionBadge decision={detailItem.decision} />}
                  {detailItem.audience?.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      audience: {detailItem.audience.join(', ')}
                    </span>
                  )}
                </div>

                {detailItem.decided_at && (
                  <div className="text-sm text-muted-foreground">
                    Decided by <span className="font-medium text-tjb-charcoal">{detailItem.decided_by}</span>{' '}
                    on {fmtDate(detailItem.decided_at)}
                    {detailItem.decision_note ? ` — “${detailItem.decision_note}”` : ''}
                  </div>
                )}

                {detailItem.payload && Object.keys(detailItem.payload).length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Context
                    </div>
                    <pre className="rounded-lg bg-tjb-charcoal text-tjb-cream p-4 text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(detailItem.payload, null, 2)}
                    </pre>
                  </div>
                )}

                {detailItem.state === 'pending' && (
                  <div className="space-y-3 border-t border-border pt-4">
                    {/* Respond to Kit — relays Jeff's typed message to #truejoybirthing-main in Discord */}
                    <div className="space-y-2 rounded-lg bg-tjb-lavender-50 border border-tjb-lavender-200 p-3">
                      <p className="text-xs font-medium text-tjb-lavender-600">Respond to Kit</p>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Type instructions for Kit — e.g. “Do it, but skip the TikTok post.” Kit will pick this up in Discord and act on it."
                        value={respondSentFor === detailItem.item_id ? '' : respondText}
                        onChange={(e) => setRespondText(e.target.value)}
                        rows={3}
                      />
                      <Button
                        size="sm"
                        disabled={respondMutation.isPending || !respondText.trim() || respondSentFor === detailItem.item_id}
                        onClick={() => handleRespond(detailItem)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {respondMutation.isPending ? 'Sending…' : 'Send to Kit in Discord'}
                      </Button>
                      {respondSentFor === detailItem.item_id && (
                        <p className="text-xs text-emerald-700">Sent — Kit will pick it up in #truejoybirthing-main.</p>
                      )}
                    </div>

                    <textarea
                      className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Optional note recorded with your decision (e.g. why declined, conditions on approval)…"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={decideMutation.isPending}
                        onClick={() => handleDecide(detailItem, 'approved')}
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" /> Approve
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={decideMutation.isPending}
                        onClick={() => handleDecide(detailItem, 'declined')}
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" /> Decline
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      disabled={cancelMutation.isPending}
                      onClick={() => {
                        cancelMutation.mutate(detailItem.item_id);
                        setDetailItem(null);
                      }}
                    >
                      Cancel this item (no decision needed)
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}