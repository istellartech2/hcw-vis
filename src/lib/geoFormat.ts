/** 緯度経度（度）を「35.2°N 139.7°E」の形に整形する */
export function formatLatLon(latitude: number, longitude: number): string {
    const lat = `${Math.abs(latitude).toFixed(1)}°${latitude >= 0 ? 'N' : 'S'}`;
    const lon = `${Math.abs(longitude).toFixed(1)}°${longitude >= 0 ? 'E' : 'W'}`;
    return `${lat} ${lon}`;
}
