import { NextRequest, NextResponse } from "next/server";

// GET /api/address?q=14+Baoba
// Australian address suggestions for the registration form.
//
// Proxied through the server rather than called from the browser so members'
// IP addresses are never exposed to the geocoder, and so the provider can be
// swapped here alone. Photon is OpenStreetMap-based and needs no API key.
const PHOTON = "https://photon.komoot.io/api/";

// Australia, as minLon,minLat,maxLon,maxLat, plus a bias toward Darwin since
// that is where the association's members live.
const AU_BBOX = "112.9,-44.0,159.2,-9.0";
const DARWIN = { lat: -12.4634, lon: 130.8456 };

const STATES: Record<string, string> = {
  "northern territory": "NT",
  "new south wales": "NSW",
  victoria: "VIC",
  queensland: "QLD",
  "south australia": "SA",
  "western australia": "WA",
  tasmania: "TAS",
  "australian capital territory": "ACT",
};

type Feature = {
  properties: {
    housenumber?: string;
    street?: string;
    name?: string;
    city?: string;
    district?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    countrycode?: string;
  };
};

function format(p: Feature["properties"]) {
  const street = [p.housenumber, p.street ?? p.name].filter(Boolean).join(" ");
  const locality = p.suburb ?? p.city ?? p.district;
  const state = p.state ? (STATES[p.state.toLowerCase()] ?? p.state) : undefined;
  return [street, locality, state, p.postcode].filter(Boolean).join(", ");
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ suggestions: [] });

  const url =
    `${PHOTON}?q=${encodeURIComponent(q)}&limit=8&lang=en` +
    `&bbox=${AU_BBOX}&lat=${DARWIN.lat}&lon=${DARWIN.lon}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "KIDAW-membership/1.0 (kidawelfare.org)" },
      // Identical lookups are reused for an hour, which keeps load off the
      // free geocoder while members type.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ suggestions: [] });

    const data = (await res.json()) as { features?: Feature[] };
    const seen = new Set<string>();
    const suggestions: string[] = [];

    for (const f of data.features ?? []) {
      const p = f.properties ?? {};
      if (p.countrycode !== "AU") continue;
      // A suggestion is only useful if it names a street.
      if (!p.street && !p.name) continue;
      const label = format(p);
      if (label && !seen.has(label)) {
        seen.add(label);
        suggestions.push(label);
      }
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 6) });
  } catch {
    // A lookup failure must never block registration — the member can still
    // type their address by hand.
    return NextResponse.json({ suggestions: [] });
  }
}
