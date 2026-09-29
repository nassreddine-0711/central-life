import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import * as THREE from "three";
import { HeartPulse, Wallet, Brain, Layers3, Plane, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { buildGearShape } from "./gearGeometry";
import type { ComputedSpoke, SpokeType } from "./FlywheelContext";

/* ============================================================
   "LIFE INTEGRITY" — la máquina completa en una sola escena:
   un engranaje central macizo (titanio cepillado + líneas de
   energía doradas, giroscopio interno) del que cuelgan, por ejes
   mecánicos y acoples magnéticos, los engranajes periféricos de
   cada área — metal oscuro, iluminación de borde, niebla y un
   halo ámbar pulsante en el eje. Una sola pieza, no tarjetas sueltas.
============================================================ */

const SPOKE_ROUTE: Partial<Record<SpokeType, string>> = {
  health: "/salud",
  finance: "/finanzas",
  secondBrain: "/cerebro",
  projects: "/cerebro",
  trips: "/viajes",
};

const SPOKE_ICON: Record<SpokeType, typeof HeartPulse> = {
  health: HeartPulse,
  finance: Wallet,
  secondBrain: Brain,
  projects: Layers3,
  trips: Plane,
  manual: Sparkles,
};

function resolveCssColor(input: string): string {
  if (typeof window === "undefined") return input;
  const match = input.match(/var\((--[\w-]+)\)/);
  if (!match) return input;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim();
  if (!raw) return "#f5a623";
  if (/^[\d.]+\s+[\d.]+%\s+[\d.]+%$/.test(raw)) return `hsl(${raw.split(/\s+/).join(", ")})`;
  return raw;
}

function quatFromTo(a: THREE.Vector3, dir: THREE.Vector3) {
  return new THREE.Quaternion().setFromUnitVectors(a, dir.clone().normalize());
}

function gearGeometry(teeth: number, outer: number, inner: number, bore: number, depth: number) {
  const shape = buildGearShape(teeth, outer, inner, bore);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: depth * 0.16, bevelSize: depth * 0.16, bevelSegments: 3, curveSegments: 3,
  });
  geo.center();
  return geo;
}

/* ---------- Eje mecánico + acople magnético entre el núcleo y un periférico ---------- */
function Coupling({ from, to, accent }: { from: THREE.Vector3; to: THREE.Vector3; accent: string }) {
  const dir = useMemo(() => to.clone().sub(from), [from, to]);
  const length = dir.length();
  const mid = useMemo(() => from.clone().add(to).multiplyScalar(0.5), [from, to]);
  const rodQuat = useMemo(() => quatFromTo(new THREE.Vector3(0, 1, 0), dir), [dir]);
  const ringQuat = useMemo(() => quatFromTo(new THREE.Vector3(0, 0, 1), dir), [dir]);

  return (
    <group>
      <mesh position={mid} quaternion={rodQuat}>
        <cylinderGeometry args={[0.032, 0.032, length, 12]} />
        <meshStandardMaterial color="#2a2d33" metalness={0.85} roughness={0.35} />
      </mesh>
      {/* Acople magnético en el extremo periférico */}
      <mesh position={to} quaternion={ringQuat}>
        <torusGeometry args={[0.14, 0.028, 12, 28]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} metalness={0.4} roughness={0.35} />
      </mesh>
    </group>
  );
}

/* ---------- Núcleo central "LIFE INTEGRITY" ---------- */
function CoreHub({ pct }: { pct: number }) {
  const spinRef = useRef<THREE.Group>(null);
  const gyroRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const clamped = Math.max(0, Math.min(100, pct));
  const speed = 0.12 + (clamped / 100) * 1.4;

  const geometry = useMemo(() => gearGeometry(20, 1, 0.8, 0.4, 0.3), []);

  useFrame((state, dt) => {
    if (spinRef.current) spinRef.current.rotation.z -= speed * dt;
    if (gyroRef.current) {
      gyroRef.current.rotation.x += dt * 0.9;
      gyroRef.current.rotation.y += dt * 0.5;
    }
    if (pulseRef.current) {
      const t = state.clock.elapsedTime;
      const mat = pulseRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.1 + Math.sin(t * 1.6) * 0.5;
    }
  });

  return (
    <group scale={1.85}>
      <group ref={spinRef}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#8c8f95" metalness={0.9} roughness={0.28} />
        </mesh>
        {/* Líneas de energía doradas incrustadas */}
        <mesh position={[0, 0, 0.17]}>
          <torusGeometry args={[0.62, 0.028, 16, 72]} />
          <meshStandardMaterial color="#e3b341" emissive="#d99a1f" emissiveIntensity={1} metalness={0.6} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.17]}>
          <torusGeometry args={[0.46, 0.02, 16, 72]} />
          <meshStandardMaterial color="#e3b341" emissive="#d99a1f" emissiveIntensity={0.8} metalness={0.6} roughness={0.25} />
        </mesh>
        {/* Cubo oscuro */}
        <mesh position={[0, 0, 0.2]}>
          <circleGeometry args={[0.34, 40]} />
          <meshStandardMaterial color="#0e0f12" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Giroscopio interno — gira en otro eje, puro efecto */}
      <mesh ref={gyroRef} position={[0, 0, 0.24]}>
        <torusGeometry args={[0.22, 0.012, 10, 40]} />
        <meshStandardMaterial color="#f2d27a" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Halo ámbar pulsante en el eje */}
      <mesh ref={pulseRef} position={[0, 0, 0.26]}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial color="#ffb648" emissive="#ffb648" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

/* ---------- Engranaje periférico de un área ---------- */
function PeripheralGear({
  spoke, position, teeth, scale,
}: {
  spoke: ComputedSpoke; position: THREE.Vector3; teeth: number; scale: number;
}) {
  const navigate = useNavigate();
  const spinRef = useRef<THREE.Group>(null);
  const clamped = Math.max(0, Math.min(100, spoke.pct));
  const speed = 0.1 + (clamped / 100) * 2.1;
  const geometry = useMemo(() => gearGeometry(teeth, 1, 0.76, 0.32, 0.24), [teeth]);
  const route = SPOKE_ROUTE[spoke.type];
  const Icon = SPOKE_ICON[spoke.type];

  useFrame((_, dt) => { if (spinRef.current) spinRef.current.rotation.z -= speed * dt; });

  const emissiveIntensity = 0.5 + (clamped / 100) * 1.1;

  return (
    <group position={position} scale={scale}>
      <group
        ref={spinRef}
        onClick={(e) => { if (route) { e.stopPropagation(); navigate(route); } }}
        onPointerOver={() => { if (route) document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "auto"; }}
      >
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#15171b" metalness={0.85} roughness={0.32} />
        </mesh>
        <mesh position={[0, 0, 0.135]}>
          <torusGeometry args={[0.5, 0.045, 16, 56]} />
          <meshStandardMaterial color={spoke.color} emissive={spoke.color} emissiveIntensity={emissiveIntensity} metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.13]}>
          <circleGeometry args={[0.28, 36]} />
          <meshStandardMaterial color="#0a0b0d" metalness={0.9} roughness={0.22} />
        </mesh>
      </group>

      <Html center position={[0, -1.55, 0]} style={{ pointerEvents: "none" }}>
        <div
          className="flex flex-col items-center gap-0.5 whitespace-nowrap rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 backdrop-blur-sm"
          style={{ pointerEvents: route ? "auto" : "none", cursor: route ? "pointer" : "default" }}
          onClick={() => route && navigate(route)}
        >
          <span className="flex items-center gap-1 text-[11px] font-bold tabular-nums text-white">
            <Icon className="h-3 w-3" style={{ color: spoke.color }} /> {spoke.pct}%
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-white/70">{spoke.label}</span>
        </div>
      </Html>
    </group>
  );
}

/* ---------- Suelo reflejante tenue ---------- */
function Floor() {
  return (
    <mesh position={[0, 0, -1.4]} receiveShadow>
      <circleGeometry args={[9, 64]} />
      <meshStandardMaterial color="#0a0b0e" metalness={0.6} roughness={0.55} />
    </mesh>
  );
}

function Assembly({ overallPct, spokes }: { overallPct: number; spokes: ComputedSpoke[] }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (groupRef.current) groupRef.current.rotation.z += dt * 0.015; });

  const count = spokes.length;
  const R = 3.55;
  const nodes = useMemo(() => spokes.map((s, i) => {
    const angle = (i / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
    const pos = new THREE.Vector3(Math.cos(angle) * R, Math.sin(angle) * R, 0);
    const teeth = 10 + ((i * 3) % 5);
    const scale = 0.62 + ((i % 3) * 0.09);
    return { spoke: s, pos, teeth, scale };
  }), [spokes, count]);

  return (
    <group rotation={[0.5, 0, 0]}>
      <Floor />
      <group ref={groupRef}>
        {nodes.map((n) => (
          <Coupling key={n.spoke.id} from={new THREE.Vector3(0, 0, 0)} to={n.pos} accent={n.spoke.color} />
        ))}
        <CoreHub pct={overallPct} />
        {nodes.map((n) => (
          <PeripheralGear key={n.spoke.id} spoke={n.spoke} position={n.pos} teeth={n.teeth} scale={n.scale} />
        ))}
      </group>
    </group>
  );
}

export function MachineScene({ overallPct, spokes, height = 480 }: { overallPct: number; spokes: ComputedSpoke[]; height?: number }) {
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === "light";
  const bg = light ? "#e7e4dd" : "#020202";

  return (
    <div style={{ width: "100%", height }} className="overflow-hidden rounded-[1.75rem]">
      <Canvas shadows camera={{ position: [0, -2.2, 6.4], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={[bg]} />
        <fog attach="fog" args={[bg, 7, 15]} />
        <ambientLight intensity={light ? 0.55 : 0.16} />
        {/* Luz de borde ámbar (rim light) */}
        <directionalLight position={[-4, 3, 2]} intensity={light ? 1.4 : 2.1} color="#ffb648" castShadow />
        {/* Relleno frío, tenue */}
        <pointLight position={[4, -2, 4]} intensity={0.4} color="#7dd3fc" />
        <pointLight position={[0, 0, 5]} intensity={0.25} color="#ffffff" />
        <Suspense fallback={null}>
          <Assembly overallPct={overallPct} spokes={spokes} />
        </Suspense>
      </Canvas>
    </div>
  );
}
