import { readFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';
import { glob } from 'tinyglobby';
import { z } from 'astro/zod';
import type { Loader } from 'astro/loaders';

// Client payload target — keep the polyline light. A naive stride-based
// decimation is enough for v1; a proper simplification (e.g. Douglas–Peucker
// via `simplify-js`) would preserve curves/corners better and is a good
// future upgrade.
const MAX_POINTS = 300;

// Ignore elevation deltas below this before summing gain — raw GPS altitude
// is noisy and a naive positive-delta sum wildly overestimates climbing.
const ELEVATION_NOISE_THRESHOLD_M = 1.5;

const activitySchema = z.object({
  recordedAt: z.coerce.date().optional(),
  distanceKm: z.number(),
  elevationGainM: z.number(),
  points: z.array(
    z.object({
      lat: z.number(),
      lon: z.number(),
      ele: z.number().optional(),
      distKm: z.number(),
    }),
  ),
});

interface RawPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function extractTrackPoints(parsed: any): RawPoint[] {
  const tracks = toArray(parsed?.gpx?.trk);
  const points: RawPoint[] = [];

  for (const track of tracks) {
    for (const segment of toArray(track?.trkseg)) {
      for (const point of toArray(segment?.trkpt)) {
        const lat = Number(point?.['@_lat']);
        const lon = Number(point?.['@_lon']);
        if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

        const ele = point?.ele !== undefined ? Number(point.ele) : undefined;
        points.push({ lat, lon, ele: Number.isNaN(ele) ? undefined : ele, time: point?.time });
      }
    }
  }

  return points;
}

function haversineKm(a: RawPoint, b: RawPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function computeStats(points: RawPoint[]): { distanceKm: number; elevationGainM: number } {
  let distanceKm = 0;
  for (let i = 1; i < points.length; i++) {
    distanceKm += haversineKm(points[i - 1], points[i]);
  }

  // Raw GPS elevation drifts up/down in tiny sub-threshold steps even on a
  // real climb, so thresholding each individual delta discards everything.
  // Use hysteresis instead: only move the baseline (and count gain) once the
  // *cumulative* drift since the last baseline exceeds the noise threshold.
  let elevationGainM = 0;
  let baseline: number | undefined;
  for (const point of points) {
    if (point.ele === undefined) continue;
    if (baseline === undefined) {
      baseline = point.ele;
      continue;
    }
    const diff = point.ele - baseline;
    if (diff > ELEVATION_NOISE_THRESHOLD_M) {
      elevationGainM += diff;
      baseline = point.ele;
    } else if (diff < -ELEVATION_NOISE_THRESHOLD_M) {
      baseline = point.ele;
    }
  }

  return { distanceKm, elevationGainM };
}

function cumulativeDistancesKm(points: RawPoint[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + haversineKm(points[i - 1], points[i]));
  }
  return out;
}

function decimate<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;

  const stride = Math.ceil(points.length / max);
  const out = points.filter((_, i) => i % stride === 0);

  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);

  return out;
}

export function gpxLoader(): Loader {
  return {
    name: 'gpx-loader',
    schema: activitySchema,
    async load({ store, config, logger, parseData }) {
      const base = new URL('./src/content/posts/', config.root);
      const files = await glob('**/*.gpx', { cwd: base });

      store.clear();

      for (const relativePath of files) {
        const id = relativePath;
        const fileUrl = new URL(relativePath, base);
        const xml = await readFile(fileUrl, 'utf-8');

        const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(xml);
        const rawPoints = extractTrackPoints(parsed);

        if (rawPoints.length === 0) {
          logger.warn(`gpx: no track points found in ${relativePath}`);
          continue;
        }

        const { distanceKm, elevationGainM } = computeStats(rawPoints);

        const distances = cumulativeDistancesKm(rawPoints);
        const enrichedPoints = rawPoints.map((p, i) => ({
          lat: p.lat,
          lon: p.lon,
          ele: p.ele,
          distKm: distances[i],
        }));
        const points = decimate(enrichedPoints, MAX_POINTS);
        const recordedAt = rawPoints[0].time;

        const data = await parseData({
          id,
          data: { recordedAt, distanceKm, elevationGainM, points },
        });

        store.set({ id, data });

        logger.info(`gpx: loaded ${id} (${rawPoints.length} → ${points.length} pts)`);
      }
    },
  };
}
