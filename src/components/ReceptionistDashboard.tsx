import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Clock,
  Droplets,
  Layers,
  UserCheck,
  Package,
  User,
  FileText,
  Plus,
  RotateCcw,
  Edit2,
  Trash2,
  CalendarX2,
  CheckCircle2,
  AlertCircle,
  Activity,
  Inbox,
} from 'lucide-react';
import { ayurEngine } from '../services/engine';
import type {
  Booking,
  InventoryItem,
  ResourceRoom,
  Therapist,
  RealtimeAuditLog,
} from '../types/ayursutra';
import { MedicalReportModal } from './MedicalReportModal';
import {
  PageHeader,
  SectionHeader,
  StatCard,
  Card,
  Button,
  IconButton,
  Badge,
  StatusBadge,
  SearchInput,
  FilterChip,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
  Modal,
} from './ui';

type DeskSubTab = 'queue' | 'inventory' | 'rooms' | 'therapists';

export const ReceptionistDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>(() => ayurEngine.getBookings());
  const [inventory, setInventory] = useState<InventoryItem[]>(() => ayurEngine.getInventory());
  const [rooms, setRooms] = useState<ResourceRoom[]>(() => ayurEngine.getRooms());
  const [therapists, setTherapists] = useState<Therapist[]>(() => ayurEngine.getTherapists());
  const [auditLogs, setAuditLogs] = useState<RealtimeAuditLog[]>(() => ayurEngine.getAuditLogs());

  const [activeSubTab, setActiveSubTab] = useState<DeskSubTab>('queue');

  // Queue state
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportBooking, setSelectedReportBooking] = useState<Booking | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    id: string;
    success: boolean;
    message: string;
  } | null>(null);

  // Rejection dialog
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState('Therapist emergency reassignment');

  // Inventory CRUD modal state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    item_name: '',
    category: 'Medicated Oil',
    stock_ml: 2500,
    min_threshold_ml: 500,
    unit: 'mL',
    batch_number: '',
    description: 'Traditional classical Ayurvedic formulation for Panchakarma procedures.',
  });

  // Quick restock modal
  const [restockModalItem, setRestockModalItem] = useState<InventoryItem | null>(null);
  const [restockAmount, setRestockAmount] = useState(1000);

  // Room edit modal
  const [editingRoom, setEditingRoom] = useState<ResourceRoom | null>(null);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    room_name: '',
    room_code: '',
    room_type: 'Traditional Droni Suite',
    droni_wood: 'Teak Wood (Sagwan)',
    is_operational: true,
    maintenance_status: 'Operational' as ResourceRoom['maintenance_status'],
  });

  // Therapist edit modal
  const [editingTherapist, setEditingTherapist] = useState<Therapist | null>(null);

  useEffect(() => {
    return ayurEngine.subscribe(() => {
      setBookings(ayurEngine.getBookings());
      setInventory(ayurEngine.getInventory());
      setRooms(ayurEngine.getRooms());
      setTherapists(ayurEngine.getTherapists());
      setAuditLogs(ayurEngine.getAuditLogs());
    });
  }, []);

  // Filter bookings (preserved)
  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      b.client_name.toLowerCase().includes(q) ||
      b.booking_ref.toLowerCase().includes(q) ||
      (b.therapy?.name || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingBookings = bookings.filter((b) => b.status === 'Pending');
  const confirmedToday = bookings.filter((b) => b.status === 'Confirmed');
  const lowStockItems = inventory.filter((i) => i.stock_ml <= i.min_threshold_ml);

  // Handle Approve RPC (preserved)
  const handleApprove = async (bookingId: string) => {
    setApprovingId(bookingId);
    setActionFeedback(null);
    const result = await ayurEngine.approveBookingRPC(bookingId);
    setApprovingId(null);
    setActionFeedback({ id: bookingId, success: result.success, message: result.message });
    setTimeout(() => {
      setActionFeedback((prev) => (prev?.id === bookingId ? null : prev));
    }, 4000);
  };

  // Handle Reject RPC (preserved)
  const handleRejectConfirm = async () => {
    if (!rejectingBooking) return;
    await ayurEngine.rejectBookingRPC(rejectingBooking.id, rejectReason);
    setRejectingBooking(null);
  };

  // Inventory CRUD (preserved)
  const handleSaveInventoryEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    ayurEngine.updateInventoryItem(editingItem.id, {
      item_name: editingItem.item_name,
      stock_ml: Number(editingItem.stock_ml),
      min_threshold_ml: Number(editingItem.min_threshold_ml),
      category: editingItem.category,
      unit: editingItem.unit,
      batch_number: editingItem.batch_number,
    });
    setEditingItem(null);
  };

  const handleAddNewItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.item_name.trim()) return;
    ayurEngine.addInventoryItem({
      item_name: newItemForm.item_name,
      category: newItemForm.category as InventoryItem['category'],
      stock_ml: Number(newItemForm.stock_ml),
      min_threshold_ml: Number(newItemForm.min_threshold_ml),
      unit: newItemForm.unit,
      batch_number: newItemForm.batch_number,
      last_restocked: new Date().toISOString().split('T')[0],
      price_per_liter: 1850,
    });
    setIsAddingNewItem(false);
    setNewItemForm({
      item_name: '',
      category: 'Medicated Oil',
      stock_ml: 2500,
      min_threshold_ml: 500,
      unit: 'mL',
      batch_number: '',
      description: 'Traditional classical Ayurvedic formulation for Panchakarma procedures.',
    });
  };

  const handleDeleteInventoryItem = (id: string, name: string) => {
    if (
      window.confirm(
        `Remove "${name}" from the active resource inventory? This cannot be undone.`
      )
    ) {
      ayurEngine.deleteInventoryItem(id);
    }
  };

  // Rooms & therapists (preserved)
  const handleSaveRoomEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    ayurEngine.updateRoom(editingRoom.id, {
      room_name: editingRoom.room_name,
      droni_wood: editingRoom.droni_wood,
      is_operational: editingRoom.is_operational,
      maintenance_status: editingRoom.maintenance_status,
    });
    setEditingRoom(null);
  };

  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomForm.room_name.trim()) return;
    ayurEngine.addRoom({
      room_name: newRoomForm.room_name,
      room_code: newRoomForm.room_code || 'ROOM-' + Math.floor(100 + Math.random() * 900),
      room_type: newRoomForm.room_type,
      droni_wood: newRoomForm.droni_wood,
      droni_length_ft: 7.5,
      is_operational: newRoomForm.is_operational,
      maintenance_status: newRoomForm.maintenance_status,
      features: ['Handcrafted Wooden Droni Bed', 'Warm Oil Drainage Catchment'],
    });
    setIsAddingRoom(false);
  };

  const handleSaveTherapistEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTherapist) return;
    ayurEngine.updateTherapist(editingTherapist.id, {
      name: editingTherapist.name,
      status: editingTherapist.status,
      specialization: editingTherapist.specialization,
      title: editingTherapist.title,
    });
    setEditingTherapist(null);
  };

  const handleRevertDefaults = () => {
    if (
      window.confirm(
        'Revert all inventory, rooms, therapists and appointments to initial seed data?'
      )
    ) {
      ayurEngine.resetToDefaults();
    }
  };

  const today = new Date();

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page header */}
      <PageHeader
        eyebrow={today.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        title="Clinic operations"
        description="Coordinate bookings, chambers, practitioners and medicated inventory from one command center."
        actions={
          <Button variant="secondary" size="sm" onClick={handleRevertDefaults} icon={<RotateCcw className="w-3.5 h-3.5" />}>
            Reset seed data
          </Button>
        }
      />

      {/* KPI row — real data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock />}
          label="Pending requests"
          value={pendingBookings.length}
          subtitle="Awaiting constraint verification"
          tone="warning"
          active={activeSubTab === 'queue'}
          onClick={() => setActiveSubTab('queue')}
        />
        <StatCard
          icon={<CalendarX2 />}
          label="Confirmed"
          value={confirmedToday.length}
          subtitle="Scheduled & resource-locked"
          tone="info"
          active={activeSubTab === 'queue'}
          onClick={() => setActiveSubTab('queue')}
        />
        <StatCard
          icon={<Droplets />}
          label="Formulations"
          value={`${inventory.length}`}
          subtitle={`${(inventory.reduce((a, i) => a + i.stock_ml, 0) / 1000).toFixed(1)} L in stock`}
          tone="brand"
          active={activeSubTab === 'inventory'}
          onClick={() => setActiveSubTab('inventory')}
        />
        <StatCard
          icon={<Layers />}
          label="Chambers ready"
          value={`${rooms.filter((r) => r.is_operational).length}/${rooms.length}`}
          subtitle={`${therapists.filter((t) => t.status === 'Available').length} practitioners on duty`}
          tone={lowStockItems.length > 0 ? 'gold' : 'brand'}
          active={activeSubTab === 'rooms'}
          onClick={() => setActiveSubTab('rooms')}
        />
      </div>

      {/* Sub navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5" role="tablist" aria-label="Operations sections">
        {([
          ['queue', 'Booking queue', <Clock key="i" className="w-3.5 h-3.5" />, pendingBookings.length],
          ['inventory', 'Inventory', <Package key="i" className="w-3.5 h-3.5" />, lowStockItems.length],
          ['rooms', 'Chambers', <Layers key="i" className="w-3.5 h-3.5" />],
          ['therapists', 'Practitioners', <UserCheck key="i" className="w-3.5 h-3.5" />],
        ] as const).map(([id, label, icon, count]) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeSubTab === id}
            onClick={() => setActiveSubTab(id as DeskSubTab)}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${
              activeSubTab === id
                ? 'bg-forest-deep text-white border-forest-deep shadow-sm'
                : 'bg-white/70 text-muted border-line hover:text-forest-deep hover:border-sage/40'
            }`}
          >
            {icon}
            {label}
            {count !== undefined && count > 0 && (
              <span
                className={`min-w-5 px-1.5 py-px rounded-full text-[10px] font-bold ${
                  activeSubTab === id ? 'bg-white/20' : 'bg-sage-soft text-forest'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* ==================== QUEUE ==================== */}
          {activeSubTab === 'queue' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-8 space-y-6">
                <Card className="p-5 sm:p-6 space-y-5">
                  <SectionHeader
                    icon={<Inbox />}
                    title="Booking approval queue"
                    description="Three-way constraint check on every request: practitioner slot, chamber availability and oil stock."
                  />

                  <div className="flex flex-col sm:flex-row gap-3">
                    <SearchInput
                      containerClassName="flex-1"
                      placeholder="Search patient, reference (AYUR-…) or therapy…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search bookings"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['Pending', 'Confirmed', 'ALL'].map((st) => (
                        <FilterChip key={st} active={statusFilter === st} onClick={() => setStatusFilter(st)} count={st === 'Pending' ? pendingBookings.length : undefined}>
                          {st === 'ALL' ? 'All' : st}
                        </FilterChip>
                      ))}
                    </div>
                  </div>

                  {filteredBookings.length === 0 ? (
                    <EmptyState
                      icon={<Inbox />}
                      title="No bookings in this view"
                      description="New patient requests will appear here automatically in real time."
                    />
                  ) : (
                    <ul className="space-y-3">
                      {filteredBookings.map((b) => {
                        const therapy = b.therapy;
                        const therapist = b.therapist;
                        const room = b.room;
                        const invItem = inventory.find((i) => i.item_name === therapy?.oil_type);
                        const hasOil = invItem ? invItem.stock_ml >= (therapy?.oil_required_ml || 0) : false;
                        const isPending = b.status === 'Pending';
                        const isApproving = approvingId === b.id;

                        return (
                          <li
                            key={b.id}
                            className={`rounded-2xl border p-4 transition-colors ${
                              isPending && !hasOil
                                ? 'border-danger/25 bg-red-50/50'
                                : b.status === 'Pending'
                                  ? 'surface hover:border-sage/40'
                                  : 'surface opacity-80'
                            }`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-display text-sm font-semibold text-charcoal">{b.client_name}</span>
                                  <Badge>{b.booking_ref}</Badge>
                                </div>
                                <p className="mt-1 text-xs text-muted truncate">
                                  {therapy?.name ?? 'Panchakarma'} · {therapy?.duration_mins ?? 60} min ·{' '}
                                  {new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                                  <strong className="text-charcoal font-semibold">
                                    {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </strong>
                                </p>
                              </div>

                              {/* Constraint indicators */}
                              <ConstraintPill ok label={therapist?.name.split(' ')[0] || 'Vaidya'} caption="Therapist" />
                              <ConstraintPill ok={!!room?.is_operational} label={room?.room_name.split(' ')[0] || 'Chamber'} caption="Room" />
                              <ConstraintPill ok={hasOil} label={hasOil ? `${therapy?.oil_required_ml} mL` : 'Short'} caption="Stock" />

                              <div className="flex items-center gap-2 shrink-0">
                                <IconButton label="View medical dossier" onClick={() => setSelectedReportBooking(b)}>
                                  <FileText className="w-4 h-4" />
                                </IconButton>
                                {isPending ? (
                                  <>
                                    <Button variant="ghost" size="sm" onClick={() => setRejectingBooking(b)}>
                                      Reject
                                    </Button>
                                    <Button size="sm" loading={isApproving} disabled={!hasOil && !isApproving} onClick={() => handleApprove(b.id)}>
                                      Approve
                                    </Button>
                                  </>
                                ) : (
                                  <StatusBadge status={b.status} />
                                )}
                              </div>
                            </div>

                            <AnimatePresence>
                              {actionFeedback && actionFeedback.id === b.id && (
                                <motion.p
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className={`mt-3 pt-3 border-t border-line/60 text-xs font-medium flex items-center gap-1.5 ${
                                    actionFeedback.success ? 'text-success' : 'text-danger'
                                  }`}
                                >
                                  {actionFeedback.success ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  ) : (
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  {actionFeedback.message}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </div>

              {/* Right rail */}
              <div className="xl:col-span-4 space-y-6">
                <Card className="p-5 space-y-4 bg-forest-deep border-transparent">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-sage">Inventory health</h3>
                    <button onClick={() => setActiveSubTab('inventory')} className="text-[11px] text-sage underline underline-offset-2 hover:text-white cursor-pointer">
                      Manage all
                    </button>
                  </div>
                  <div className="space-y-3.5">
                    {inventory.slice(0, 4).map((item) => {
                      const pct = Math.min(100, Math.round((item.stock_ml / 5000) * 100));
                      const low = item.stock_ml <= item.min_threshold_ml;
                      return (
                        <div key={item.id}>
                          <div className="flex justify-between text-[11px] mb-1.5">
                            <span className="text-white/85 font-medium truncate pr-2">{item.item_name.split('(')[0]}</span>
                            <span className="font-mono text-white/55">{item.stock_ml} mL</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className={`h-full rounded-full ${low ? 'bg-warning' : 'bg-sage'}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 text-white border-white/15 hover:bg-white/15 w-full justify-start"
                    onClick={() => {
                      setRestockModalItem(inventory[0]);
                      setRestockAmount(1000);
                    }}
                    icon={<Plus className="w-3.5 h-3.5 text-gold" />}
                  >
                    Quick restock
                  </Button>
                </Card>

                <Card className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="inline-flex items-center gap-2 text-sm font-display font-semibold text-forest-deep">
                      <Activity className="w-4 h-4 text-forest" /> Live audit trail
                    </h3>
                    <span className="text-[10px] font-semibold text-success inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Replication
                    </span>
                  </div>
                  <ul className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {auditLogs.slice(0, 6).map((log) => (
                      <li key={log.id} className="rounded-xl bg-ivory border border-line px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-charcoal inline-flex items-start gap-1.5">
                            <span
                              aria-hidden
                              className={`mt-1 w-1.5 h-1.5 shrink-0 rounded-full ${
                                log.severity === 'success' ? 'bg-success' :
                                log.severity === 'warning' ? 'bg-warning' :
                                log.severity === 'error' ? 'bg-danger' : 'bg-muted'
                              }`}
                            />
                            {log.title}
                          </p>
                          <time className="text-[10px] font-mono text-muted whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </time>
                        </div>
                        <p className="mt-1 pl-3 text-[11px] text-muted leading-relaxed">{log.details}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          )}

          {/* ==================== INVENTORY ==================== */}
          {activeSubTab === 'inventory' && (
            <Card className="p-5 sm:p-6 space-y-5">
              <SectionHeader
                icon={<Package />}
                title="Resource inventory"
                description="Medicated oils, decoctions and formulations with real-time stock thresholds."
                actions={
                  <Button size="sm" onClick={() => setIsAddingNewItem(true)} icon={<Plus className="w-4 h-4" />}>
                    Add formulation
                  </Button>
                }
              />
              <div className="-mx-5 sm:mx-0 overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-[11px] font-bold uppercase tracking-widest text-muted border-b border-line">
                      <th scope="col" className="py-3 pl-5 sm:pl-2 pr-3 font-bold">Formulation</th>
                      <th scope="col" className="px-3 py-3 font-bold">Category</th>
                      <th scope="col" className="px-3 py-3 font-bold">Stock</th>
                      <th scope="col" className="px-3 py-3 font-bold">Threshold</th>
                      <th scope="col" className="px-3 py-3 font-bold">Status</th>
                      <th scope="col" className="px-3 py-3 pr-5 sm:pr-2 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {inventory.map((item) => {
                      const low = item.stock_ml <= item.min_threshold_ml;
                      return (
                        <tr key={item.id} className="hover:bg-mint/40 transition-colors">
                          <td className="py-3.5 pl-5 sm:pl-2 pr-3 font-semibold text-charcoal">{item.item_name}</td>
                          <td className="px-3 py-3.5"><Badge>{item.category}</Badge></td>
                          <td className="px-3 py-3.5 font-mono font-semibold text-charcoal whitespace-nowrap">
                            {item.stock_ml} <span className="text-xs font-normal text-muted">{item.unit}</span>
                          </td>
                          <td className="px-3 py-3.5 font-mono text-muted whitespace-nowrap">
                            {item.min_threshold_ml} {item.unit}
                          </td>
                          <td className="px-3 py-3.5">
                            {low ? <Badge tone="warning">Low stock</Badge> : <Badge tone="success">Sufficient</Badge>}
                          </td>
                          <td className="px-3 py-3.5 pr-5 sm:pr-2">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setRestockModalItem(item);
                                  setRestockAmount(1000);
                                }}
                              >
                                Restock
                              </Button>
                              <IconButton label={`Edit ${item.item_name}`} onClick={() => setEditingItem(item)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </IconButton>
                              <IconButton
                                label={`Delete ${item.item_name}`}
                                className="hover:!text-danger hover:!bg-red-50"
                                onClick={() => handleDeleteInventoryItem(item.id, item.item_name)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ==================== ROOMS ==================== */}
          {activeSubTab === 'rooms' && (
            <Card className="p-5 sm:p-6 space-y-5">
              <SectionHeader
                icon={<Layers />}
                title="Droni treatment chambers"
                description="Traditional carved wooden Droni suites, maintenance cycles and availability."
                actions={
                  <Button size="sm" onClick={() => setIsAddingRoom(true)} icon={<Plus className="w-4 h-4" />}>
                    Add chamber
                  </Button>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {rooms.map((r) => (
                  <motion.div key={r.id} whileHover={{ y: -2 }} className="surface surface-hover rounded-2xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge>{r.room_code}</Badge>
                        <h3 className="mt-2 font-display text-sm font-semibold text-charcoal">{r.room_name}</h3>
                      </div>
                      <StatusBadge status={r.is_operational ? 'Operational' : r.maintenance_status} />
                    </div>
                    <dl className="text-xs space-y-1 text-muted">
                      <div className="flex gap-2"><dt className="font-semibold text-charcoal shrink-0">Droni:</dt><dd className="truncate">{r.droni_wood}</dd></div>
                      <div className="flex gap-2"><dt className="font-semibold text-charcoal shrink-0">Type:</dt><dd className="truncate">{r.room_type}</dd></div>
                    </dl>
                    <div className="pt-3 border-t border-line/70 flex justify-end">
                      <Button variant="secondary" size="sm" onClick={() => setEditingRoom(r)} icon={<Edit2 className="w-3 h-3" />}>
                        Edit chamber
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          )}

          {/* ==================== PRACTITIONERS ==================== */}
          {activeSubTab === 'therapists' && (
            <Card className="p-5 sm:p-6 space-y-5">
              <SectionHeader
                icon={<UserCheck />}
                title="Vaidyas & practitioners"
                description="On-duty status, specializations and practitioner allocations."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {therapists.map((th) => (
                  <motion.div key={th.id} whileHover={{ y: -2 }} className="surface surface-hover rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <img src={th.avatar_url} alt="" loading="lazy" className="w-11 h-11 rounded-full object-cover bg-sage-soft ring-2 ring-white" />
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-semibold text-charcoal truncate">{th.name}</h3>
                        <p className="text-[11px] text-muted truncate">{th.title}</p>
                      </div>
                    </div>
                    <dl className="text-xs space-y-1 text-muted">
                      <div className="flex gap-2"><dt className="font-semibold text-charcoal shrink-0">Focus:</dt><dd className="truncate">{th.specialization}</dd></div>
                      <div className="flex gap-2"><dt className="font-semibold text-charcoal shrink-0">Rating:</dt><dd>{th.rating} · {th.completed_sessions} sessions</dd></div>
                    </dl>
                    <div className="pt-3 border-t border-line/70 flex items-center justify-between gap-2">
                      <StatusBadge status={th.status} />
                      <Button variant="secondary" size="sm" onClick={() => setEditingTherapist(th)} icon={<Edit2 className="w-3 h-3" />}>
                        Edit
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ============ MODALS ============ */}

      <MedicalReportModal booking={selectedReportBooking} onClose={() => setSelectedReportBooking(null)} />

      {/* Edit inventory item */}
      <Modal open={!!editingItem} onClose={() => setEditingItem(null)} title="Edit formulation" subtitle={editingItem?.item_name}>
        {editingItem && (
          <form onSubmit={handleSaveInventoryEdit} className="space-y-4">
            <Field label="Formulation name" htmlFor="inv-name" required>
              <Input id="inv-name" value={editingItem.item_name} onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={`Current stock (${editingItem.unit})`} htmlFor="inv-stock">
                <Input id="inv-stock" type="number" step={50} value={editingItem.stock_ml} onChange={(e) => setEditingItem({ ...editingItem, stock_ml: Number(e.target.value) })} />
              </Field>
              <Field label="Minimum threshold" htmlFor="inv-threshold">
                <Input id="inv-threshold" type="number" step={50} value={editingItem.min_threshold_ml} onChange={(e) => setEditingItem({ ...editingItem, min_threshold_ml: Number(e.target.value) })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" htmlFor="inv-category">
                <Select id="inv-category" value={editingItem.category} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as InventoryItem['category'] })}>
                  <option value="Medicated Oil">Medicated Oil</option>
                  <option value="Herbal Decoction">Herbal Decoction</option>
                  <option value="Herbal Churna">Herbal Churna</option>
                  <option value="Ghee & Butter">Ghee & Butter</option>
                  <option value="Linen & Accessories">Linen & Accessories</option>
                </Select>
              </Field>
              <Field label="Batch number" htmlFor="inv-batch">
                <Input id="inv-batch" value={editingItem.batch_number || ''} onChange={(e) => setEditingItem({ ...editingItem, batch_number: e.target.value })} />
              </Field>
            </div>
            <ModalActions onCancel={() => setEditingItem(null)} submitLabel="Save changes" />
          </form>
        )}
      </Modal>

      {/* Add new inventory item */}
      <Modal open={isAddingNewItem} onClose={() => setIsAddingNewItem(false)} title="Add new formulation" subtitle="Register a medicated oil or Ayurvedic preparation">
        <form onSubmit={handleAddNewItemSubmit} className="space-y-4">
          <Field label="Formulation name" htmlFor="new-inv-name" required>
            <Input id="new-inv-name" placeholder="e.g. Bala Ashwagandhadi Thailam" value={newItemForm.item_name} onChange={(e) => setNewItemForm({ ...newItemForm, item_name: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Initial stock (mL)" htmlFor="new-inv-stock">
              <Input id="new-inv-stock" type="number" step={100} value={newItemForm.stock_ml} onChange={(e) => setNewItemForm({ ...newItemForm, stock_ml: Number(e.target.value) })} />
            </Field>
            <Field label="Min threshold (mL)" htmlFor="new-inv-min">
              <Input id="new-inv-min" type="number" step={50} value={newItemForm.min_threshold_ml} onChange={(e) => setNewItemForm({ ...newItemForm, min_threshold_ml: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" htmlFor="new-inv-cat">
              <Select id="new-inv-cat" value={newItemForm.category} onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}>
                <option value="Medicated Oil">Medicated Oil (Thailam)</option>
                <option value="Herbal Decoction">Decoction (Kashayam)</option>
                <option value="Herbal Churna">Powder (Choornam)</option>
                <option value="Ghee & Butter">Ghee (Ghritam)</option>
                <option value="Linen & Accessories">Linen & Accessories</option>
              </Select>
            </Field>
            <Field label="Batch code" htmlFor="new-inv-batch">
              <Input id="new-inv-batch" value={newItemForm.batch_number} onChange={(e) => setNewItemForm({ ...newItemForm, batch_number: e.target.value })} placeholder="BATCH-2026-A" />
            </Field>
          </div>
          <ModalActions onCancel={() => setIsAddingNewItem(false)} submitLabel="Add to inventory" />
        </form>
      </Modal>

      {/* Quick restock */}
      <Modal open={!!restockModalItem} onClose={() => setRestockModalItem(null)} title="Quick restock" subtitle={restockModalItem ? `${restockModalItem.item_name} · currently ${restockModalItem.stock_ml} mL` : undefined}>
        {restockModalItem && (
          <div className="space-y-4">
            <Field label="Formulation" htmlFor="restock-item">
              <Select
                id="restock-item"
                value={restockModalItem.id}
                onChange={(e) => {
                  const item = inventory.find((i) => i.id === e.target.value);
                  if (item) setRestockModalItem(item);
                }}
              >
                {inventory.map((i) => (
                  <option key={i.id} value={i.id}>{i.item_name} ({i.stock_ml} mL)</option>
                ))}
              </Select>
            </Field>
            <Field label="Volume to add (mL)" htmlFor="restock-amt" hint={`New balance: ${restockModalItem.stock_ml + Number(restockAmount || 0)} mL`}>
              <Input id="restock-amt" type="number" step={250} min={250} value={restockAmount} onChange={(e) => setRestockAmount(Number(e.target.value))} />
            </Field>
            <ModalActions
              onCancel={() => setRestockModalItem(null)}
              submitLabel={`Confirm (+${restockAmount} mL)`}
              onSubmit={() => {
                ayurEngine.restockItem(restockModalItem.id, Number(restockAmount));
                setRestockModalItem(null);
              }}
            />
          </div>
        )}
      </Modal>

      {/* Edit room */}
      <Modal open={!!editingRoom} onClose={() => setEditingRoom(null)} title="Edit chamber" subtitle={editingRoom?.room_name}>
        {editingRoom && (
          <form onSubmit={handleSaveRoomEdit} className="space-y-4">
            <Field label="Room name" htmlFor="room-name" required>
              <Input id="room-name" value={editingRoom.room_name} onChange={(e) => setEditingRoom({ ...editingRoom, room_name: e.target.value })} required />
            </Field>
            <Field label="Droni bed wood type" htmlFor="room-wood">
              <Select id="room-wood" value={editingRoom.droni_wood} onChange={(e) => setEditingRoom({ ...editingRoom, droni_wood: e.target.value })}>
                <option>Teak Wood (Sagwan)</option>
                <option>Rosewood (Sheesham)</option>
                <option>Anjili Wood (Wild Jack)</option>
                <option>Neem Wood (Margosa)</option>
              </Select>
            </Field>
            <Field label="Maintenance status" htmlFor="room-status">
              <Select
                id="room-status"
                value={editingRoom.maintenance_status}
                onChange={(e) => {
                  const status = e.target.value as ResourceRoom['maintenance_status'];
                  setEditingRoom({
                    ...editingRoom,
                    maintenance_status: status,
                    is_operational: status === 'Operational',
                  });
                }}
              >
                <option value="Operational">Operational (ready for bookings)</option>
                <option value="Sanitizing">Sanitizing / post-oleation</option>
                <option value="Maintenance">Under maintenance</option>
                <option value="Inspection">Inspection</option>
              </Select>
            </Field>
            <ModalActions onCancel={() => setEditingRoom(null)} submitLabel="Save configuration" />
          </form>
        )}
      </Modal>

      {/* Add room */}
      <Modal open={isAddingRoom} onClose={() => setIsAddingRoom(false)} title="Add treatment chamber" subtitle="Register a new Droni suite">
        <form onSubmit={handleAddRoomSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Room name" htmlFor="new-room-name" required>
              <Input id="new-room-name" placeholder="Sushruta Chamber" value={newRoomForm.room_name} onChange={(e) => setNewRoomForm({ ...newRoomForm, room_name: e.target.value })} required />
            </Field>
            <Field label="Room code" htmlFor="new-room-code" hint="auto if empty">
              <Input id="new-room-code" placeholder="ROOM-105" value={newRoomForm.room_code} onChange={(e) => setNewRoomForm({ ...newRoomForm, room_code: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Droni bed wood" htmlFor="new-room-wood">
              <Select id="new-room-wood" value={newRoomForm.droni_wood} onChange={(e) => setNewRoomForm({ ...newRoomForm, droni_wood: e.target.value })}>
                <option>Teak Wood (Sagwan)</option>
                <option>Rosewood (Sheesham)</option>
                <option>Anjili Wood (Wild Jack)</option>
                <option>Neem Wood (Margosa)</option>
              </Select>
            </Field>
            <Field label="Maintenance status" htmlFor="new-room-status">
              <Select id="new-room-status" value={newRoomForm.maintenance_status} onChange={(e) => setNewRoomForm({ ...newRoomForm, maintenance_status: e.target.value as ResourceRoom['maintenance_status'] })}>
                <option value="Operational">Operational</option>
                <option value="Sanitizing">Sanitizing</option>
                <option value="Maintenance">Under maintenance</option>
                <option value="Inspection">Inspection</option>
              </Select>
            </Field>
          </div>
          <ModalActions onCancel={() => setIsAddingRoom(false)} submitLabel="Add chamber" />
        </form>
      </Modal>

      {/* Edit therapist */}
      <Modal open={!!editingTherapist} onClose={() => setEditingTherapist(null)} title="Edit practitioner" subtitle={editingTherapist?.name}>
        {editingTherapist && (
          <form onSubmit={handleSaveTherapistEdit} className="space-y-4">
            <Field label="Availability status" htmlFor="th-status">
              <Select id="th-status" value={editingTherapist.status} onChange={(e) => setEditingTherapist({ ...editingTherapist, status: e.target.value as Therapist['status'] })}>
                <option value="Available">Available (on duty)</option>
                <option value="In Session">In Session (occupied)</option>
                <option value="On Leave">On Leave (offline)</option>
              </Select>
            </Field>
            <Field label="Specialization" htmlFor="th-spec">
              <Input id="th-spec" value={editingTherapist.specialization} onChange={(e) => setEditingTherapist({ ...editingTherapist, specialization: e.target.value })} />
            </Field>
            <ModalActions onCancel={() => setEditingTherapist(null)} submitLabel="Save practitioner" />
          </form>
        )}
      </Modal>

      {/* Reject booking */}
      <Modal open={!!rejectingBooking} onClose={() => setRejectingBooking(null)} title="Cancel booking" subtitle={rejectingBooking ? `${rejectingBooking.booking_ref} · ${rejectingBooking.client_name}` : undefined}>
        <div className="space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Specify the reason for cancellation. If oil was previously deducted, it will be refunded back to the inventory balance.
          </p>
          <Field label="Reason for rejection" htmlFor="reject-reason">
            <Textarea id="reject-reason" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </Field>
          <ModalActions
            onCancel={() => setRejectingBooking(null)}
            cancelLabel="Keep booking"
            submitLabel="Confirm cancellation"
            danger
            onSubmit={handleRejectConfirm}
          />
        </div>
      </Modal>
    </div>
  );
};

/* ---------------- helpers ---------------- */

const ConstraintPill: React.FC<{ ok: boolean; label: string; caption: string }> = ({ ok, label, caption }) => (
  <div className="hidden md:flex flex-col items-center min-w-[72px]">
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${ok ? 'text-success' : 'text-danger'}`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {ok ? 'OK' : 'Blocked'}
    </span>
    <span className="text-[10px] text-muted mt-0.5 truncate max-w-[80px]">
      {caption}: {label}
    </span>
  </div>
);

const ModalActions: React.FC<{
  onCancel: () => void;
  submitLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onSubmit?: () => void;
}> = ({ onCancel, submitLabel, cancelLabel = 'Cancel', danger, onSubmit }) => (
  <div className="pt-3 border-t border-line flex justify-end gap-3">
    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
      {cancelLabel}
    </Button>
    {onSubmit ? (
      <Button type="button" variant={danger ? 'danger' : 'primary'} size="sm" onClick={onSubmit}>
        {submitLabel}
      </Button>
    ) : (
      <Button type="submit" variant={danger ? 'danger' : 'primary'} size="sm">
        {submitLabel}
      </Button>
    )}
  </div>
);
// (helper components above)


