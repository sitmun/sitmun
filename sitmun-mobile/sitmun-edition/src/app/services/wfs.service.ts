import { Injectable } from '@angular/core';
import { Http } from '@capacitor-community/http';
import { create } from 'xmlbuilder2';
import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';

@Injectable({
  providedIn: 'root'
})
export class WfsService {

  constructor() { }

  getFeatures(url: string, layerName: string, extent: string, mapProj: string) {
    const options: any = {
      url,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      params: {
        service: 'WFS',
        version: '1.0.0',
        request: 'GetFeature',
        typename: layerName,
        outputFormat: 'application/json'
      }
    };
    if (extent) {
      options.params['maxExtent'] = extent;
    }
    if (mapProj !== '') {
      options.params['srsName'] = mapProj;
    }
    return this.request(options);
  }

  saveFeatures(url: string, layerName: string, featuresEdition: any, mapProj: string) {
    const data = this.createWFSTrasaction(featuresEdition, layerName, `${url}?request=DescribeFeatureType`, mapProj);
    const options = {
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml'
      },
      params: {
      },
      data
    };
    console.log(data);
    //this.request(options);
  }

  private request(options: any) {
    return new Promise<any>((resolve, reject) => {
      Http.request(options).then(resp => {
        resolve(resp);
      }).catch(error => {
        reject(error);
      });
    });
  }

  createWFSTrasaction(featuresEdition: any, typeName: string, featureNS: string, mapProj: string) {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('wfs:Transaction', {
      'xmlns:wfs': 'http://www.opengis.net/wfs',
      'xmlns:gml': 'http://www.opengis.net/gml',
      'xmlns:ogc': 'http://www.opengis.net/ogc',
      'xmlns:feature': featureNS,
      'service': 'WFS',
      'version': '1.1.0',
    });
    const layerName = typeName.includes(':') ? typeName.split(':')[1] : typeName;
    this.createWFSInsert(doc, layerName, featuresEdition['inserts'], mapProj);
    this.createWFSUpdate(doc, layerName, featuresEdition['updates'], mapProj);
    this.createWFSDelete(doc, layerName, featuresEdition['deletes']);
    return doc.end({prettyPrint: true});
  }

  createWFSInsert(doc: XMLBuilder, typeName: string, inserts: any[], proj: string) {
    inserts.forEach((feature) => {
      const insert = doc.ele('wfs:Insert').ele(`feature:${typeName}`);
      for (const [key, value] of Object.entries(feature.getAttributes())) {
        if (key !== 'vendor.mapea.click') {
          insert.ele(`feature:${key}`).txt(String(value));
        }
      }
      if (feature.getGeometry().type === 'Point') {
        const coordinates = feature.getGeometry().coordinates;
        insert
          .ele(`feature:geom`)
          .ele('gml:Point', { srsName: proj })
          .ele('gml:coordinates')
          .txt(`${coordinates[0]},${coordinates[1]}`);
      }
    });
  }

  createWFSUpdate(doc: XMLBuilder, typeName: string, updates: any[], proj: string) {
    updates.forEach((feature) => {
      const update = doc.ele('wfs:Update', { typeName: `feature:${typeName}` });

      // Propiedades normales
      for (const [key, value] of Object.entries(feature.getAttributes())) {
        if (key !== 'vendor.mapea.click') {
          const prop = update.ele('wfs:Property');
          prop.ele('wfs:Name').txt(key);
          prop.ele('wfs:Value').txt(String(value));
        }
      }

      // Geometría (si existe)
      if (feature.getGeometry().type === 'Point') {
        const geomProp = update.ele('wfs:Property');
        geomProp.ele('wfs:Name').txt('geom');
        const value = geomProp.ele('wfs:Value');
        const coordinates = feature.getGeometry().coordinates;
        value
          .ele('gml:Point', { srsName: proj })
          .ele('gml:coordinates')
          .txt(`${coordinates[0]},${coordinates[1]}`);
      }

      // Filtro de ID
      update
        .ele('ogc:Filter')
        .ele('ogc:FeatureId', { fid: feature.getId() });
    });
  }

  createWFSDelete(doc: XMLBuilder, typeName: string, deletes: any[]) {
    deletes.forEach((feature) => {
      const del = doc.ele('wfs:Delete', { typeName: `feature:${typeName}` });
      del
        .ele('ogc:Filter')
        .ele('ogc:FeatureId', { fid: feature.getId() });
    });
  }
}
