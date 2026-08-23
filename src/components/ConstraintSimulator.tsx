import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Cpu,
  Play,
  Droplet,
  User,
  Layers,
  RotateCcw,
  Terminal,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ayurEngine } from '../services/engine';
import type { BookingCreationRPCResponse, Therapy, Therapist, ResourceRoom, InventoryItem } from '../types/ayursutra';
import { PageHeader, SectionHeader, Card, Button, Badge } from './ui';

export const ConstraintSimulator: React.FC = () => {
  const [therapies, setTherapies] = useState<Therapy[]>(() => ayurEngine.getTherapies());
  const [therapists, setTherapists] = useState<Therapist[]>(() => ayurEngine.getTherapists());
  const [rooms, setRooms] = useState<ResourceRoom[]>(() => ayurEngine.getRooms());
  const [inventory, setInventory] = useState<InventoryItem[]>(() => ayurEngine.getInventory());

  const [lastScenarioName, setLastScenarioName] = useState('');
  const [lastRpcResult, setLastRpcResult] = useState<BookingCreationRPCResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runningScenario, setRunningScenario] = useState<string | null>(null);

  useEffect(() => {
    return ayurEngine.subscribe(() => {
      setTherapies(ayurEngine.getTherapies());
      setTherapists(ayurEngine.getTherapists());
      setRooms(ayurEngine.getRooms());
      setInventory(ayurEngine.getInventory());
    });
  }, []);

  // SCENARIO 1: Oil depletion shortage (preserved)
  const runScenarioOilShortage = async () => {
    setIsRunning(true);
    setRunningScenario('A');
    setLastScenarioName('Insufficient medicated oil (inventory constraint)');

    const ksheerabala = inventory.find((i) => i.item_name.includes('Ksheerabala'));
    if (ksheerabala) ayurEngine.setInventoryStock(ksheerabala.id, 80);

    const todayHour = new Date();
    todayHour.setHours(15, 0, 0, 0);

    const result = await ayurEngine.createPanchakarmaBookingRPC({
      client_name: 'Devadatt Shastri (Simulation)',
      client_phone: '+91 98888 11111',
      client_email: 'devadatt@test.com',
      therapy_id: 'th-101',
      therapist_id: 'tp-1',
      room_id: 'rm-104',
      start_time: todayHour.toISOString(),
      medical_notes: 'High Pitta stress simulation',
    });

    setLastRpcResult(result);
    setIsRunning(false);
    setRunningScenario(null);
  };

  // SCENARIO 2: Therapist collision (preserved)
  const runScenarioTherapistCollision = async () => {
    setIsRunning(true);
    setRunningScenario('B');
    setLastScenarioName('Double-booking practitioner (practitioner constraint)');

    const todaySlot = new Date();
    todaySlot.setHours(9, 0, 0, 0);

    const result = await ayurEngine.createPanchakarmaBookingRPC({
      client_name: 'Simulated Overlap Patient',
      client_phone: '+91 99999 22222',
      client_email: 'overlap@test.com',
      therapy_id: 'th-102',
      therapist_id: 'tp-2',
      room_id: 'rm-101',
      start_time: todaySlot.toISOString(),
    });

    setLastRpcResult(result);
    setIsRunning(false);
    setRunningScenario(null);
  };

  // SCENARIO 3: Room collision (preserved)
  const runScenarioRoomCollision = async () => {
    setIsRunning(true);
    setRunningScenario('C');
    setLastScenarioName('Droni chamber occupied (chamber constraint)');

    const todaySlot = new Date();
    todaySlot.setHours(9, 0, 0, 0);

    const result = await ayurEngine.createPanchakarmaBookingRPC({
      client_name: 'Simulated Room Collision Patient',
      client_phone: '+91 97777 33333',
      client_email: 'room_overlap@test.com',
      therapy_id: 'th-103',
      therapist_id: 'tp-4',
      room_id: 'rm-102',
      start_time: todaySlot.toISOString(),
    });

    setLastRpcResult(result);
    setIsRunning(false);
    setRunningScenario(null);
  };

  // SCENARIO 4: Perfect pass (preserved)
  const runScenarioPerfectPass = async () => {
    setIsRunning(true);
    setRunningScenario('D');
    setLastScenarioName('All three constraints validated (atomic success)');

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
    setRunningScenario(null);
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Operations tooling"
        title="Constraint simulator"
        description="Trigger live scenarios against the PostgreSQL stored procedure and watch the ACID transaction enforce each rule."
        actions={
          <Button variant="secondary" size="sm" onClick={() => ayurEngine.resetToDefaults()} icon={<RotateCcw className="w-3.5 h-3.5" />}>
            Reset demo DB
          </Button>
        }
      />

      {/* The 3 rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RuleCard
          icon={<User className="w-[18px] h-[18px]" />}
          step="Rule 01"
          title="Practitioner slot"
          description="Validates therapist availability and rejects overlapping session windows."
          code="THERAPIST_CONFLICT"
        />
        <RuleCard
          icon={<Layers className="w-[18px] h-[18px]" />}
          step="Rule 02"
          title="Chamber occupancy"
          description="Ensures the Droni suite is operational and not booked concurrently."
          code="ROOM_CONFLICT"
        />
        <RuleCard
          icon={<Droplet className="w-[18px] h-[18px]" />}
          step="Rule 03"
          title="Oil stock floor"
          description="Enforces sufficient medicated oil for the exact formulation required."
          code="INVENTORY_SHORTAGE"
        />
      </div>

      {/* Scenario cards */}
      <Card className="p-5 sm:p-6 space-y-5">
        <SectionHeader
          icon={<Cpu />}
          title="One-click stress scenarios"
          description="Each scenario executes against the real stored procedure inside an isolated transaction."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ScenarioButton
            id="A"
            tone="danger"
            label="Scenario A"
            title="Drain oil stock"
            detail="Drops Ksheerabala to 80 mL, then attempts Shirodhara (750 mL)."
            running={runningScenario === 'A'}
            disabled={isRunning}
            onClick={runScenarioOilShortage}
            icon={<Droplet className="w-4 h-4" />}
          />
          <ScenarioButton
            id="B"
            tone="warning"
            label="Scenario B"
            title="Practitioner collision"
            detail="Books Acharya Menon during his occupied 09:00 AM slot."
            running={runningScenario === 'B'}
            disabled={isRunning}
            onClick={runScenarioTherapistCollision}
            icon={<User className="w-4 h-4" />}
          />
          <ScenarioButton
            id="C"
            tone="warning"
            label="Scenario C"
            title="Chamber conflict"
            detail="Attempts ROOM-102 while a session is already underway."
            running={runningScenario === 'C'}
            disabled={isRunning}
            onClick={runScenarioRoomCollision}
            icon={<Layers className="w-4 h-4" />}
          />
          <ScenarioButton
            id="D"
            tone="success"
            label="Scenario D"
            title="Atomic success path"
            detail="Restocks oil, clears constraints — booking created in Pending state."
            running={runningScenario === 'D'}
            disabled={isRunning}
            onClick={runScenarioPerfectPass}
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
        </div>

        {/* Result panel */}
        <AnimatePresence>
          {lastRpcResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="pt-5 border-t border-line space-y-3"
              role="status"
              aria-live="polite"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 font-display text-sm font-semibold text-forest-deep">
                  <Terminal className="w-4 h-4 text-forest" />
                  RPC result · <span className="font-sans font-normal text-muted">{lastScenarioName}</span>
                </p>
                {lastRpcResult.success ? (
                  <Badge tone="success">
                    <CheckCircle2 className="w-3.5 h-3.5" /> RPC_SUCCESS
                  </Badge>
                ) : (
                  <Badge tone="danger">
                    <XCircle className="w-3.5 h-3.5" /> {lastRpcResult.error_code || 'BLOCKED'}
                  </Badge>
                )}
              </div>
              <pre className="rounded-2xl bg-charcoal text-[#c8d6cf] border border-white/10 px-5 py-4 text-xs leading-relaxed overflow-x-auto">
                {JSON.stringify(lastRpcResult, null, 2)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Live state modifiers */}
      <Card className="p-5 sm:p-6 space-y-5">
        <SectionHeader
          icon={<Droplet />}
          title="Real-time state modifiers"
          description="Drag to adjust live inventory levels and observe how constraint outcomes change."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {inventory.slice(0, 2).map((item) => {
            const low = item.stock_ml <= item.min_threshold_ml;
            return (
              <div key={item.id} className="rounded-2xl bg-ivory border border-line p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-charcoal truncate pr-3">{item.item_name}</span>
                  <span className={`font-mono font-bold shrink-0 ${low ? 'text-danger' : 'text-forest'}`}>
                    {item.stock_ml} mL
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={50}
                  value={item.stock_ml}
                  onChange={(e) => ayurEngine.setInventoryStock(item.id, Number(e.target.value))}
                  aria-label={`${item.item_name} stock level`}
                  className="w-full accent-[#245C4A] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted font-medium">
                  <span>Depleted</span>
                  <span className={low ? 'text-warning font-bold' : ''}>Threshold {item.min_threshold_ml} mL</span>
                  <span>Full</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

const RuleCard: React.FC<{
  icon: React.ReactNode;
  step: string;
  title: string;
  description: string;
  code: string;
}> = ({ icon, step, title, description, code }) => (
  <motion.div whileHover={{ y: -2 }} className="surface surface-hover rounded-2xl p-5 space-y-3">
    <div className="flex items-center justify-between">
      <span className="w-9 h-9 rounded-xl bg-mint border border-sage/20 text-forest flex items-center justify-center">
        {icon}
      </span>
      <Badge tone="brand">{step}</Badge>
    </div>
    <h3 className="font-display text-sm font-semibold text-forest-deep">{title}</h3>
    <p className="text-xs text-muted leading-relaxed">{description}</p>
    <code className="block w-fit rounded-lg bg-red-50 border border-red-200/60 px-2.5 py-1 text-[11px] font-mono font-semibold text-danger">
      {code}
    </code>
  </motion.div>
);

const ScenarioButton: React.FC<{
  id: string;
  tone: 'danger' | 'warning' | 'success';
  label: string;
  title: string;
  detail: string;
  running: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}> = ({ tone, label, title, detail, running, disabled, onClick, icon }) => {
  const tones = {
    danger: 'text-danger border-danger/30 hover:border-danger/60 hover:bg-red-50/40',
    warning: 'text-warning border-warning/35 hover:border-warning/70 hover:bg-amber-50/40',
    success: 'text-success border-success/35 hover:border-success/70 hover:bg-emerald-50/40',
  };
  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`relative text-left p-4 rounded-2xl border bg-white/70 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait ${tones[tone]}`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold">{icon}{label}</span>
        {running ? (
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-label="Running" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current opacity-50" />
        )}
      </div>
      <h4 className="mt-2.5 font-display text-sm font-semibold text-charcoal">{title}</h4>
      <p className="mt-1 text-[11px] text-muted leading-relaxed">{detail}</p>
    </motion.button>
  );
};
