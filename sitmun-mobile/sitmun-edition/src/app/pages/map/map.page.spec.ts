import { readFileSync } from 'fs';
import { join } from 'path';
import { of } from 'rxjs';

jest.mock('@ionic/angular', () => ({
  AlertController: class {},
  LoadingController: class {},
  ToastController: class {},
}));
jest.mock('@capacitor/camera', () => ({
  Camera: { getPhoto: async () => ({}) },
  CameraResultType: {},
  CameraSource: {},
}));
jest.mock('@capacitor/geolocation', () => ({ Geolocation: {} }));
jest.mock('@capacitor/filesystem', () => ({ Filesystem: {}, Directory: {} }));

import { MapPage } from './map.page';

describe('MapPage point form', () => {
  function barePage(): MapPage {
    return Object.create(MapPage.prototype);
  }

  it('hides delete while adding a point', () => {
    const html = readFileSync(join(__dirname, 'map.page.html'), 'utf8');
    const beforeDelete = html.slice(0, html.indexOf('del-feat-btn'));
    const enclosingBlock = beforeDelete.slice(beforeDelete.lastIndexOf('@if'));
    expect(enclosingBlock).toMatch(/^@if \(!newPoint\) \{\s*<ion-button[^>}]*$/);
  });

  it('clears the selected point when the form is dismissed', () => {
    const page = barePage();
    const clearSelectedFeatures = jest.fn();
    page.mapa = { getFeatureHandler: () => ({ clearSelectedFeatures }) };
    page.isFeatureModalOpen = true;
    page.newGeometry = { type: 'Point' };

    page.closeFeatureModal(true);

    expect(page.isFeatureModalOpen).toBe(false);
    expect(page.newGeometry).toBeNull();
    expect(clearSelectedFeatures).toHaveBeenCalledTimes(1);
  });

  it('keeps the selected point while its geometry is edited', () => {
    const page = barePage();
    const clearSelectedFeatures = jest.fn();
    page.mapa = { getFeatureHandler: () => ({ clearSelectedFeatures }) };
    page.newGeometry = { type: 'Point' };

    page.closeFeatureModal(false);

    expect(page.newGeometry).toEqual({ type: 'Point' });
    expect(clearSelectedFeatures).not.toHaveBeenCalled();
  });

  it('closes the form after the point is saved', async () => {
    const page = barePage() as any;
    page.saving = false;
    page.errorImg = [];
    page.imageAttr = '';
    page.newPoint = false;
    page.featureAttrForm = { markAllAsTouched() {}, valid: true };
    page.languageService = { translateTag: () => of('saved') };
    page.mapService = { createToast() {} };
    page.loadingCtrl = {
      create: async () => ({ present: async () => {}, dismiss: async () => {} }),
    };
    page.saveFeature = jest.fn(async () => true);
    page.closeFeatureModal = jest.fn();

    await page.onSaveModal();

    expect(page.saveFeature).toHaveBeenCalled();
    expect(page.closeFeatureModal).toHaveBeenCalledWith(true);
  });

  it('leaves the form open when the fields are invalid', async () => {
    const page = barePage() as any;
    page.saving = false;
    page.errorImg = [];
    page.imageAttr = '';
    page.featureAttrForm = { markAllAsTouched() {}, valid: false };
    page.languageService = { translateTag: () => of('invalid') };
    page.mapService = { createToast() {} };
    page.saveFeature = jest.fn();
    page.closeFeatureModal = jest.fn();

    await page.onSaveModal();

    expect(page.saveFeature).not.toHaveBeenCalled();
    expect(page.closeFeatureModal).not.toHaveBeenCalled();
  });

  it('leaves the form open when the new point has no position', async () => {
    const page = barePage() as any;
    page.saving = false;
    page.errorImg = [];
    page.imageAttr = '';
    page.newPoint = true;
    page.featureAttrForm = { markAllAsTouched() {}, valid: true };
    page.languageService = { translateTag: () => of('saved') };
    page.mapService = { createToast() {} };
    page.loadingCtrl = {
      create: async () => ({ present: async () => {}, dismiss: async () => {} }),
    };
    page.saveFeature = jest.fn(async () => false);
    page.closeFeatureModal = jest.fn();

    await page.onSaveModal();

    expect(page.closeFeatureModal).not.toHaveBeenCalled();
  });

  it('does not create a point when location fails', async () => {
    const page = barePage() as any;
    page.newPoint = true;
    page.newGeometry = null;
    page.featureAttrForm = { value: {} };
    page.mapService = { getLocation: async () => null };

    expect(await page.saveFeature()).toBe(false);
    expect(page.newPoint).toBe(true);
  });

  it('uses the place the user chose instead of asking for a location', async () => {
    const page = barePage() as any;
    const feature = { setId() {}, setAttribute() {} };
    page.newPoint = true;
    page.newGeometry = { type: 'Point', coordinates: [10, 20] };
    page.featureAttrForm = { value: {} };
    page.mapService = {
      getLocation: jest.fn(),
      transformCoords: (coords: number[]) => coords,
      createFeaturesGeojson: () => [feature],
    };
    page.mapa = { getProjection: () => ({ code: 'EPSG:3857' }) };
    page.layerEdit = { addFeatures() {}, idLayer: 'layer/1' };
    page.centerMapByFeature = () => {};
    page.addFeatureEdition = () => {};

    expect(await page.saveFeature()).toBe(true);
    expect(page.mapService.getLocation).not.toHaveBeenCalled();
    expect(page.newPoint).toBe(false);
  });

  it('lets a new point be placed from the map', () => {
    const page = barePage() as any;
    page.saving = false;
    page.newPoint = true;
    page.feature = null;
    page.mapa = {
      getCenter: () => ({ x: 3, y: 4 }),
      getFeatureHandler: () => ({ clearSelectedFeatures() {} }),
    };
    page.openFeatureModal = jest.fn();
    page.languageService = { translateTag: () => of('wait') };

    page.editGeometry();
    expect(page.geomEdition).toBe(true);
    expect(page.isFeatureModalOpen).toBe(false);

    page.saveGeom();
    expect(page.newGeometry).toEqual({ type: 'Point', coordinates: [3, 4] });
    expect(page.openFeatureModal).toHaveBeenCalledWith(true);
  });
});
