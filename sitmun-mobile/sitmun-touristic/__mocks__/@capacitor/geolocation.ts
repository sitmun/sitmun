export const Geolocation = {
  checkPermissions: async () => ({ location: 'granted', coarseLocation: 'granted' }),
  requestPermissions: async () => ({ location: 'granted', coarseLocation: 'granted' }),
  getCurrentPosition: async () => ({ coords: { longitude: 0, latitude: 0 } }),
};
