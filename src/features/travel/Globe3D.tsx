import { Canvas, useFrame, useLoader, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import * as THREE from "three";
import { useTravel } from "./TravelContext";
import {
  buildBordersGeometry,
  buildCountryFillGeometry,
  buildCountryOutline,
  loadWorldCountries,
  type CountryFeature,
} from "./geoUtils";

const GLOBE_RADIUS = 1.6;

// ---- A small async resource cache so we only fetch the world once ----
let _worldPromise: Promise<CountryFeature[]> | null = null;
function getWorld(): Promise<CountryFeature[]> {
  if (!_worldPromise) _worldPromise = loadWorldCountries();
  return _worldPromise;
}

function useWorld(): CountryFeature[] | null {
  const [data, setData] = useState<CountryFeature[] | null>(null);
  useEffect(() => {
    let alive = true;
    getWorld().then((d) => alive && setData(d));
    return () => { alive = false; };
  }, []);
  return data;
}

// ---- Base sphere (ocean) ----
function OceanSphere({ light }: { light: boolean }) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(light ? "#dbeafe" : "#040b18"),
        emissive: new THREE.Color(light ? "#bfdbfe" : "#020815"),
        emissiveIntensity: light ? 0.15 : 0.5,
        roughness: 0.95,
        metalness: 0.05,
      }),
    [light],
  );
  return (
    <mesh material={material}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
    </mesh>
  );
}

function Atmosphere({ light }: { light: boolean }) {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * 1.08, 64, 64]} />
      <meshBasicMaterial color={light ? "#0ea5e9" : "#22d3ee"} transparent opacity={light ? 0.04 : 0.06} side={THREE.BackSide} />
    </mesh>
  );
}

function Graticule({ light }: { light: boolean }) {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * 1.0008, 24, 16]} />
      <meshBasicMaterial color={light ? "#0369a1" : "#0e7490"} wireframe transparent opacity={light ? 0.12 : 0.08} />
    </mesh>
  );
}

// ---- All borders as one LineSegments (cheap & sharp) ----
function Borders({ features, light }: { features: CountryFeature[]; light: boolean }) {
  const geom = useMemo(() => buildBordersGeometry(features, GLOBE_RADIUS * 1.002), [features]);
  const mat = useMemo(
    () => new THREE.LineBasicMaterial({ color: light ? "#0c4a6e" : "#22d3ee", transparent: true, opacity: light ? 0.55 : 0.35 }),
    [light],
  );
  return <lineSegments geometry={geom} material={mat} />;
}

// ---- Per-country interactive layer ----
interface CountryMeshProps {
  feature: CountryFeature;
  status: "visited" | "wishlist" | "none";
  hovered: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
}

function CountryLayer({ feature, status, hovered, onHover, onClick }: CountryMeshProps) {
  const iso = feature.properties.iso;

  const fillGeom = useMemo(
    () => buildCountryFillGeometry(feature, GLOBE_RADIUS * 1.012),
    [feature],
  );
  const outlineGeom = useMemo(
    () => buildCountryOutline(feature, GLOBE_RADIUS * 1.014),
    [feature],
  );

  const pulseRef = useRef<THREE.LineSegments>(null);
  const fillMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const visitedOutlineRef = useRef<THREE.LineBasicMaterial>(null);
  const wishlistOutlineRef = useRef<THREE.LineBasicMaterial>(null);

  // Target color/opacity per state
  const fillColor =
    status === "visited" ? "#10b981" :
    status === "wishlist" ? "#22d3ee" :
    hovered ? "#22d3ee" : "#000000";
  const targetFillOpacity =
    status === "visited" ? 0.55 :
    status === "wishlist" ? 0.18 :
    hovered ? 0.25 : 0.001;

  // Smoothly animate opacity for elegant fade in/out (e.g. on remove)
  useFrame((_, dt) => {
    const lerp = Math.min(1, dt * 6);
    if (fillMatRef.current) {
      fillMatRef.current.opacity += (targetFillOpacity - fillMatRef.current.opacity) * lerp;
    }
    if (visitedOutlineRef.current) {
      const target = status === "visited" ? 0.9 : 0;
      visitedOutlineRef.current.opacity += (target - visitedOutlineRef.current.opacity) * lerp;
    }
    if (pulseRef.current && status === "wishlist") {
      const t = performance.now() / 1000;
      const mat = pulseRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.45 + Math.sin(t * 2.5) * 0.35;
    } else if (wishlistOutlineRef.current) {
      wishlistOutlineRef.current.opacity += (0 - wishlistOutlineRef.current.opacity) * lerp;
    }
  });

  // Reusable vectors for visibility test (front-face vs camera)
  const tmpHitWorld = useMemo(() => new THREE.Vector3(), []);
  const tmpHitLocal = useMemo(() => new THREE.Vector3(), []);

  // Returns true if the intersection point is on the front-facing hemisphere
  // relative to the camera (dot(normal, viewDir) > 0).
  const isFrontFacing = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    if (!e.point || !e.camera) return true;
    // Country fill sits on the globe sphere centered at the parent group's origin.
    // The surface normal at the hit point (in world space) is the normalized vector
    // from the globe center to the hit point.
    const parent = (e.object.parent?.parent as THREE.Object3D | undefined) ?? null;
    const center = tmpHitLocal.set(0, 0, 0);
    if (parent) parent.getWorldPosition(center);
    const normal = tmpHitWorld.copy(e.point).sub(center).normalize();
    const viewDir = tmpHitLocal.copy(e.camera.position).sub(e.point).normalize();
    return normal.dot(viewDir) > 0;
  };

  return (
    <group>
      {/* Invisible-ish fill — receives pointer events for the WHOLE country.
          Uses depth-tested FrontSide so countries behind the globe are
          occluded by the ocean sphere (no raycasting through the planet). */}
      <mesh
        geometry={fillGeom}
        renderOrder={1}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (!isFrontFacing(e)) return;
          e.stopPropagation();
          onHover(iso);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(null);
          document.body.style.cursor = "auto";
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (!isFrontFacing(e)) return;
          e.stopPropagation();
          onClick(iso);
        }}
      >
        <meshBasicMaterial
          ref={fillMatRef}
          color={fillColor}
          transparent
          opacity={0.001}
          side={THREE.FrontSide}
          depthTest
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Hover outline (instant, only when hovered) */}
      {hovered && (
        <lineSegments geometry={outlineGeom} renderOrder={2}>
          <lineBasicMaterial color="#22d3ee" transparent opacity={0.95} depthTest />
        </lineSegments>
      )}

      {/* Visited outline — always mounted, animated opacity for fade in/out */}
      <lineSegments geometry={outlineGeom} renderOrder={2}>
        <lineBasicMaterial ref={visitedOutlineRef} color="#10b981" transparent opacity={0} depthTest />
      </lineSegments>

      {/* Wishlist radar pulse — always mounted, animated opacity */}
      <lineSegments ref={pulseRef} geometry={outlineGeom} renderOrder={2}>
        <lineBasicMaterial ref={wishlistOutlineRef} color="#22d3ee" transparent opacity={0} depthTest />
      </lineSegments>
    </group>
  );
}

// ---- Flash effect when a country is marked visited ----
function Flash({ position, onDone }: { position: THREE.Vector3; onDone: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const start = useRef<number>(performance.now());
  useFrame(() => {
    if (!ref.current) return;
    const elapsed = (performance.now() - start.current) / 1000;
    const life = 0.9;
    if (elapsed >= life) return onDone();
    const t = elapsed / life;
    ref.current.scale.setScalar(0.05 + t * 1.2);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 1 - t;
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshBasicMaterial color="#10b981" transparent opacity={1} />
    </mesh>
  );
}

// ---- Rotating world group ----
function World({
  onSelectCountry,
  onHoverCountry,
  flashCountryID,
  onFlashConsumed,
  light,
}: {
  onSelectCountry: (iso: string, name: string) => void;
  onHoverCountry: (iso: string | null, name?: string) => void;
  flashCountryID: string | null;
  onFlashConsumed: () => void;
  light: boolean;
}) {
  const features = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const { entries } = useTravel();
  const [hoveredISO, setHoveredISO] = useState<string | null>(null);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.04;
  });

  const flashFeature = useMemo(
    () => features?.find((f) => f.properties.iso === flashCountryID) ?? null,
    [features, flashCountryID],
  );

  const flashPos = useMemo(() => {
    if (!flashFeature) return null;
    const poly =
      flashFeature.geometry.type === "Polygon"
        ? flashFeature.geometry.coordinates[0]
        : flashFeature.geometry.coordinates[0][0];
    let lng = 0, lat = 0;
    poly.forEach((p) => { lng += p[0]; lat += p[1]; });
    lng /= poly.length; lat /= poly.length;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const r = GLOBE_RADIUS * 1.05;
    return new THREE.Vector3(
      -(r * Math.sin(phi) * Math.cos(theta)),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    );
  }, [flashFeature]);

  return (
    <group ref={groupRef}>
      <OceanSphere light={light} />
      <Graticule light={light} />
      {features && <Borders features={features} light={light} />}

      {features?.map((f) => {
        const iso = f.properties.iso;
        const status = entries[iso]?.status ?? "none";
        return (
          <CountryLayer
            key={iso}
            feature={f}
            status={status === "none" ? "none" : status}
            hovered={hoveredISO === iso}
            onHover={(id) => {
              setHoveredISO(id);
              onHoverCountry(id, id ? f.properties.name : undefined);
            }}
            onClick={(id) => onSelectCountry(id, f.properties.name)}
          />
        );
      })}

      {flashPos && <Flash position={flashPos} onDone={onFlashConsumed} />}

      <Atmosphere light={light} />
    </group>
  );
}

interface Globe3DProps {
  onSelectCountry: (iso: string, name?: string) => void;
  onHoverCountry?: (iso: string | null, name?: string) => void;
  flashCountryID?: string | null;
  onFlashConsumed?: () => void;
}

export function Globe3D({ onSelectCountry, onHoverCountry, flashCountryID = null, onFlashConsumed }: Globe3DProps) {
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === "light";
  const bg = light ? "#eff6ff" : "#02040a";

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 6, 14]} />

      <ambientLight intensity={light ? 0.85 : 0.45} />
      <pointLight position={[5, 5, 5]} intensity={1.1} color={light ? "#0ea5e9" : "#22d3ee"} />
      <pointLight position={[-5, -3, -4]} intensity={0.5} color={light ? "#a855f7" : "#a855f7"} />

      {!light && (
        <Stars radius={50} depth={40} count={3000} factor={3} saturation={0} fade speed={0.5} />
      )}

      <Suspense fallback={null}>
        <World
          onSelectCountry={(iso, name) => onSelectCountry(iso, name)}
          onHoverCountry={(iso, name) => onHoverCountry?.(iso, name)}
          flashCountryID={flashCountryID}
          onFlashConsumed={() => onFlashConsumed?.()}
          light={light}
        />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom
        autoRotate={false}
        minDistance={2.4}
        maxDistance={8}
      />
    </Canvas>
  );
}
