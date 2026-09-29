import * as THREE from "three";

/* ============================================================
   Genera el perfil 2D de un engranaje real (dientes trapezoidales
   + taladro central) para extruirlo en 3D. Nada de primitivas
   genéricas (torus/cilindro): esto es la silueta de un engranaje.
============================================================ */
export function buildGearShape(teeth: number, outerRadius: number, innerRadius: number, boreRadius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const tipHalf = step * 0.22;
  const rootHalf = step * 0.46;

  const pt = (r: number, a: number) => new THREE.Vector2(r * Math.cos(a), r * Math.sin(a));

  const points: THREE.Vector2[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    points.push(pt(innerRadius, a - rootHalf));
    points.push(pt(outerRadius, a - tipHalf));
    points.push(pt(outerRadius, a + tipHalf));
    points.push(pt(innerRadius, a + rootHalf));
  }
  shape.setFromPoints(points);

  const hole = new THREE.Path();
  hole.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  return shape;
}
