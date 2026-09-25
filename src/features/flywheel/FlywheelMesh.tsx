import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTheme } from "next-themes";
import * as THREE from "three";

/* ============================================================
   Malla 3D de un volante de inercia (flywheel) industrial:
   aro metálico, radios, cubo central y remaches — gira sobre
   su propio eje a una velocidad proporcional a su % de cumplimiento.
============================================================ */
function Rivets({ radius, count, color, metalness, roughness }: {
  radius: number; count: number; color: string; metalness: number; roughness: number;
}) {
  const positions = useMemo(
    () => Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      return [Math.cos(a) * radius, Math.sin(a) * radius, 0.05] as [number, number, number];
    }),
    [radius, count],
  );
  return (
    <>
      {positions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
        </mesh>
      ))}
    </>
  );
}

function FlywheelMesh({ pct, accent, light }: { pct: number; accent: string; light: boolean }) {
  const spinRef = useRef<THREE.Group>(null);
  const speed = useMemo(() => 0.25 + (Math.max(0, Math.min(100, pct)) / 100) * 3.2, [pct]);

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.z -= speed * delta;
  });

  const bodyColor = light ? "#8b8f96" : "#3a3f47";
  const rimColor = light ? "#6b6f76" : "#22262c";
  const hubColor = light ? "#5a5e64" : "#15171b";
  const emissiveIntensity = 0.25 + (pct / 100) * 0.9;

  return (
    <group rotation={[0.62, 0.12, 0]}>
      <group ref={spinRef}>
        {/* Aro exterior */}
        <mesh>
          <torusGeometry args={[1, 0.15, 32, 72]} />
          <meshStandardMaterial color={rimColor} metalness={0.85} roughness={0.32} />
        </mesh>
        {/* Anillo interior con brillo de acento (representa el cumplimiento) */}
        <mesh>
          <torusGeometry args={[0.74, 0.045, 20, 72]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={emissiveIntensity}
            metalness={0.5}
            roughness={0.35}
          />
        </mesh>
        {/* Disco base */}
        <mesh position={[0, 0, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.62, 0.62, 0.05, 48]} />
          <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Radios */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 6) * Math.PI * 2]}>
            <boxGeometry args={[0.09, 1.25, 0.09]} />
            <meshStandardMaterial color={bodyColor} metalness={0.75} roughness={0.35} />
          </mesh>
        ))}
        {/* Remaches en el aro */}
        <Rivets radius={0.95} count={10} color={hubColor} metalness={0.9} roughness={0.3} />
        {/* Cubo central */}
        <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.22, 32]} />
          <meshStandardMaterial color={hubColor} metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.06, 24]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={emissiveIntensity * 0.6} metalness={0.4} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/** Three.js no resuelve variables CSS: si accent es del tipo "hsl(var(--primary))",
 *  la leemos ya calculada del DOM y la convertimos a un hsl() que sí puede parsear. */
function resolveCssColor(input: string): string {
  if (typeof window === "undefined") return input;
  const match = input.match(/var\((--[\w-]+)\)/);
  if (!match) return input;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim();
  if (!raw) return "#3b82f6";
  if (/^[\d.]+\s+[\d.]+%\s+[\d.]+%$/.test(raw)) return `hsl(${raw.split(/\s+/).join(", ")})`;
  return raw;
}

export function Flywheel3D({ pct, accent, size }: { pct: number; accent: string; size: number }) {
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === "light";
  const resolvedAccent = useMemo(() => resolveCssColor(accent), [accent, light]);

  return (
    <div style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 3.1], fov: 32 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={light ? 0.75 : 0.5} />
        <directionalLight position={[3, 4, 5]} intensity={light ? 1.1 : 1.3} color={light ? "#ffffff" : "#e2e8f0"} />
        <pointLight position={[-3, -2, 2]} intensity={0.35} color={resolvedAccent} />
        <FlywheelMesh pct={pct} accent={resolvedAccent} light={light} />
      </Canvas>
    </div>
  );
}
