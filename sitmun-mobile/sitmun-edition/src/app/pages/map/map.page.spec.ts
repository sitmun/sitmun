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
    const deleteButton = html.split('\n').find((line) => line.includes('del-feat-btn'));
    expect(deleteButton).toContain('*ngIf="!newPoint"');
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
    page.saveFeature = jest.fn(async () => {});
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
});
