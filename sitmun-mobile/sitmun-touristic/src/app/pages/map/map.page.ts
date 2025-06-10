import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LanguageService } from 'src/app/services/language.service';
import { MapaService } from 'src/app/services/mapa.service';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { RoutingService } from 'src/app/services/routing.service';

declare var M: any;
declare var ol: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage implements OnInit {

  selectedLanguage: string | null = null;
  selectedFlag: string | null = null;
  languageOptions: any[] = [];
  features: any[] = [];
  activeLayer = '*';
  _mapa: any;
  layer: any;
  
  constructor(private router: Router, private route: ActivatedRoute,
    private languageService: LanguageService, private _location: Location,
    private mapaService: MapaService, private authorizationService: AuthorizationService,
    private routingService: RoutingService) {
      this.route.queryParams.subscribe(params => {
      let navigation = this.router.getCurrentNavigation();
      if (navigation) {
        let tempState = navigation.extras.state;
        if (tempState) {
          if (tempState['features']) {
            this.features = tempState['features'];
          }
          if (tempState['activeLayer']) {
            this.activeLayer = tempState['activeLayer'];
          } else {
            this.activeLayer = '*';
          }
        }
      }
    });
  }

  ngOnInit() {
    this.createMap();
  }

  async createMap() {
    this._mapa = await this.mapaService.initMap('map', this.features.length > 0, this.activeLayer);
    const mapProj = this._mapa.getProjection().code;
    const mFeatures: any[] = [];
    this.features.forEach(f => mFeatures.push(this.mapaService.createFeature(f, mapProj)));
    if (this.features && this.features.length > 0) {
      if (!this.layer) {
        this.layer = new M.layer.Vector({name: 'pois'}, {displayInLayerSwitcher: false});
        //this.layer.setVisible(false);  
        this._mapa.addLayers(this.layer);
      } else {
        this.layer.removeFeatures(this.layer.getFeatures());
      }
      
      console.log('aplicando estilo a los puntos de la capa');
      let i = 0;
      mFeatures.forEach(mf => {
        let pointStyle = new M.style.Generic({
          point: {
            icon: {
              src: '../../assets/icon/location-point.png',
              scale: 0.1,
              anchor: [0.5, 1], 
              anchorxunits: 'fraction',
              anchoryunits: 'fraction',
            },
            label: {
              text: this.features[i].name,
              font: 'normal 10px Helvetica, Arial, sans-serif',
            }
          },
          line: {
            fill: {
              color: 'rgb(255, 115, 0)',
              opacity: 1
            },
            stroke: {
              color: 'rgb(255, 115, 0)',
              width: 1.5
            }
          },
          polygon: {
            fill: {
              color: 'rgb(255, 115, 0)',
              opacity: 0.5
            },
            stroke: {
              color: 'rgb(255, 115, 0)',
              width: 1.5
            }
          }
        });
        mf.setStyle(pointStyle);
        i++;
      });

      this.layer.addFeatures(mFeatures);
      const extent = this.layer.getMaxExtent();
      if (extent) {
        this._mapa.setBbox(extent);
        if (this.features.length === 1 && mFeatures[0].getGeometry().type === 'Point') {          
          this._mapa.setZoom(17);
        }
      }
    }
  }

  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.selectedFlag = this.languageService.getFlag();
    this.languageOptions = this.languageService.getLanguageOptions();
  }

  async startPage() {
    const data = await this.authorizationService.getPagesNodesBD();
    this.routingService.redirect(data);
  }

  async nextPage(idNode: string) {
    if(idNode) {
      const data = await this.authorizationService.getPagesNodesBD(idNode);
      this.routingService.redirect(data);
    }
  }

  backPage() {
    this._location.back();
  }

  setLanguage(langCode: string) {
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
    this.updateFlag(langCode);
  }

  updateFlag(langCode: string) {
    this.selectedFlag = this.languageService.updateFlag(langCode);
  }
}
