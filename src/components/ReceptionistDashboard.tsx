import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Droplets, 
  User, 
  Layers, 
  Activity, 
  Plus, 
  FileText, 
  Search, 
  Check, 
  Calendar,
  AlertCircle,
  Edit2,
  Trash2,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Package,
  Wrench,
  UserCheck
} from 'lucide-react';
import { ayurEngine } from '../services/engine';
import { Booking, InventoryItem, ResourceRoom, Therapist, RealtimeAuditLog } from '../types/ayursutra';
import { MedicalReportModal } from './MedicalReportModal';

type DeskSubTab = 'queue' | 'inventory' | 'rooms' | 'therapists' | 'audit';

export const ReceptionistDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>(() => ayurEngine.getBookings());
  const [inventory, setInventory] = useState<InventoryItem[]>(() => ayurEngine.getInventory());
  const [rooms, setRooms] = useState<ResourceRoom[]>(() => ayurEngine.getRooms());
  const [therapists, setTherapists] = useState<Therapist[]>(() => ayurEngine.getTherapists());
  const [auditLogs, setAuditLogs] = useState<RealtimeAuditLog[]>(() => ayurEngine.getAuditLogs());

  // Desk Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<DeskSubTab>('queue');

  // Queue state
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedReportBooking, setSelectedReportBooking] = useState<Booking | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Rejection Dialog
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Therapist emergency reassignment');

  // Inventory CRUD Modal State
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isAddingNewItem, setIsAddingNewItem] = useState<boolean>(false);
  const [newItemForm, setNewItemForm] = useState({
    item_name: '',
    category: 'Medicated Oil',
    stock_ml: 2500,
    min_threshold_ml: 500,
    unit: 'mL',
    batch_number: 'BATCH-2026-X',
    description: 'Traditional classical Ayurvedic formulation for Panchakarma procedures.',
  });

  // Quick Restock Modal
  const [restockModalItem, setRestockModalItem] = useState<InventoryItem | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(1000);

  // Room Edit Modal
  const [editingRoom, setEditingRoom] = useState<ResourceRoom | null>(null);
  const [isAddingRoom, setIsAddingRoom] = useState<boolean>(false);
  const [newRoomForm, setNewRoomForm] = useState({
    room_name: '',
    room_code: '',
    room_type: 'Traditional Droni Suite',
    droni_wood: 'Teak Wood (Sagwan)',
    is_operational: true,
    maintenance_status: 'Operational' as ResourceRoom['maintenance_status'],
  });

  // Therapist Edit Modal
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

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesSearch = 
      b.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.booking_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.therapy?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingBookings = bookings.filter((b) => b.status === 'Pending');

  // Handle Approve RPC
  const handleApprove = async (bookingId: string) => {
    setApprovingId(bookingId);
    setActionFeedback(null);

    const result = await ayurEngine.approveBookingRPC(bookingId);
    setApprovingId(null);
    setActionFeedback({
      id: bookingId,
      success: result.success,
      message: result.message,
    });

    setTimeout(() => {
      setActionFeedback((prev) => (prev?.id === bookingId ? null : prev));
    }, 4000);
  };

  // Handle Reject RPC
  const handleRejectConfirm = async () => {
    if (!rejectingBooking) return;
    await ayurEngine.rejectBookingRPC(rejectingBooking.id, rejectReason);
    setRejectingBooking(null);
  };

  // Handle Save Inventory Item Edit
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

  // Handle Add New Inventory Item
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
      batch_number: 'BATCH-2026-X',
      description: 'Traditional classical Ayurvedic formulation for Panchakarma procedures.',
    });
  };

  // Handle Delete Inventory Item
  const handleDeleteInventoryItem = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the active resource inventory?`)) {
      ayurEngine.deleteInventoryItem(id);
    }
  };

  // Handle Save Room Edit
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

  // Handle Add Room Submit
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

  // Handle Save Therapist Edit
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

  // Handle Revert to Defaults
  const handleRevertDefaults = () => {
    if (window.confirm('Revert all resource inventory, rooms, therapists, and appointments to initial authentic seed data?')) {
      ayurEngine.resetToDefaults();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Pending Approvals */}
        <div 
          onClick={() => setActiveSubTab('queue')}
          className={`p-5 rounded-xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            activeSubTab === 'queue' ? 'bg-white border-[#8B9D83] ring-1 ring-[#8B9D83]' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Approvals</p>
            <h3 className="text-2xl font-serif font-bold text-slate-900 mt-1">{pendingBookings.length} Requests</h3>
            <p className="text-xs text-orange-600 font-medium mt-0.5">Constraint check ready</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Inventory Health / Formulations */}
        <div 
          onClick={() => setActiveSubTab('inventory')}
          className={`p-5 rounded-xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            activeSubTab === 'inventory' ? 'bg-white border-[#8B9D83] ring-1 ring-[#8B9D83]' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Resource Inventory</p>
            <h3 className="text-2xl font-serif font-bold text-slate-900 mt-1">
              {inventory.length} Formulations
            </h3>
            <p className="text-xs text-[#8B9D83] font-medium mt-0.5">
              {(inventory.reduce((acc, i) => acc + i.stock_ml, 0) / 1000).toFixed(1)} Liters In Stock
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#8B9D83]/15 border border-[#8B9D83]/30 flex items-center justify-center text-[#2D3A3A]">
            <Droplets className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Operational Droni Suites */}
        <div 
          onClick={() => setActiveSubTab('rooms')}
          className={`p-5 rounded-xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            activeSubTab === 'rooms' ? 'bg-white border-[#8B9D83] ring-1 ring-[#8B9D83]' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Droni Bed Chambers</p>
            <h3 className="text-2xl font-serif font-bold text-slate-900 mt-1">
              {rooms.filter((r) => r.is_operational).length} / {rooms.length} Suites
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Teak, Rosewood & Anjili</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#8B9D83]/15 border border-[#8B9D83]/30 flex items-center justify-center text-[#2D3A3A]">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Certified Practitioners */}
        <div 
          onClick={() => setActiveSubTab('therapists')}
          className={`p-5 rounded-xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            activeSubTab === 'therapists' ? 'bg-white border-[#8B9D83] ring-1 ring-[#8B9D83]' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Vaidyas & Staff</p>
            <h3 className="text-2xl font-serif font-bold text-slate-900 mt-1">
              {therapists.filter((t) => t.status === 'Available').length} / {therapists.length} Active
            </h3>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">On-Duty Schedule</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Sub-Navigation Bar for Receptionist Hub */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveSubTab('queue')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === 'queue'
                ? 'bg-[#2D3A3A] text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Booking Queue ({pendingBookings.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === 'inventory'
                ? 'bg-[#2D3A3A] text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Resource Inventory Management</span>
          </button>

          <button
            onClick={() => setActiveSubTab('rooms')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === 'rooms'
                ? 'bg-[#2D3A3A] text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Droni Treatment Rooms</span>
          </button>

          <button
            onClick={() => setActiveSubTab('therapists')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === 'therapists'
                ? 'bg-[#2D3A3A] text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Vaidyas & Practitioners</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 pr-1">
          <button
            onClick={handleRevertDefaults}
            title="Revert all inventory, room, and booking changes back to initial state"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#8B9D83]" />
            <span>Revert to Seeds</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: BOOKING APPROVAL QUEUE */}
      {activeSubTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Real-Time Bookings Queue (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <h2 className="text-lg font-serif font-bold text-slate-900">
                      Pending Approvals (Receptionist Verification Desk)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Multi-variable constraint checks: Practitioner slot, Droni suite, and Medicated oil stock
                  </p>
                </div>

                {/* Status Tabs */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
                  {['Pending', 'Confirmed', 'ALL'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        statusFilter === st
                          ? 'bg-[#2D3A3A] text-white font-semibold shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st === 'Pending' ? `Pending (${pendingBookings.length})` : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search patient name, booking ref (e.g. AYUR-2026), or therapy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                />
              </div>

              {/* Bookings List */}
              <div className="space-y-3">
                {filteredBookings.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No bookings in this filter</p>
                    <p className="text-xs text-slate-400 mt-1">
                      New requests submitted by clients will appear here automatically.
                    </p>
                  </div>
                ) : (
                  filteredBookings.map((b) => {
                    const therapy = b.therapy;
                    const therapist = b.therapist;
                    const room = b.room;
                    const invItem = inventory.find((i) => i.item_name === therapy?.oil_type);
                    const hasSufficientOil = invItem ? invItem.stock_ml >= (therapy?.oil_required_ml || 0) : false;
                    const isPending = b.status === 'Pending';
                    const isApproving = approvingId === b.id;

                    return (
                      <div
                        key={b.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isPending
                            ? hasSufficientOil
                              ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                              : 'bg-red-50/60 border-red-200'
                            : b.status === 'Confirmed'
                            ? 'bg-white border-slate-200'
                            : 'bg-slate-50/40 border-slate-200 opacity-70'
                        }`}
                      >
                        {/* Top Row */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          
                          {/* Patient info */}
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-slate-900 text-sm">{b.client_name}</span>
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                                {b.booking_ref}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 mt-0.5">
                              Therapy: <strong className="text-slate-700">{therapy?.name || 'Panchakarma'}</strong> ({therapy?.duration_mins || 60}m)
                            </span>
                          </div>

                          {/* 3-Constraint Breakdown (Receptionist Desk Only) */}
                          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
                            <div className="flex flex-col items-center">
                              <span className="text-emerald-600 font-bold text-[11px]">✓ Therapist</span>
                              <span className="text-slate-500 text-[11px]">{therapist?.name.split(' ')[0] || 'Vaidya'}</span>
                            </div>

                            <div className="flex flex-col items-center">
                              <span className={`${room?.is_operational ? 'text-emerald-600' : 'text-red-600'} font-bold text-[11px]`}>
                                {room?.is_operational ? '✓ Room' : '✗ Room'}
                              </span>
                              <span className="text-slate-500 text-[11px]">{room?.room_name.split(' ')[0] || 'Droni'}</span>
                            </div>

                            <div className="flex flex-col items-center">
                              <span className={`${hasSufficientOil ? 'text-emerald-600' : 'text-red-600'} font-bold text-[11px]`}>
                                {hasSufficientOil ? '✓ Stock' : '✗ Shortage'}
                              </span>
                              <span className="text-slate-500 text-[11px]">{therapy?.oil_required_ml}ml ({invItem?.stock_ml || 0}ml left)</span>
                            </div>
                          </div>

                          {/* Right Buttons */}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedReportBooking(b)}
                              className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                              title="Inspect Client Medical Dossier"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {isPending ? (
                              <>
                                <button
                                  onClick={() => setRejectingBooking(b)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors"
                                >
                                  Reject
                                </button>

                                <button
                                  onClick={() => handleApprove(b.id)}
                                  disabled={isApproving || !hasSufficientOil}
                                  className={`px-4 py-2 rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition-all ${
                                    hasSufficientOil
                                      ? 'bg-[#2D3A3A] hover:bg-[#1E2525] text-white cursor-pointer active:scale-95'
                                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                  }`}
                                >
                                  {isApproving ? (
                                    <>
                                      <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                                      <span>Approving...</span>
                                    </>
                                  ) : (
                                    <span>Approve & Deduct</span>
                                  )}
                                </button>
                              </>
                            ) : (
                              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Confirmed
                              </span>
                            )}
                          </div>

                        </div>

                        {/* Detail Footer */}
                        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                          <span>
                            Time: <strong className="text-slate-700">{new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> on {new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          <span>
                            Prakriti: <strong className="text-slate-700">{b.prakriti || 'Vata-Pitta'}</strong> • {b.medical_notes ? `"${b.medical_notes.substring(0, 45)}..."` : 'Standard intake'}
                          </span>
                        </div>

                        {/* Inline Action Feedback */}
                        {actionFeedback && actionFeedback.id === b.id && (
                          <div className={`mt-2 p-2.5 rounded-lg border text-xs flex items-center space-x-2 ${
                            actionFeedback.success
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-red-50 border-red-200 text-red-800'
                          }`}>
                            {actionFeedback.success ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                            )}
                            <span>{actionFeedback.message}</span>
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* Real-time PostgreSQL Audit Trail Stream */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#8B9D83]" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Live Operational Audit Trail
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Replication Active
                </span>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {auditLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          log.severity === 'success' ? 'bg-emerald-500' :
                          log.severity === 'warning' ? 'bg-orange-500' :
                          log.severity === 'error' ? 'bg-red-500' : 'bg-slate-400'
                        }`}></span>
                        {log.title}
                      </p>
                      <p className="text-[11px] text-slate-500">{log.details}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap ml-2">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Inventory Summary & Quick Status (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Section: Inventory Health */}
            <section className="bg-[#2D3A3A] text-white rounded-xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#8B9D83]">
                  Inventory Health
                </h3>
                <button
                  onClick={() => setActiveSubTab('inventory')}
                  className="text-[10px] text-slate-300 hover:text-white underline"
                >
                  Manage All →
                </button>
              </div>

              <div className="space-y-4">
                {inventory.slice(0, 4).map((item) => {
                  const percentage = Math.min(100, Math.round((item.stock_ml / 5000) * 100));
                  const isLow = item.stock_ml <= item.min_threshold_ml;

                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-200 truncate pr-2" title={item.item_name}>
                          {item.item_name.split('(')[0]}
                        </span>
                        <span className="text-slate-300 font-mono">
                          {item.stock_ml}ml / 5,000ml
                        </span>
                      </div>

                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isLow ? 'bg-orange-400' : 'bg-[#8B9D83]'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-4 border-t border-white/10">
                  <div className="p-3 bg-white/5 rounded-lg flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-tighter opacity-60">
                      Quick Restock
                    </span>
                    <button
                      onClick={() => {
                        setRestockModalItem(inventory[0]);
                        setRestockAmount(1000);
                      }}
                      className="text-[10px] px-2.5 py-1 bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30 hover:bg-orange-500/30 transition-colors font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      + Add Stock
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Quick Resource Status */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Quick Room Status
                </h3>
                <button
                  onClick={() => setActiveSubTab('rooms')}
                  className="text-[11px] text-slate-500 hover:text-slate-900 underline"
                >
                  Edit Rooms
                </button>
              </div>

              <div className="space-y-3">
                {rooms.map((room) => {
                  const isFree = room.is_operational;

                  return (
                    <div key={room.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${isFree ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                        <span className="font-medium text-slate-700">{room.room_name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {room.droni_wood.split(' ')[0]} • {isFree ? 'Free' : room.maintenance_status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>

        </div>
      )}

      {/* VIEW 2: FULL RESOURCE INVENTORY MANAGEMENT (CRUD) */}
      {activeSubTab === 'inventory' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-[#8B9D83]" />
                <h2 className="text-xl font-serif font-bold text-slate-900">
                  Resource Inventory Management (Oils & Formulations)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Receptionists can edit stock levels, adjust safety thresholds, add new Ayurvedic oils, and monitor batch details in real time.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsAddingNewItem(true)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#2D3A3A] hover:bg-[#1E2525] text-white flex items-center space-x-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Formulation</span>
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Item Name / Formulation</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Min. Threshold</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => {
                  const isLow = item.stock_ml <= item.min_threshold_ml;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {item.item_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-sm">
                        {item.stock_ml} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {item.min_threshold_ml} {item.unit}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {item.batch_number || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Sufficient
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setRestockModalItem(item);
                              setRestockAmount(1000);
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium"
                            title="Quick Restock"
                          >
                            + Restock
                          </button>
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 rounded bg-slate-100 hover:bg-[#8B9D83]/20 hover:text-[#2D3A3A] text-slate-600 transition-colors"
                            title="Edit Formulation"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteInventoryItem(item.id, item.item_name)}
                            className="p-1.5 rounded bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* VIEW 3: DRONI TREATMENT ROOMS MANAGEMENT */}
      {activeSubTab === 'rooms' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-[#8B9D83]" />
                <h2 className="text-xl font-serif font-bold text-slate-900">
                  Droni Treatment Rooms & Chamber Management
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure traditional carved wooden Droni beds, room maintenance schedules, and operational availability.
              </p>
            </div>

            <button
              onClick={() => setIsAddingRoom(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#2D3A3A] hover:bg-[#1E2525] text-white flex items-center space-x-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Treatment Suite</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rooms.map((r) => (
              <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                      {r.room_code}
                    </span>
                    <h3 className="font-serif font-bold text-slate-900 text-sm mt-1">{r.room_name}</h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    r.is_operational ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {r.is_operational ? 'Operational' : r.maintenance_status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p><strong>Droni Bed:</strong> {r.droni_wood}</p>
                  <p><strong>Type:</strong> {r.room_type}</p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => setEditingRoom(r)}
                    className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-1 shadow-sm"
                  >
                    <Edit2 className="w-3 h-3 text-[#8B9D83]" />
                    <span>Edit Chamber</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: VAIDYAS & PRACTITIONERS */}
      {activeSubTab === 'therapists' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-[#8B9D83]" />
              <h2 className="text-xl font-serif font-bold text-slate-900">
                Vaidyas & Panchakarma Staff Management
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage therapist on-duty status, specializations, and practitioner allocations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {therapists.map((th) => (
              <div key={th.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={th.avatar_url}
                    alt={th.name}
                    className="w-10 h-10 rounded-full object-cover border border-[#8B9D83]"
                  />
                  <div>
                    <h3 className="font-serif font-bold text-slate-900 text-sm">{th.name}</h3>
                    <span className="text-[11px] text-slate-500">{th.title}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p><strong>Specialization:</strong> {th.specialization}</p>
                  <p><strong>Phone:</strong> {th.phone}</p>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span className={`font-semibold ${th.status === 'Available' ? 'text-emerald-700' : 'text-orange-700'}`}>
                      {th.status}
                    </span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => setEditingTherapist(th)}
                    className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-1 shadow-sm"
                  >
                    <Edit2 className="w-3 h-3 text-[#8B9D83]" />
                    <span>Edit Status</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT INVENTORY ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 text-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-serif font-bold text-slate-900">
                Edit Medicated Formulation
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInventoryEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Formulation Name</label>
                <input
                  type="text"
                  value={editingItem.item_name}
                  onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Stock (mL)</label>
                  <input
                    type="number"
                    step="50"
                    value={editingItem.stock_ml}
                    onChange={(e) => setEditingItem({ ...editingItem, stock_ml: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Threshold (mL)</label>
                  <input
                    type="number"
                    step="50"
                    value={editingItem.min_threshold_ml}
                    onChange={(e) => setEditingItem({ ...editingItem, min_threshold_ml: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={editingItem.batch_number || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, batch_number: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#2D3A3A] hover:bg-[#1E2525] text-white shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW INVENTORY ITEM MODAL */}
      {isAddingNewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 text-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-serif font-bold text-slate-900">
                Add New Medicated Oil Formulation
              </h3>
              <button onClick={() => setIsAddingNewItem(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewItemSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Formulation / Oil Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bala Ashwagandhadi Thailam"
                  value={newItemForm.item_name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, item_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stock (mL)</label>
                  <input
                    type="number"
                    step="100"
                    value={newItemForm.stock_ml}
                    onChange={(e) => setNewItemForm({ ...newItemForm, stock_ml: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Threshold (mL)</label>
                  <input
                    type="number"
                    step="50"
                    value={newItemForm.min_threshold_ml}
                    onChange={(e) => setNewItemForm({ ...newItemForm, min_threshold_ml: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                  >
                    <option value="Medicated Oil">Medicated Oil (Thailam)</option>
                    <option value="Herbal Ghee">Herbal Ghee (Ghritam)</option>
                    <option value="Herbal Powder">Herbal Powder (Choornam)</option>
                    <option value="Decoction">Decoction (Kashayam)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Code</label>
                  <input
                    type="text"
                    value={newItemForm.batch_number}
                    onChange={(e) => setNewItemForm({ ...newItemForm, batch_number: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingNewItem(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#2D3A3A] hover:bg-[#1E2525] text-white shadow-sm"
                >
                  + Add to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK RESTOCK MODAL */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-serif font-bold text-slate-900">
              Restock Medicated Oil
            </h3>
            <p className="text-xs text-slate-500">
              Select formulation and batch volume addition for <strong className="text-slate-800">{restockModalItem.item_name}</strong>. Current stock: {restockModalItem.stock_ml} mL.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Select Oil Formulation</label>
              <select
                value={restockModalItem.id}
                onChange={(e) => {
                  const item = inventory.find((i) => i.id === e.target.value);
                  if (item) setRestockModalItem(item);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#8B9D83]"
              >
                {inventory.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.item_name} ({i.stock_ml} mL)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Volume to add (mL)</label>
              <input
                type="number"
                step="250"
                min="250"
                value={restockAmount}
                onChange={(e) => setRestockAmount(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setRestockModalItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  ayurEngine.restockItem(restockModalItem.id, Number(restockAmount));
                  setRestockModalItem(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#2D3A3A] hover:bg-[#1E2525] text-white shadow-sm"
              >
                Confirm Restock (+{restockAmount} mL)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ROOM MODAL */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-serif font-bold text-slate-900">
              Edit Room: {editingRoom.room_name}
            </h3>

            <form onSubmit={handleSaveRoomEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Room Name</label>
                <input
                  type="text"
                  value={editingRoom.room_name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, room_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Droni Bed Wood Type</label>
                <select
                  value={editingRoom.droni_wood}
                  onChange={(e) => setEditingRoom({ ...editingRoom, droni_wood: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                >
                  <option value="Teak Wood (Sagwan)">Teak Wood (Sagwan)</option>
                  <option value="Rosewood (Sheesham)">Rosewood (Sheesham)</option>
                  <option value="Anjili Wood (Wild Jack)">Anjili Wood (Wild Jack)</option>
                  <option value="Neem Wood (Margosa)">Neem Wood (Margosa)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Maintenance Status</label>
                <select
                  value={editingRoom.maintenance_status}
                  onChange={(e) => {
                    const status = e.target.value as ResourceRoom['maintenance_status'];
                    setEditingRoom({ 
                      ...editingRoom, 
                      maintenance_status: status,
                      is_operational: status === 'Operational'
                    });
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                >
                  <option value="Operational">Operational (Ready for bookings)</option>
                  <option value="Sanitizing">Sanitizing / Post-Oleation</option>
                  <option value="Maintenance">Under Maintenance</option>
                  <option value="Inspection">Inspection</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#2D3A3A] hover:bg-[#1E2525] text-white shadow-sm"
                >
                  Save Chamber Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT THERAPIST MODAL */}
      {editingTherapist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-serif font-bold text-slate-900">
              Edit Practitioner: {editingTherapist.name}
            </h3>

            <form onSubmit={handleSaveTherapistEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Availability Status</label>
                <select
                  value={editingTherapist.status}
                  onChange={(e) => setEditingTherapist({ ...editingTherapist, status: e.target.value as Therapist['status'] })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                >
                  <option value="Available">Available (On-Duty)</option>
                  <option value="In Session">In Session (Occupied)</option>
                  <option value="On Leave">On Leave (Offline)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization</label>
                <input
                  type="text"
                  value={editingTherapist.specialization}
                  onChange={(e) => setEditingTherapist({ ...editingTherapist, specialization: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Contact</label>
                <input
                  type="text"
                  value={editingTherapist.phone || ''}
                  onChange={(e) => setEditingTherapist({ ...editingTherapist, phone: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTherapist(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#2D3A3A] hover:bg-[#1E2525] text-white shadow-sm"
                >
                  Save Practitioner Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-serif font-bold text-red-600">
              Reject / Cancel Booking {rejectingBooking.booking_ref}
            </h3>
            <p className="text-xs text-slate-500">
              Please specify the reason for cancellation. If oil was previously deducted, it will be refunded back to the inventory balance.
            </p>

            <div>
              <label className="block text-xs text-slate-600 mb-1">Reason for Rejection</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setRejectingBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Keep Booking
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medical Dossier Modal */}
      <MedicalReportModal
        booking={selectedReportBooking}
        onClose={() => setSelectedReportBooking(null)}
      />

    </div>
  );
};
