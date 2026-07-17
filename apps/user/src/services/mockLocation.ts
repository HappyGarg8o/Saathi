const INDIAN_CITIES_COORDS: Record<string, { latitude: number; longitude: number }> = {
  Delhi: { latitude: 28.6139, longitude: 77.2090 },
  Mumbai: { latitude: 19.0760, longitude: 72.8777 },
  Bangalore: { latitude: 12.9716, longitude: 77.5946 },
  Hyderabad: { latitude: 17.3850, longitude: 78.4867 },
  Chennai: { latitude: 13.0827, longitude: 80.2707 },
  Pune: { latitude: 18.5204, longitude: 73.8567 },
};

export const getMockLocation = (city: string) => {
  const base = INDIAN_CITIES_COORDS[city] || 
    INDIAN_CITIES_COORDS.Delhi;
  return {
    latitude: base.latitude + (Math.random() - 0.5) * 0.01,
    longitude: base.longitude + (Math.random() - 0.5) * 0.01,
    accuracy: 15,
    timestamp: new Date().toISOString(),
  };
};

export const startMockLocationTracking = (
  city: string,
  callback: (location: any) => void
) => {
  callback(getMockLocation(city));
  const interval = setInterval(() => {
    callback(getMockLocation(city));
  }, 30000);
  return { remove: () => clearInterval(interval) };
};
