import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useTheme } from "next-themes";
import * as THREE from "three";
import { buildGearShape } from "./gearGeometry";

/* ============================================================
   Escena 3D de un engranaje "planeta": mismo lenguaje visual que
   el globo de Viajes — fondo oscuro con niebla, luces de color,
   halo tipo atmósfera y un anillo inclinado tipo Saturno — pero
   con un engranaje real (dientes extruidos) en vez de una esfera,
   girando a una velocidad proporcional al % de cumplimiento.
============================================================ */
function resolveCssColor(input: string): string {
  if (typeof window === "undefined") return input;
  const match = input.match(/var\((--[\w-]+)\)/);
  if (!match) return input;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim();
  if (!raw) return "#22d3ee";
  if (/^[\d.]+\s+[\d.]+%\s+[\d.]+%$/.test(raw)) return `hsl(${raw.split(/\s+/).join(", ")})`;
  return raw;
}

function Gear({ pct, accent, light, teeth }: { pct: number; accent: string; light: boolean; teeth: number }) {
  const spinRef = useRef<THREE.Group>(null);
  const clamped = Math.max(0, Math.min(100, pct));
  const speed = useMemo(() => 0.12 + (clamped / 100) * 2.4, [clamped]);

  useFrame((_, dt) => {
    if (spinRef.current) spinRef.current.rotation.z -= speed * dt;
  });

  const geometry = useMemo(() => {
    const shape = buildGearShape(teeth, 1, 0.76, 0.34);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 3,
      curveSegments: 3,
    });
    geo.center();
    return geo;
  }, [teeth]);

  const bodyColor = light ? "#5b6270" : "#1a1f28";
  const hubColor = light ? "#3c4149" : "#0d1015";
  const emissiveIntensity = 0.4 + (clamped / 100) * 1.3;
  const ringOpacity = 0.18 + (clamped / 100) * 0.42;

  return (
    <group rotation={[0.46, 0.18, 0]}>
      {/* Halo tipo atmósfera, igual que el planeta de Viajes */}
      <mesh>
        <sphereGeometry args={[1.3, 32, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={light ? 0.05 : 0.1} side={THREE.BackSide} />
      </mesh>

      {/* Anillo inclinado tipo Saturno — su brillo sube con el % */}
      <mesh rotation={[Math.PI / 2.3, 0, 0]}>
        <ringGeometry args={[1.44, 1.62, 72]} />
        <meshBasicMaterial color={accent} transparent opacity={ringOpacity} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2.3, 0, 0]}>
        <ringGeometry args={[1.62, 1.66, 72]} />
        <meshBasicMaterial color={accent} transparent opacity={ringOpacity * 1.4} side={THREE.DoubleSide} />
      </mesh>

      <group ref={spinRef}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color={bodyColor} metalness={0.82} roughness={0.28} />
        </mesh>
        {/* Cubo central con anillo de acento incrustado (representa el cumplimiento) */}
        <mesh position={[0, 0, 0.135]}>
          <torusGeometry args={[0.5, 0.045, 18, 56]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={emissiveIntensity} metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.13]}>
          <circleGeometry args={[0.3, 40]} />
          <meshStandardMaterial color={hubColor} metalness={0.88} roughness={0.24} />
        </mesh>
      </group>
    </group>
  );
}

export function GearScene({ pct, accent, size, big = false }: { pct: number; accent: string; size: number; big?: boolean }) {
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === "light";
  const resolvedAccent = useMemo(() => resolveCssColor(accent), [accent, light]);
  const bg = light ? "#e9eef7" : "#05070d";

  return (
    <div style={{ width: size, height: size }} className="overflow-hidden rounded-full">
      <Canvas camera={{ position: [0, 0, big ? 4.5 : 3.7], fov: 34 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={[bg]} />
        <fog attach="fog" args={[bg, big ? 5.2 : 4.2, big ? 9.5 : 7.4]} />
        <ambientLight intensity={light ? 0.85 : 0.45} />
        <pointLight position={[3, 3, 4]} intensity={1.2} color={light ? "#ffffff" : resolvedAccent} />
        <pointLight position={[-3.5, -2.5, -2]} intensity={0.55} color="#a855f7" />
        {big && !light && <Stars radius={42} depth={30} count={1400} factor={2.4} fade speed={0.4} />}
        <Suspense fallback={null}>
          <Gear pct={pct} accent={resolvedAccent} light={light} teeth={big ? 16 : 12} />
        </Suspense>
      </Canvas>
    </div>
  );
}
