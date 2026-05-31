import { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  UserCheck,
  Pause,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Copy,
  Edit3,
  Save,
  X,
} from 'lucide-react';

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
];

const statusColors: Record<string, string> = {
  APPLIED: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ACTIVE: 'bg-sky-50 text-sky-700 border-sky-200',
  PAUSED: 'bg-gray-50 text-gray-600 border-gray-200',
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = statusColors[status] || 'bg-muted text-muted-foreground border';
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const roleDisplay: Record<string, string> = { DOULA: 'Doula', MIDWIFE: 'Midwife' };
  const roleColors: Record<string, string> = {
    DOULA: 'bg-tjb-rose-100 text-tjb-rose-600 border-tjb-rose-200',
    MIDWIFE: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  const label = roleDisplay[role] || role.charAt(0) + role.slice(1).toLowerCase();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[role] || 'bg-muted text-muted-foreground border'}`}>
      {label}
    </span>
  );
}

interface AmbassadorFormData {
  email: string;
  full_name: string;
  role: string;
  city: string;
  state: string;
  audience_size: string;
}

const emptyForm: AmbassadorFormData = {
  email: '',
  full_name: '',
  role: 'DOULA',
  city: '',
  state: '',
  audience_size: '',
};

export default function AmbassadorsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AmbassadorFormData>(emptyForm);
  const [addError, setAddError] = useState('');

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Detail sheet
  const [detailAmbassador, setDetailAmbassador] = useState<any>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingCouponCodes, setEditingCouponCodes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [couponCodesValue, setCouponCodesValue] = useState('');

  // List query
  const { data, isLoading, error } = useQuery({
    queryKey: ['ambassadors', status, page],
    queryFn: () =>
      api.getAmbassadors({
        status: status || undefined,
        page,
        limit,
      }),
  });

  // Detail query — only when a detail sheet is opened
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['ambassador-detail', detailAmbassador?.id],
    queryFn: () => api.getAmbassador(detailAmbassador.id),
    enabled: !!detailAmbassador,
  });

  const ambassadors = data?.ambassadors || [];

  // Stats computed from list data
  const totalCount = data?.total ?? 0;
  const appliedCount = ambassadors.filter((a: any) => a.status === 'APPLIED').length;
  const activeCount = ambassadors.filter((a: any) => a.status === 'ACTIVE').length;
  const pausedCount = ambassadors.filter((a: any) => a.status === 'PAUSED').length;

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveAmbassador(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.pauseAmbassador(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAmbassador(id),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: AmbassadorFormData) =>
      api.createAmbassador({
        ...data,
        audience_size: data.audience_size ? Number(data.audience_size) : undefined,
      }),
    onSuccess: () => {
      setAddOpen(false);
      setAddForm(emptyForm);
      setAddError('');
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
    },
    onError: (err: any) => {
      setAddError(err.message || 'Failed to create ambassador');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: updateData }: { id: string; data: Record<string, any> }) =>
      api.updateAmbassador(id, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ambassadors'] });
      queryClient.invalidateQueries({ queryKey: ['ambassador-detail'] });
    },
  });

  function openDetail(ambassador: any) {
    setDetailAmbassador(ambassador);
    setEditingNotes(false);
    setEditingCouponCodes(false);
  }

  function startEditNotes() {
    setNotesValue(detailData?.notes || '');
    setEditingNotes(true);
  }

  function saveNotes() {
    if (detailAmbassador) {
      updateMutation.mutate({ id: detailAmbassador.id, data: { notes: notesValue } });
      setEditingNotes(false);
    }
  }

  function startEditCouponCodes() {
    setCouponCodesValue(
      Array.isArray(detailData?.coupon_codes)
        ? detailData.coupon_codes.join(', ')
        : detailData?.coupon_codes || ''
    );
    setEditingCouponCodes(true);
  }

  function saveCouponCodes() {
    if (detailAmbassador) {
      const codes = couponCodesValue
        .split(',')
        .map((c: string) => c.trim())
        .filter(Boolean);
      updateMutation.mutate({ id: detailAmbassador.id, data: { coupon_codes: codes } });
      setEditingCouponCodes(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tjb-charcoal">Ambassadors</h1>
          <p className="text-muted-foreground mt-1">Referral and ambassador program management</p>
        </div>
        <Button
          onClick={() => { setAddForm(emptyForm); setAddError(''); setAddOpen(true); }}
          className="gap-2"
          style={{ backgroundColor: '#2CB67D' }}
        >
          <Plus className="w-4 h-4" />
          Add Ambassador
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard
          title="Total"
          value={isLoading ? '—' : totalCount}
          icon={Users}
          subtitle="All ambassadors"
        />
        <StatsCard
          title="Applied"
          value={isLoading ? '—' : appliedCount}
          icon={AlertTriangle}
          subtitle="Pending review"
        />
        <StatsCard
          title="Active"
          value={isLoading ? '—' : activeCount}
          icon={UserCheck}
          subtitle="Currently active"
        />
        <StatsCard
          title="Paused"
          value={isLoading ? '—' : pausedCount}
          icon={Pause}
          subtitle="Paused ambassadors"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <TabsList className="h-10">
            {statusTabs.map((tab) => (
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
            Failed to load ambassadors. Please try again.
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading ambassadors...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">City/State</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold hidden lg:table-cell">Referral Code</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ambassadors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No ambassadors found
                      </TableCell>
                    </TableRow>
                  ) : (
                    ambassadors.map((ambassador: any) => (
                      <TableRow
                        key={ambassador.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => openDetail(ambassador)}
                      >
                        <TableCell className="font-medium text-tjb-charcoal">
                          {ambassador.full_name || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ambassador.email}
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={ambassador.role} />
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell">
                          {[ambassador.city, ambassador.state].filter(Boolean).join(', ') || '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ambassador.status} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              {ambassador.referral_code || '—'}
                            </code>
                            {ambassador.referral_code && (
                              <button
                                className="p-0.5 hover:bg-muted rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(ambassador.referral_code);
                                }}
                                title="Copy referral code"
                              >
                                <Copy className="w-3 h-3 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="View detail"
                              onClick={() => openDetail(ambassador)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {ambassador.status === 'APPLIED' && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Approve"
                                onClick={() => approveMutation.mutate(ambassador.id)}
                                disabled={approveMutation.isPending}
                                style={{ color: '#2CB67D' }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            {ambassador.status === 'ACTIVE' && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Pause"
                                onClick={() => pauseMutation.mutate(ambassador.id)}
                                disabled={pauseMutation.isPending}
                              >
                                <Pause className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Delete"
                              onClick={() => setDeleteTarget(ambassador)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Add Ambassador Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Ambassador</DialogTitle>
            <DialogDescription>Create a new ambassador for the referral program.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                {addError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                <Input
                  placeholder="Jane Doe"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Role</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="DOULA">Doula</option>
                  <option value="MIDWIFE">Midwife</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Audience Size</label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={addForm.audience_size}
                  onChange={(e) => setAddForm((f) => ({ ...f, audience_size: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">City</label>
                <Input
                  placeholder="Atlanta"
                  value={addForm.city}
                  onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">State</label>
                <Input
                  placeholder="GA"
                  value={addForm.state}
                  onChange={(e) => setAddForm((f) => ({ ...f, state: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(addForm)}
              disabled={createMutation.isPending || !addForm.email || !addForm.full_name}
              style={{ backgroundColor: '#2CB67D' }}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Ambassador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Ambassador</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.full_name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ambassador Detail Sheet */}
      <Sheet open={!!detailAmbassador} onOpenChange={(open) => { if (!open) setDetailAmbassador(null); }}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-lg">
              {detailData?.full_name || detailAmbassador?.full_name || 'Ambassador Detail'}
            </SheetTitle>
            <SheetDescription>
              {detailData?.email || detailAmbassador?.email}
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading details...</div>
          ) : detailData ? (
            <div className="space-y-6 p-4">
              {/* Status & Role */}
              <div className="flex items-center gap-3">
                <StatusBadge status={detailData.status} />
                <RoleBadge role={detailData.role} />
              </div>

              {/* Quick info grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="shadow-none border-border/60">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground font-medium">Location</p>
                    <p className="text-sm font-medium text-tjb-charcoal mt-0.5">
                      {[detailData.city, detailData.state].filter(Boolean).join(', ') || '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-none border-border/60">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground font-medium">Audience Size</p>
                    <p className="text-sm font-medium text-tjb-charcoal mt-0.5">
                      {detailData.audience_size?.toLocaleString() || '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-none border-border/60">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground font-medium">Referral Code</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <code className="text-sm font-mono font-medium text-tjb-charcoal">
                        {detailData.referral_code || '—'}
                      </code>
                      {detailData.referral_code && (
                        <button
                          className="p-0.5 hover:bg-muted rounded"
                          onClick={() => copyToClipboard(detailData.referral_code)}
                          title="Copy"
                        >
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-none border-border/60">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground font-medium">Referrals</p>
                    <p className="text-sm font-medium text-tjb-charcoal mt-0.5">
                      {detailData.referral_count ?? 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Dates */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Dates</p>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    {detailData.created_at
                      ? new Date(detailData.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })
                      : '—'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Approved:</span>{' '}
                    {detailData.approved_at
                      ? new Date(detailData.approved_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Coupon Codes — editable */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Coupon Codes</p>
                  {editingCouponCodes ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={saveCouponCodes} disabled={updateMutation.isPending}>
                        <Save className="w-3.5 h-3.5 text-tjb-charcoal" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditingCouponCodes(false)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="icon-sm" onClick={startEditCouponCodes}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                {editingCouponCodes ? (
                  <Input
                    value={couponCodesValue}
                    onChange={(e) => setCouponCodesValue(e.target.value)}
                    placeholder="Comma-separated codes"
                    className="text-sm"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(detailData.coupon_codes) && detailData.coupon_codes.length > 0 ? (
                      detailData.coupon_codes.map((code: string, i: number) => (
                        <code key={i} className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {code}
                        </code>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No coupon codes set</span>
                    )}
                  </div>
                )}
              </div>

              {/* Notes — editable */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Notes</p>
                  {editingNotes ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={saveNotes} disabled={updateMutation.isPending}>
                        <Save className="w-3.5 h-3.5 text-tjb-charcoal" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditingNotes(false)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="icon-sm" onClick={startEditNotes}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                {editingNotes ? (
                  <textarea
                    className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Add notes about this ambassador..."
                  />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {detailData.notes || 'No notes'}
                  </p>
                )}
              </div>

              {/* Action buttons for the detail view */}
              <div className="flex flex-col gap-2 pt-4 border-t">
                {detailData.status === 'APPLIED' && (
                  <Button
                    className="w-full gap-2"
                    style={{ backgroundColor: '#2CB67D' }}
                    onClick={() => {
                      approveMutation.mutate(detailData.id);
                      setDetailAmbassador(null);
                    }}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Ambassador
                  </Button>
                )}
                {detailData.status === 'ACTIVE' && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      pauseMutation.mutate(detailData.id);
                      setDetailAmbassador(null);
                    }}
                    disabled={pauseMutation.isPending}
                  >
                    <Pause className="w-4 h-4" />
                    Pause Ambassador
                  </Button>
                )}
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => {
                    setDeleteTarget(detailData);
                    setDetailAmbassador(null);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Ambassador
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}