import * as THREE from "three";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, Polygon, MultiPolygon, Position } from "geojson";

// world-atlas uses ISO 3166-1 numeric codes as id. We map to alpha-2 for our app.
// Minimal map of numeric -> alpha-2 for countries we use elsewhere.
export const NUMERIC_TO_ISO2: Record<string, string> = {
  "004": "AF", "008": "AL", "012": "DZ", "020": "AD", "024": "AO", "032": "AR",
  "036": "AU", "040": "AT", "044": "BS", "048": "BH", "050": "BD", "051": "AM",
  "052": "BB", "056": "BE", "060": "BM", "064": "BT", "068": "BO", "070": "BA",
  "072": "BW", "076": "BR", "084": "BZ", "090": "SB", "096": "BN", "100": "BG",
  "104": "MM", "108": "BI", "112": "BY", "116": "KH", "120": "CM", "124": "CA",
  "132": "CV", "140": "CF", "144": "LK", "148": "TD", "152": "CL", "156": "CN",
  "158": "TW", "170": "CO", "174": "KM", "178": "CG", "180": "CD", "188": "CR",
  "191": "HR", "192": "CU", "196": "CY", "203": "CZ", "204": "BJ", "208": "DK",
  "212": "DM", "214": "DO", "218": "EC", "222": "SV", "226": "GQ", "231": "ET",
  "232": "ER", "233": "EE", "242": "FJ", "246": "FI", "250": "FR", "260": "TF",
  "262": "DJ", "266": "GA", "268": "GE", "270": "GM", "276": "DE", "288": "GH",
  "292": "GI", "300": "GR", "304": "GL", "308": "GD", "320": "GT", "324": "GN",
  "328": "GY", "332": "HT", "340": "HN", "344": "HK", "348": "HU", "352": "IS",
  "356": "IN", "360": "ID", "364": "IR", "368": "IQ", "372": "IE", "376": "IL",
  "380": "IT", "384": "CI", "388": "JM", "392": "JP", "398": "KZ", "400": "JO",
  "404": "KE", "408": "KP", "410": "KR", "414": "KW", "417": "KG", "418": "LA",
  "422": "LB", "426": "LS", "428": "LV", "430": "LR", "434": "LY", "438": "LI",
  "440": "LT", "442": "LU", "450": "MG", "454": "MW", "458": "MY", "462": "MV",
  "466": "ML", "470": "MT", "478": "MR", "480": "MU", "484": "MX", "496": "MN",
  "498": "MD", "499": "ME", "504": "MA", "508": "MZ", "512": "OM", "516": "NA",
  "524": "NP", "528": "NL", "540": "NC", "548": "VU", "554": "NZ", "558": "NI",
  "562": "NE", "566": "NG", "578": "NO", "584": "MH", "586": "PK", "591": "PA",
  "598": "PG", "600": "PY", "604": "PE", "608": "PH", "616": "PL", "620": "PT",
  "624": "GW", "626": "TL", "634": "QA", "642": "RO", "643": "RU", "646": "RW",
  "682": "SA", "686": "SN", "688": "RS", "694": "SL", "702": "SG", "703": "SK",
  "704": "VN", "705": "SI", "706": "SO", "710": "ZA", "716": "ZW", "724": "ES",
  "728": "SS", "729": "SD", "740": "SR", "748": "SZ", "752": "SE", "756": "CH",
  "760": "SY", "762": "TJ", "764": "TH", "768": "TG", "776": "TO", "780": "TT",
  "784": "AE", "788": "TN", "792": "TR", "795": "TM", "798": "TV", "800": "UG",
  "804": "UA", "807": "MK", "818": "EG", "826": "GB", "834": "TZ", "840": "US",
  "854": "BF", "858": "UY", "860": "UZ", "862": "VE", "882": "WS", "887": "YE",
  "894": "ZM",
};

export interface CountryFeatureProps {
  iso: string;
  name: string;
}

export type CountryFeature = Feature<Polygon | MultiPolygon, CountryFeatureProps>;

export function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/**
 * Load and normalize world countries from world-atlas TopoJSON.
 */
export async function loadWorldCountries(): Promise<CountryFeature[]> {
  // 110m resolution = small file, smooth on globe
  const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  const topo = await res.json();
  const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<
    Polygon | MultiPolygon,
    { name: string }
  >;
  return fc.features.map((f) => ({
    ...f,
    properties: {
      iso: NUMERIC_TO_ISO2[String(f.id).padStart(3, "0")] ?? String(f.id),
      name: f.properties?.name ?? "Unknown",
    },
  })) as CountryFeature[];
}

/**
 * Sample a polygon ring with intermediate points along great-circle arcs
 * so that long straight lon/lat segments curve naturally on the sphere.
 */
function densifyRing(ring: Position[], maxDeg = 3): Position[] {
  const out: Position[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    out.push([lng1, lat1]);
    const dLng = Math.abs(lng2 - lng1);
    const dLat = Math.abs(lat2 - lat1);
    const steps = Math.max(1, Math.ceil(Math.max(dLng, dLat) / maxDeg));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      out.push([lng1 + (lng2 - lng1) * t, lat1 + (lat2 - lat1) * t]);
    }
  }
  out.push(ring[ring.length - 1]);
  return out;
}

/**
 * Build a single LineSegments geometry containing every country border.
 */
export function buildBordersGeometry(features: CountryFeature[], radius: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const pushRing = (ring: Position[]) => {
    const dense = densifyRing(ring, 2.5);
    for (let i = 0; i < dense.length - 1; i++) {
      const a = latLngToVec3(dense[i][1], dense[i][0], radius);
      const b = latLngToVec3(dense[i + 1][1], dense[i + 1][0], radius);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  };
  for (const f of features) {
    const g = f.geometry;
    if (g.type === "Polygon") {
      g.coordinates.forEach(pushRing);
    } else if (g.type === "MultiPolygon") {
      g.coordinates.forEach((poly) => poly.forEach(pushRing));
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geom;
}

/**
 * Build per-country LINE_LOOP geometry for outlines (used for hover & wishlist pulse).
 */
export function buildCountryOutline(feature: CountryFeature, radius: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const pushRing = (ring: Position[]) => {
    const dense = densifyRing(ring, 2);
    for (let i = 0; i < dense.length - 1; i++) {
      const a = latLngToVec3(dense[i][1], dense[i][0], radius);
      const b = latLngToVec3(dense[i + 1][1], dense[i + 1][0], radius);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  };
  const g = feature.geometry;
  if (g.type === "Polygon") g.coordinates.forEach(pushRing);
  else if (g.type === "MultiPolygon") g.coordinates.forEach((poly) => poly.forEach(pushRing));
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geom;
}

/**
 * Triangulate a country polygon (using earcut via THREE.ShapeUtils on flat lat/lng)
 * and project each triangle vertex onto the sphere. Good enough for fill highlights.
 */
export function buildCountryFillGeometry(feature: CountryFeature, radius: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const polygons: Position[][][] =
    feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;

  for (const poly of polygons) {
    const outer = poly[0];
    if (!outer || outer.length < 3) continue;
    // Densify outer ring for nicer curvature on sphere
    const dense = densifyRing(outer, 2);
    const flatPts = dense.slice(0, -1).map((p) => new THREE.Vector2(p[0], p[1]));
    const triangles = THREE.ShapeUtils.triangulateShape(flatPts, []);
    for (const tri of triangles) {
      for (const idx of tri) {
        const p = flatPts[idx];
        const v = latLngToVec3(p.y, p.x, radius);
        positions.push(v.x, v.y, v.z);
      }
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return geom;
}
