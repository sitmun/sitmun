import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Location } from '@angular/common';
import { LanguageService } from 'src/app/services/language.service';
import { MapService } from 'src/app/services/map.service';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { TreeNode, TreeviewService } from 'src/app/services/treeview.service';
import { NetworkService } from 'src/app/services/network.service';
import { WfsService } from 'src/app/services/wfs.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

declare var M: any;
declare var ol: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage implements OnInit {

  selectedLanguage: string | null = null;
  languageOptions: any[] = [];
  networkConnected = true;
  mapa: any;
  app: any = {};
  ter: any = {};
  isFeatureModalOpen = false;
  isTocModalOpen = false;
  layerEdit: any = null;
  attrData: any[] = [];
  featureAttr: Record<string, any> = {};
  featureAttrForm: FormGroup;
  feature: any = null;
  newPoint = false;
  treeData: TreeNode[] = [];
  featureEditions: Record<string, any[]> = {
    inserts: [],
    deletes: [],
    updates: []
  };
  imageValue: string | null = null;
  errorImg: string[] = [];
  imageAttr: string = '';
  downloadMap: boolean = false;
  zoom: number = 9;
  downloadLayers: any[] = [];
  extent: number[] = [];
  mapProjSelected: string = '';
  currentEditionTask: any = null;

  constructor(private mapService: MapService, private languageService: LanguageService, private _location: Location,
    private router: Router, private route: ActivatedRoute, private authorizationService: AuthorizationService,
    private treeviewService: TreeviewService, private networkService: NetworkService, private cdr: ChangeDetectorRef,
    private wfsService: WfsService, private formBuilder: FormBuilder
  ) {
    this.route.queryParams.subscribe(params => {
        const navigation = this.router.getCurrentNavigation();
        if (navigation) {
          const tempState = navigation.extras.state;
          if (tempState && tempState['app']) {
            this.app = tempState['app'];
          }
          if (tempState && tempState['ter']) {
            this.ter = tempState['ter'];
          }
          if (tempState && tempState['zoom']) {
            this.zoom = tempState['zoom'];
          }
          if (tempState && tempState['download']) {
            this.downloadMap = tempState['download'];
          }
          if (tempState && tempState['layers']) {
            this.downloadLayers = tempState['layers'];
          }
          if (tempState && tempState['extent']) {
            Object.values(tempState['extent']).forEach(value => {
              if (value !== '' && !isNaN(Number(value))) {
                this.extent.push(Number(value));
              }
            });
          }
          if (tempState && tempState['mapProject']) {
            this.mapProjSelected = tempState['mapProject'];
          }
        }
    });
    this.featureAttrForm = this.formBuilder.group({});
  }

  ngOnInit() {
    this.authorizationService.getProfile(this.app.id, this.ter.id).then(profile => {
      // Si hay capas para descargar, filtramos el árbol
      if (this.downloadMap) {
        profile.trees = this.filterProfileTrees(profile.trees, this.downloadLayers); 
      }
      this.createMap(profile);
      this.treeData = this.treeviewService.createTreeData(profile, true);
    });    
  }
  
  private filterProfileTrees(trees: any[], layers: any[]): any[] {
    return trees.filter(tree => {
      const nodes = tree.nodes;
      const validNodes = new Set<string>();

      //nodos seleccionados
      Object.entries(nodes).forEach(([id, node]: [string, any]) => {
        if ((node.resource || node.action) && layers.find(l => l.resource === node.resource || l.action === node.action)) {
          validNodes.add(id);
        }
      });

      // incluir padres de nodos seleccionados
      let add = true;
      while (add) {
        add = false;
        Object.entries(nodes).forEach(([id, node]: [string, any]) => {
          if (!validNodes.has(id) && node.children?.some((childId: string) => validNodes.has(childId))) {
            validNodes.add(id);
            add = true;
          }
        });
      }

      // Limpiar los children de los nodos, dejando solo los válidos
      validNodes.forEach((id) => {
        const node = nodes[id];
        if (node?.children) {
          node.children = node.children.filter((childId: string) => validNodes.has(childId));
        }
      });


      // eliminar nodos no válidos
      for (const id in nodes) {
        if (!validNodes.has(id)) {
          delete nodes[id];
        } 
      }

      // quedarse solo con los arboles con algún nodo filtrado
      return Object.keys(nodes).length > 0;
    });
  }

  async createMap(profile: any) {
    this.mapa = await this.mapService.initMap('map', profile, this.zoom, this.extent, this.mapProjSelected);
    this.mapService.addClickFunctionToEditableLayers(this.featureClickHandler.bind(this));
  }

  ionViewWillEnter() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.languageOptions = this.languageService.getLanguageOptions();
    this.networkService.addListener(this.updateNetworkStatus.bind(this));
  }

  backPage() {
    this._location.back();
  }

  setLanguage(langCode: string) {
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
  }

  updateNetworkStatus(connected: boolean) {
    this.networkConnected = connected;
  }

  openFeatureModal(newPoint: boolean) {
    this.centerMapByFeature(this.feature);
    this.newPoint = newPoint;
    this.isFeatureModalOpen = true;
    this.mapService.removeMoveInteraction(this.mapa);
    //inicializa campo imagen si algún campo ha sido definido anteriormente como imagen  
    if (this.imageAttr) {
      this.imageValue = this.featureAttrForm.value[this.imageAttr];
    } 
  }

  closeFeatureModal() {
    this.isFeatureModalOpen = false;
  }

  openTocModal() {
    this.isTocModalOpen = true;
  }

  closeTocModal() {
    this.isTocModalOpen = false;
  }

  createNewFeature() {
    if (this.layerEdit) {
      this.feature = null;
      this.imageAttr = '';
      this.imageValue = null;
      const baseFeat = this.layerEdit.getFeatures()[0];
      //this.attrKeys = Object.keys(baseFeat.getAttributes()).filter(k => k !== 'vendor.mapea.click');
      this.featureAttr = {};
      this.setAttrData();
      /*const formControls: any = {};
      this.attrData.forEach(ad => {
        let value;
        switch (ad.type) {
          case 'text':
          case 'listbox':
          case 'date':
          case 'image':
            value = ad.defaultValue || '';
            break;
          case 'number':
            value = ad.defaultValue || 0;
            break;
        }
        if (ad.required) {
          formControls[ad.key] = [value, Validators.required];
        } else {
          formControls[ad.key] = [value, Validators.required];
        }
      });
      this.featureAttrForm = this.formBuilder.group(formControls);*/
      this.openFeatureModal(true);
    } else {
      this.languageService.translateTag('map.noEditLayerSelected').subscribe(text => this.mapService.createToast(text, 'warning', 'top'));
    }
  }

  featureClickHandler(evt: any, feature: any) {
    this.feature = feature;
    this.imageAttr = '';
    this.imageValue = null;
    this.featureAttr = this.feature.getAttributes();
    //this.attrKeys = Object.keys(this.featureAttr).filter(k => k !== 'vendor.mapea.click');
    this.setAttrData();
    this.openFeatureModal(false);
    this.cdr.detectChanges();
  }

  setAttrData() {
    const fieldsKeys = Object.keys(this.currentEditionTask.fields);
    const formControls: any = {};
    this.attrData = fieldsKeys.filter((f: any) => this.currentEditionTask.fields[f].editable).map((fk: any) => {
      const field = this.currentEditionTask.fields[fk];
      const data: Record<string, any> = {
        key: fk,
        label: field.label,
        type: field.type,
        defaultValue: this.featureAttr[fk] || field.value,
        required: field.required
      };
      if (field.listValues) {
        data['listValues'] = field.listValues;
      }
      if (field.type === 'image') {
        this.imageAttr = fk;
      }
      this.addFeatureFormControl(data, formControls);
      return data;
    });
    this.featureAttrForm = this.formBuilder.group(formControls);
  }

  addFeatureFormControl(attrData: any, formControls: any) {
    let value;
    switch (attrData.type) {
      case 'text':
      case 'listbox':
      case 'date':
      case 'image':
        value = attrData.defaultValue || '';
        break;
      case 'number':
        value = attrData.defaultValue || 0;
        break;
    }
    if (attrData.required) {
      formControls[attrData.key] = [value, Validators.required];
    } else {
      formControls[attrData.key] = [value, null];
    }
  }

  onFeatureDateChange(key: string, event: any) {
    const values: any = {};
    values[key] = event.detail.value;
    this.featureAttrForm?.patchValue(values);
  }

  async onSaveModal() {
    //guardar imagen
    if (this.errorImg.length === 0 && this.imageAttr !== '')  {
      const values: any = {};
      values[this.imageAttr] = this.imageValue;
      this.featureAttrForm?.patchValue(values);
    }
    this.featureAttrForm.markAllAsTouched();
    if (this.featureAttrForm.valid) {
      this.featureAttr = this.featureAttrForm.value;
      if (this.newPoint) {
        const position: any = await this.mapService.getLocation();
        if (position) {
          const coordinates = [position.x, position.y];
          const id = `new${Date.now()}`;
          const geojson = {
            type: 'Feature',
            id,
            geometry: {
              type: 'Point',
              coordinates
            },
            properties: this.featureAttr
          };
          const mapProj = this.mapa.getProjection();
          this.feature = this.mapService.createFeaturesGeojson(geojson, 'EPSG:4326', mapProj)[0];
          this.feature.setId(id);
          this.feature.setAttribute('vendor.mapea.click', this.featureClickHandler.bind(this));
          this.layerEdit.addFeatures([this.feature]);
          this.centerMapByFeature(this.feature);
          this.addFeatureEdition('inserts');
        }
      } else {
        this.feature.setAttributes(this.featureAttr);
        this.addFeatureEdition('updates');
      }
      this.newPoint = false;
    } else {
      this.languageService.translateTag('map.invalidFeatureForm').subscribe(text => this.mapService.createToast(text, 'danger', 'top'));
    }
  }

  centerMapByFeature(feature: any) {
    if(feature) {
      const center = feature.getGeometry().coordinates;
      this.mapa.setCenter(center);
      this.mapa.setZoom(17);
    }
  }

  onDeleteModal() {
    this.layerEdit.removeFeatures([this.feature]);
    this.addFeatureEdition('deletes');
    this.closeFeatureModal();
  }

  addFeatureEdition(operation: string) {
    this.featureEditions[operation].push(this.feature);
    console.log(`Edición de feature añadido a ${operation}`);
  }

  toggleExpand(node: TreeNode) {
    this.treeviewService.toggleExpand(node);
  }

  toggleVisible(node: TreeNode) {
    node.visible = !node.visible;
    this.treeviewService.toggleVisible(node);
    let layer = null;
    if (node.resource || node.action) { //layer
      layer = this.mapa.getImpl().getAllLayerInGroup().find((l:any) => [node.resource, node.action].includes(l.idLayer));
    } else { //layerGroup
      layer = this.mapa.getLayerGroup().find((lg:any) => lg.legend === node.name)
    }
    layer.setVisible(node.visible);
  }
  
  toggleCheck(node: TreeNode) {
    this.layerEdit = null;
    const checked = node.checked;
    if (checked) {
      this.treeData.forEach(tn => this.treeviewService.toggleCheck(tn));
      node.checked = checked;
      this.currentEditionTask = node.task;
    }
    this.layerEdit = this.mapa.getImpl().getAllLayerInGroup().find((l:any) => l.idLayer === node.action);
    this.layerEdit.extract = checked;
  }

  editGeometry() {
    if (this.newPoint) {
      this.languageService.translateTag('map.editGeometryError').subscribe(text => this.mapService.createToast(text, 'warning', 'top'));
    } else {
      const olFeature = this.feature.getImpl().getOLFeature();
      this.mapService.addMoveInteraction(this.mapa, [olFeature], this.onMoveEnd.bind(this));
      this.closeFeatureModal();
    }
  }

  onMoveEnd() {
    this.layerEdit.redraw();
  }

  saveFeatures() {
    this.wfsService.saveFeatures(this.layerEdit.url, this.layerEdit.name, this.featureEditions, this.mapa.getProjection().code);
  }

  saveMap() {
    const navigationExtras: NavigationExtras = {
      state: {
        app: this.app,
        ter: this.ter,
        zoom: this.mapa.getZoom(),
        bbox: this.mapa.getBbox(),
        map: true
      }
    };
    this.navigate('download', navigationExtras);
  }

  navigate(path: string, navigationExtras: NavigationExtras) {
    this.router.navigate([path], navigationExtras);
  }

  async selectImg() {
    this.errorImg = [];
    const permission = await this.requestCameraPermission();
    if (permission){
      this.imageValue = await this.takePhoto();
    }
  }

  removeImg(){
    this.imageValue = null;
  }

  private async requestCameraPermission() {
    try {
      const permissionStatus = await Camera.requestPermissions();
      console.log('Camera permission status:', permissionStatus);
      
      if (permissionStatus.camera === 'granted') {
        return true;
      } else {
        // Permiso denegado o restringido
        console.log('Permiso de cámara no concedido');
        this.errorImg.push('imagePermissionError');
        return false;
      }
    } catch (error) {
      console.error('Error solicitando permisos de cámara', error);
      this.errorImg.push('imagePermissionError');
      return false;
    }
  }

  private async takePhoto(): Promise<string | null> {
    interface Prompt{
      header: string;
      gallery: string;
      picture: string;
    }

    const prompt: Prompt = {
      header: '',
      gallery: '',
      picture: ''
    };
    
    switch (this.selectedLanguage) {
      case 'ca':
        prompt.header = 'Seleccionar imatge';
        prompt.gallery = 'Galeria';
        prompt.picture = 'Fer foto';
        break;
      case 'es':
        prompt.header = 'Seleccionar imagen';
        prompt.gallery = 'Galería';
        prompt.picture = 'Hacer foto';
        break;
      case 'fr':
        prompt.header = 'Sélectionner une image';
        prompt.gallery = 'Galerie';
        prompt.picture = 'Prendre une photo';
        break;
      default:
        prompt.header = 'Select image';
        prompt.gallery = 'Gallery';
        prompt.picture = 'Take picture';
        break;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 80, 
        allowEditing: false,
        saveToGallery: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt, 
        promptLabelHeader: prompt.header,
        promptLabelPhoto: prompt.gallery,
        promptLabelPicture: prompt.picture,
        width: 200, // Controla el tamaño en bytes de la imagen
      });

      console.log('Imagen:', image);

      const acceptedFormats = ['jpeg', 'png', 'heif', 'heic'];

      // Verifica si el formato de la imagen es aceptado
      if (!acceptedFormats.includes(image.format)) {
        this.errorImg.push('imageFormatError');
        return null;
      }

      // Devuelve base64 con prefijo data URL
      return `data:image/${image.format};base64,${image.base64String}`;
    } catch (error) {
      console.error('Error al tomar la foto', error);
      return null;
    }
  }

}
