export interface Coord {
  lat: number;
  lng: number;
  speed_mph: number;
  heading: number | null;
  timestamp: number;
  road_name: string | null;
  speed_limit_mph: number | null;
}

export interface ReportSegment {
  road_name: string;
  distance_miles: number;
  speed_limit_mph: number | null;
  max_speed_mph: number;
  avg_speed_mph: number;
  exceeded: boolean;
  points: { timestamp: number; speed_mph: number; over: boolean }[];
}

function haversineKm(a: Coord, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function buildTripReport(coordinates: Coord[]): {
  segments: ReportSegment[];
  totalDistanceMiles: number;
  overallMaxSpeed: number;
} {
  const pts = coordinates;
  const segments: ReportSegment[] = [];
  let group: Coord[] = [];
  let totalKm = 0;
  const flush = () => {
    if (group.length === 0) return;
    let dKm = 0;
    for (let i = 1; i < group.length; i++) {
      dKm += haversineKm(group[i - 1], { lat: group[i].lat, lng: group[i].lng });
    }
    const speeds = group.map((p) => p.speed_mph).filter((s) => s > 0);
    const max = speeds.length ? Math.max(...speeds) : 0;
    const avg = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const limit = group.find((p) => p.speed_limit_mph != null)?.speed_limit_mph ?? null;
    const exceeded = limit != null && group.some((p) => p.speed_mph > limit);
    segments.push({
      road_name: group[0].road_name ?? "Unknown road",
      distance_miles: dKm * 0.621371,
      speed_limit_mph: limit,
      max_speed_mph: max,
      avg_speed_mph: avg,
      exceeded,
      points: group.map((p) => ({
        timestamp: p.timestamp,
        speed_mph: p.speed_mph,
        over: limit != null && p.speed_mph > limit,
      })),
    });
    totalKm += dKm;
  };
  for (const p of pts) {
    if (group.length === 0 || (group[group.length - 1].road_name ?? null) === (p.road_name ?? null)) {
      group.push(p);
    } else {
      flush();
      group = [p];
    }
  }
  flush();

  const allSpeeds = pts.map((p) => p.speed_mph).filter((s) => s > 0);
  const overallMaxSpeed = allSpeeds.length ? Math.max(...allSpeeds) : 0;

  return {
    segments,
    totalDistanceMiles: totalKm * 0.621371,
    overallMaxSpeed,
  };
}
