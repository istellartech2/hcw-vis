# satellite.js Usage Guide

## Overview

`satellite.js` is a JavaScript library that calculates satellite position and velocity using TLE (Two-Line Element) or Keplerian orbital elements. It supports coordinate transformations and Earth-based visualizations.

---

## Core Functions

### Parse TLE Data and Initialize Satellite

```js
import { twoline2satrec } from 'satellite.js';

const tleLine1 = '1 25544U 98067A   21275.51782528  .00000286  00000-0  12847-4 0  9991';
const tleLine2 = '2 25544  51.6446 137.4237 0005544  35.0524 325.0916 15.48815310299929';
const satrec = twoline2satrec(tleLine1, tleLine2);
```

### Initialize from Keplerian Elements

```js
import { SGP4init, WGS72 } from 'satellite.js';

const satrec = SGP4init(
  WGS72,       // Earth model
  'i',         // Operation mode ('a' or 'i')
  10000,       // Satellite number
  0.0,         // Epoch time (minutes)
  0.0001,      // bstar drag term
  0.0,         // eccentricity
  0.0,         // argument of perigee
  98.6,        // inclination (deg)
  0.0,         // mean motion derivative
  0.0,         // mean motion second derivative
  0.001,       // eccentricity
  0.0,         // mean anomaly
  0.0,         // RAAN
  15.0         // mean motion (rev/day)
);
```

### Get Satellite Position and Velocity (ECI Coordinates)

```js
import { propagate } from 'satellite.js';

const date = new Date();
const { position, velocity } = propagate(satrec, date);
```

---

## Coordinate Transformations

`satellite.js` supports the following transformations:

### 1. ECI (Earth-Centered Inertial) → ECEF (Earth-Centered Earth-Fixed)

```js
import { gstime, eciToEcf } from 'satellite.js';

const gmst = gstime(date);
const positionEcf = eciToEcf(position, gmst);
```

### 2. ECI → Geodetic Coordinates (Latitude, Longitude, Altitude)

```js
import { eciToGeodetic, degreesLat, degreesLong } from 'satellite.js';

const positionGd = eciToGeodetic(position, gmst);
const latitude = degreesLat(positionGd.latitude);
const longitude = degreesLong(positionGd.longitude);
const altitude = positionGd.height;
```

### 3. ECEF → Azimuth, Elevation, Range (AER) from Observer

```js
import { ecfToLookAngles, degreesToRadians } from 'satellite.js';

const observerGd = {
  longitude: degreesToRadians(139.6917), // Tokyo
  latitude: degreesToRadians(35.6895),
  height: 0.05 // in km
};

const lookAngles = ecfToLookAngles(observerGd, positionEcf);
// lookAngles.azimuth, lookAngles.elevation, lookAngles.range
```


---

## Example: Get Satellite Subpoint

```js
function getSubpoint(tle1, tle2, date) {
  const satrec = twoline2satrec(tle1, tle2);
  const { position } = propagate(satrec, date);
  const gmst = gstime(date);
  const geo = eciToGeodetic(position, gmst);
  return {
    lat: degreesLat(geo.latitude),
    lon: degreesLong(geo.longitude),
    alt: geo.height
  };
}
```

---
