import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Play, 
  Droplet, 
  User, 
  Layers, 
  RotateCcw, 
  Sliders, 
  Terminal, 
  CheckCircle2
} from 'lucide-react';
import { ayurEngine } from '../services/engine';
import { BookingCreationRPCResponse, Therapy, Therapist, ResourceRoom, InventoryItem } from '../types/ayursutra';

export const ConstraintSimulator: React.FC = () => {
  const [therapies, setTherapies] = useState<Therapy[]>(() => ayurEngine.getTherapies());
  const [therapists, setTherapists] = useState<Therapist[]>(() => ayurEngine.getTherapists());
  const [rooms, setRooms] = useState<ResourceRoom[]>(() => ayurEngine.getRooms());
  const [inventory, setInventory] = useState<InventoryItem[]>(() => ayurEngine.getInventory());

  // Simulation execution results
  const [lastScenarioName, setLastScenarioName] = useState<string>('');
  const [lastRpcResult, setLastRpcResult] = useState<BookingCreationRPCResponse | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  useEffect(() => {
    return ayurEngine.subscribe(() => {
      setTherapies(ayurEngine.getTherapies());
      setTherapists(ayurEngine.getTherapists());
      setRooms(ayurEngine.getRooms());
      setInventory(ayurEngine.getInventory());
    });
  }, []);

  // SCENARIO 1: Simulate Oil Depletion Shortage
  const runScenarioOilShortage = async () => {
    setIsRunning(true);
    setLastScenarioName('Scenario A: Insufficient Medicated Oil (Inventory Constraint)');
    
    const ksheerabala = inventory.find((i) => i.item_name.includes('Ksheerabala'));
    if (ksheerabala) {
      ayurEngine.setInventoryStock(ksheerabala.id, 80);
    }

    const todayHour = new Date();
    todayHour.setHours(15, 0, 0, 0);

    const result = await ayurEngine.createPanchakarmaBookingRPC({
      client_name: 'Devadatt Shastri (Simulation)',
      client_phone: '+91 98888 11111',
      client_email: 'devadatt@test.com',
      therapy_id: 'th-101', // Shirodhara (750 mL required)
      therapist_id: 'tp-1',
      room_id: 'rm-104',
      start_time: todayHour.toISOString(),
      medical_notes: 'High Pitta stress simulation',
    });

    setLastRpcResult(result);
    setIsRunning(false);
  };

  // SCENARIO 2: Simulate Therapist Collision
  const runScenarioTherapistCollision = async () => {
    setIsRunning(true);
    setLastScenarioName('Scenario B: Double-Booking Therapist (Practitioner Constraint)');

    const todaySlot = new Date();
    todaySlot.setHours(9, 0, 0, 0);

    const result = await ayurEngine.createPanchakarmaBookingRPC({
      client_name: 'Simulated Overlap Patient',
      client_phone: '+91 99999 22222',
      client_email: 'overlap@test.com',
      therapy_id: 'th-102', // Abhyanga
      therapist_id: 'tp-2', // Busy at 9:00 AM!
      room_id: 'rm-101',
      start_time: todaySlot.toISOString(),
    });

    setLastRpcResult(result);
    setIsRunning(false);
  };

  // SCENARIO 3: Simulate Droni Room Collision
  const runScenarioRoomCollision = async () => {
    setIsRunning(true);
    setLastScenarioName('Scenario C: Droni Room Occupied (Chamber Constraint)');

    const todaySlot = new Date();
    todaySlot.setHours(9, 0, 0, 0);

    const result = await ayurEngine.createPanchakarmaBookingRPC({
      client_name: 'Simulated Room Collision Patient',
      client_phone: '+91 97777 33333',
      client_email: 'room_overlap@test.com',
      therapy_id: 'th-103', // Patra Pinda Sweda
      therapist_id: 'tp-4',
      room_id: 'rm-102', // Busy Charaka Chamber at 9:00 AM!
      start_time: todaySlot.toISOString(),
    });

    setLastRpcResult(result);
    setIsRunning(false);
  };

  // SCENARIO 4: Simulate Perfect Multi-Variable Pass
  const runScenarioPerfectPass = async () => {
    setIsRunning(true);
    setLastScenarioName('Scenario D: All 3 Constraints Validated (Atomic Success)');

    inventory.forEach((i) => {
      if (i.stock_ml < 2000) ayurEngine.setInventoryStock(i.id, 3500);
    });

    const tomorrowSlot = new Date();
    tomorrowSlot.setDate(tomorrowSlot.getDate() + 1);
    tomorrowSlot.setHours(10, 0, 0, 0);

    const result = await ayurEngine.createPanchakarmaBookingRPC({
      client_name: 'Radhika Swaminathan (Simulation)',
      client_phone: '+91 96666 44444',
      client_email: 'radhika@test.com',
      therapy_id: 'th-101',
      therapist_id: 'tp-1',
      room_id: 'rm-104',
      start_time: tomorrowSlot.toISOString(),
      medical_notes: 'Stress rejuvenation and mental clarity',
    });

    setLastRpcResult(result);
    setIsRunning(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#8B9D83]/15 text-[#2D3A3A] text-xs font-semibold">
          <Cpu className="w-3.5 h-3.5 text-[#8B9D83]" />
          <span>Interactive Constraint Engine Test Bench</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
          Multi-Variable Constraint Logic & Stress Sandbox
        </h1>
        <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
          The AyurSutra PostgreSQL stored procedure enforces three non-negotiable Ayurvedic operational conditions inside an isolated ACID transaction before creating any booking in the <code className="font-mono text-[#2D3A3A] bg-slate-100 px-1 py-0.5 rounded">Pending</code> state.
        </p>
      </div>

      {/* 3 Core Rules Architecture Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Rule 1 */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="w-9 h-9 rounded-lg bg-[#8B9D83]/15 flex items-center justify-center text-[#2D3A3A]">
            <User className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-slate-900 text-base">
            1. Practitioner Slot Collision
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Checks <code className="font-mono text-slate-700">therapists.status = 'Available'</code> and queries active bookings using <code className="font-mono text-slate-700">OVERLAPS (p_start, v_end)</code>.
          </p>
          <div className="pt-2 text-[11px] font-mono text-red-700 bg-red-50 p-2 rounded border border-red-200">
            Error: THERAPIST_CONFLICT
          </div>
        </div>

        {/* Rule 2 */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="w-9 h-9 rounded-lg bg-[#8B9D83]/15 flex items-center justify-center text-[#2D3A3A]">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-slate-900 text-base">
            2. Droni Bed Chamber Occupancy
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ensures the traditional wooden Droni suite is <code className="font-mono text-slate-700">is_operational = true</code> and not occupied by concurrent therapy.
          </p>
          <div className="pt-2 text-[11px] font-mono text-red-700 bg-red-50 p-2 rounded border border-red-200">
            Error: ROOM_CONFLICT
          </div>
        </div>

        {/* Rule 3 */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="w-9 h-9 rounded-lg bg-[#8B9D83]/15 flex items-center justify-center text-[#2D3A3A]">
            <Droplet className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-slate-900 text-base">
            3. Medicated Oil Stock Threshold
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Enforces <code className="font-mono text-slate-700">inventory.stock_ml &gt;= therapies.oil_required_ml</code> for that specific classical formulation.
          </p>
          <div className="pt-2 text-[11px] font-mono text-red-700 bg-red-50 p-2 rounded border border-red-200">
            Error: INVENTORY_SHORTAGE
          </div>
        </div>

      </div>

      {/* Interactive Trigger Buttons */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-serif font-bold text-slate-900">
              One-Click Constraint Stress Scenarios
            </h2>
            <p className="text-xs text-slate-500">
              Execute live simulations directly against the AyurSutra PostgreSQL stored procedure
            </p>
          </div>
          <button
            onClick={() => ayurEngine.resetToDefaults()}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo DB</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Button 1: Oil Shortage */}
          <button
            onClick={runScenarioOilShortage}
            disabled={isRunning}
            className="p-4 rounded-xl bg-slate-50 border border-red-200 hover:border-red-400 text-left transition-all group hover:bg-red-50/50 cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-red-600">
              <span className="flex items-center gap-1.5">
                <Droplet className="w-4 h-4" />
                Scenario A
              </span>
              <Play className="w-3.5 h-3.5 fill-current opacity-60 group-hover:opacity-100" />
            </div>
            <h4 className="font-serif font-bold text-slate-900 text-sm mt-2">
              Trigger Oil Depletion Shortage
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Drains Ksheerabala to 80 mL and attempts Shirodhara (750 mL required).
            </p>
          </button>

          {/* Button 2: Therapist Collision */}
          <button
            onClick={runScenarioTherapistCollision}
            disabled={isRunning}
            className="p-4 rounded-xl bg-slate-50 border border-orange-200 hover:border-orange-400 text-left transition-all group hover:bg-orange-50/50 cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-orange-600">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                Scenario B
              </span>
              <Play className="w-3.5 h-3.5 fill-current opacity-60 group-hover:opacity-100" />
            </div>
            <h4 className="font-serif font-bold text-slate-900 text-sm mt-2">
              Trigger Practitioner Collision
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Attempts booking Acharya Govind Menon during his 09:00 AM slot.
            </p>
          </button>

          {/* Button 3: Room Collision */}
          <button
            onClick={runScenarioRoomCollision}
            disabled={isRunning}
            className="p-4 rounded-xl bg-slate-50 border border-orange-200 hover:border-orange-400 text-left transition-all group hover:bg-orange-50/50 cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-orange-600">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                Scenario C
              </span>
              <Play className="w-3.5 h-3.5 fill-current opacity-60 group-hover:opacity-100" />
            </div>
            <h4 className="font-serif font-bold text-slate-900 text-sm mt-2">
              Trigger Droni Chamber Conflict
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Attempts booking Charaka Chamber ROOM-102 during ongoing session.
            </p>
          </button>

          {/* Button 4: Perfect Pass */}
          <button
            onClick={runScenarioPerfectPass}
            disabled={isRunning}
            className="p-4 rounded-xl bg-slate-50 border border-emerald-200 hover:border-emerald-400 text-left transition-all group hover:bg-emerald-50/50 cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-600">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Scenario D
              </span>
              <Play className="w-3.5 h-3.5 fill-current opacity-60 group-hover:opacity-100" />
            </div>
            <h4 className="font-serif font-bold text-slate-900 text-sm mt-2">
              Atomic 3-Constraint Success
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Restocks oil, validates vacant practitioner & room, returns status Pending.
            </p>
          </button>

        </div>

        {/* Live Stored Procedure Output Console (Dark Slate Theme Box) */}
        {lastRpcResult && (
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif font-bold text-slate-900 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-[#8B9D83]" />
                Live RPC Return Payload: <span className="text-slate-500 font-sans">{lastScenarioName}</span>
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                lastRpcResult.success
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {lastRpcResult.success ? 'HTTP 200 RPC_SUCCESS' : `EXCEPTION: ${lastRpcResult.error_code}`}
              </span>
            </div>

            <pre className="p-4 rounded-xl bg-[#2D3A3A] text-slate-200 border border-slate-700 text-xs font-mono overflow-x-auto shadow-inner">
              {JSON.stringify(lastRpcResult, null, 2)}
            </pre>
          </div>
        )}

      </div>

      {/* Manual Live Sliders */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-[#8B9D83]" />
          <h3 className="text-base font-serif font-bold text-slate-900">
            Real-Time State Modifiers (Live DB Sliders)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {inventory.slice(0, 2).map((item) => (
            <div key={item.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-800">{item.item_name}</span>
                <span className="font-mono text-slate-700 font-bold">{item.stock_ml} mL</span>
              </div>
              <input
                type="range"
                min="0"
                max="5000"
                step="50"
                value={item.stock_ml}
                onChange={(e) => ayurEngine.setInventoryStock(item.id, Number(e.target.value))}
                className="w-full accent-[#8B9D83] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0 mL (Depleted)</span>
                <span>Threshold: {item.min_threshold_ml} mL</span>
                <span>5,000 mL (Full)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
