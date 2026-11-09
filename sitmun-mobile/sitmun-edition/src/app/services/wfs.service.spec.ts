import { CapacitorHttp } from '@capacitor/core';
import { TestBed } from '@angular/core/testing';
import { create } from 'xmlbuilder2';
import { InstancesService } from './instances.service';
import { LoginService } from './login.service';
import { WfsService } from './wfs.service';

jest.mock('@capacitor/core', () => {
  const actual = jest.requireActual('@capacitor/core');
  return {
    ...actual,
    CapacitorHttp: {
      request: jest.fn()
    }
  };
});

describe('WfsService', () => {
  let service: WfsService;
  let instances: {
    getInstanceUrl: jest.Mock;
    getMiddlewareBaseUrl: jest.Mock;
  };
  let login: {
    ensureProxyToken: jest.Mock;
    reissueProxyToken: jest.Mock;
    withProxyRetry: jest.Mock;
    getAccessToken: jest.Mock;
    getProxyToken: jest.Mock;
  };

  beforeEach(() => {
    instances = {
      getInstanceUrl: jest.fn().mockResolvedValue('https://gw.example.com/backend'),
      getMiddlewareBaseUrl: jest.fn().mockResolvedValue('https://gw.example.com/middleware')
    };
    login = {
      ensureProxyToken: jest.fn().mockResolvedValue('proxy-jwt'),
      reissueProxyToken: jest.fn().mockResolvedValue('proxy-jwt'),
      withProxyRetry: jest.fn(),
      getAccessToken: jest.fn().mockReturnValue('access-jwt'),
      getProxyToken: jest.fn().mockReturnValue('proxy-jwt')
    };
    login.withProxyRetry.mockImplementation(async (send: () => Promise<any>) => {
      await login.ensureProxyToken();
      let resp = await send();
      if (resp.status === 401) {
        await login.reissueProxyToken();
        resp = await send();
      }
      return resp;
    });

    (CapacitorHttp.request as jest.Mock).mockResolvedValue({
      data: { type: 'FeatureCollection', features: [] },
      status: 200,
      headers: {},
      url: 'https://gw.example.com/middleware/proxy/20/4/WFS/177'
    });

    TestBed.configureTestingModule({
      providers: [
        WfsService,
        { provide: InstancesService, useValue: instances },
        { provide: LoginService, useValue: login }
      ]
    });
    service = TestBed.inject(WfsService);
  });

  afterEach(() => {
    (CapacitorHttp.request as jest.Mock).mockReset();
  });

  it('sends GetFeature to middleware with the proxy Bearer token', async () => {
    await service.getFeatures(
      'https://gw.example.com/middleware/proxy/20/4/WFS/177',
      'ns:layer',
      '1,2,3,4',
      'EPSG:3857'
    );
    expect(login.ensureProxyToken).toHaveBeenCalled();
    expect(CapacitorHttp.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://gw.example.com/middleware/proxy/20/4/WFS/177',
        headers: expect.objectContaining({ Authorization: 'Bearer proxy-jwt' }),
        params: expect.objectContaining({
          request: 'GetFeature',
          typename: 'ns:layer',
          srsName: 'EPSG:3857'
        })
      })
    );
  });

  it('reissues proxy token once on 401 and retries the request', async () => {
    (CapacitorHttp.request as jest.Mock)
      .mockResolvedValueOnce({
        data: {},
        status: 401,
        headers: {},
        url: 'https://gw.example.com/middleware/proxy/20/4/WFS/177'
      })
      .mockResolvedValueOnce({
        data: { type: 'FeatureCollection', features: [] },
        status: 200,
        headers: {},
        url: 'https://gw.example.com/middleware/proxy/20/4/WFS/177'
      });
    login.reissueProxyToken.mockImplementation(async () => {
      login.getProxyToken.mockReturnValue('proxy-jwt-new');
      return 'proxy-jwt-new';
    });

    await service.getFeatures(
      'https://gw.example.com/middleware/proxy/20/4/WFS/177',
      'ns:layer',
      '',
      ''
    );

    expect(login.reissueProxyToken).toHaveBeenCalledTimes(1);
    expect(CapacitorHttp.request).toHaveBeenCalledTimes(2);
    expect(CapacitorHttp.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer proxy-jwt-new' })
      })
    );
  });

  describe('createWFSInsert / createWFSUpdate empty values', () => {
    const layerSplit = ['proves_edicio', 'punts_prova'];
    const proj = 'EPSG:3857';
    const geomColumnName = 'geom';

    function mockFeature(attributes: Record<string, unknown>, id = 'fid.1') {
      return {
        getAttributes: () => attributes,
        getGeometry: () => ({ type: 'Point', coordinates: [1, 2] }),
        getId: () => id
      };
    }

    function transactionDoc() {
      return create({ version: '1.0', encoding: 'UTF-8' }).ele('wfs:Transaction', {
        'xmlns:wfs': 'http://www.opengis.net/wfs',
        'xmlns:gml': 'http://www.opengis.net/gml',
        'xmlns:ogc': 'http://www.opengis.net/ogc',
        'xmlns:proves_edicio': 'http://example.com/ns',
        service: 'WFS',
        version: '1.1.0'
      });
    }

    it('createWFSInsert leaves out null, undefined and empty string attributes', () => {
      const doc = transactionDoc();
      service.createWFSInsert(doc, layerSplit, [
        mockFeature({
          nom: 'C5 cat',
          tipus: 'ALTRES',
          data_visita: '',
          foto: null,
          observacions: undefined,
          num_visitants: 0,
          valoracio: null,
          'vendor.mapea.click': () => undefined
        })
      ], proj, geomColumnName);

      const xml = doc.end({ prettyPrint: true, headless: true });
      expect(xml).toContain('<proves_edicio:nom>C5 cat</proves_edicio:nom>');
      expect(xml).toContain('<proves_edicio:tipus>ALTRES</proves_edicio:tipus>');
      expect(xml).toContain('<proves_edicio:num_visitants>0</proves_edicio:num_visitants>');
      expect(xml).not.toContain('data_visita');
      expect(xml).not.toContain('foto');
      expect(xml).not.toContain('observacions');
      expect(xml).not.toContain('valoracio');
      expect(xml).not.toContain('vendor.mapea.click');
    });

    it('createWFSUpdate writes a Property with no Value for empty attributes', () => {
      const doc = transactionDoc();
      service.createWFSUpdate(doc, layerSplit, [
        mockFeature({
          tipus: 'TALAIOT',
          data_visita: '',
          foto: null,
          observacions: undefined,
          num_visitants: 0,
          valoracio: null
        })
      ], proj, geomColumnName);

      const xml = doc.end({ prettyPrint: true, headless: true });
      expect(xml).toMatch(
        /<wfs:Property>\s*<wfs:Name>tipus<\/wfs:Name>\s*<wfs:Value>TALAIOT<\/wfs:Value>\s*<\/wfs:Property>/
      );
      expect(xml).toMatch(
        /<wfs:Property>\s*<wfs:Name>num_visitants<\/wfs:Name>\s*<wfs:Value>0<\/wfs:Value>\s*<\/wfs:Property>/
      );
      expect(xml).toMatch(
        /<wfs:Property>\s*<wfs:Name>data_visita<\/wfs:Name>\s*<\/wfs:Property>/
      );
      expect(xml).toMatch(
        /<wfs:Property>\s*<wfs:Name>foto<\/wfs:Name>\s*<\/wfs:Property>/
      );
      expect(xml).toMatch(
        /<wfs:Property>\s*<wfs:Name>observacions<\/wfs:Name>\s*<\/wfs:Property>/
      );
      expect(xml).toMatch(
        /<wfs:Property>\s*<wfs:Name>valoracio<\/wfs:Name>\s*<\/wfs:Property>/
      );
      expect(xml).not.toContain('<wfs:Value>null</wfs:Value>');
      expect(xml).not.toContain('<wfs:Value>undefined</wfs:Value>');
    });
  });
});
