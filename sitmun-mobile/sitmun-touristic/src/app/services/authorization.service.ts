import { Injectable } from '@angular/core';
import { Http } from '@capacitor-community/http';
import { InstancesService } from './instances.service';
import { LanguageService } from './language.service';
import { DatabaseService } from './database.service';
import { constants } from 'src/environments/constants';

export interface Node {
  uri: String;
  title: String;
  description: String;
  resource: String;
  action: String;
  isRadio: Boolean;
  loadData: Boolean;
  type: string;
  viewMode: String;
  image: String;
  order: number;
  children: string[];
  id?: string;
}

export interface Tree {
  id: string;
  title: String;
  image: String;
  type: string;
  rootNode: string;
  nodes: Record<string, Node>;
}

export interface Profile {
  application?: any;
  backgrounds?: any[];
  layers?: any[];
  services?: any[];
  tasks?: any[];
  trees?: Tree[];
  global?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {

  private lastUrl: string = '';
  private addProfile = false;
  private filter: Function = (obj: any) => { return true;};

  constructor(private instancesService: InstancesService, private languageService: LanguageService,
    private databaseService: DatabaseService
  ) { }

  async getTouristicApp() {
    const url = `${this.instancesService.authorizationUrl}/api/config/client/application`;
    const options = {
      url,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      params: {}
    };
    this.filter = (a: any) => {return a.type === constants.codeValue.applicationType.touristicApp;};
    return this.request(options, this.filterCallback.bind(this));
  }

  async getTerritoryByApp(idApp: Number) {
    const url = `${this.instancesService.authorizationUrl}/api/config/client/application/${idApp}/territories`;
    const options = {
      url,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      params: {}
    };
    return this.request(options, this.basicCallback);
  }

  async getProfile() {
    const url = this.instancesService.authorizationUrl.concat(this.instancesService.initPageUrl);
    const options = {
      url,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      params: {}
    };
    return this.request(options, this.basicCallback.bind(this));
  }

  async getPageNodes(serviceUrl: string = this.instancesService.initPageUrl, addProfile: boolean = false) {
    const url = serviceUrl.startsWith('http') ? serviceUrl : this.instancesService.authorizationUrl.concat(serviceUrl);
    this.addProfile = addProfile;
    return this.requestPages(url);
  }

  async getPagesNodesBD(idParentNode: string = 'root') {
    const trees = JSON.parse((await this.databaseService.getProfileData('trees'))[0].json);
    const tasks = JSON.parse((await this.databaseService.getProfileData('tasks'))[0].json);
    const profile: Profile = {trees, tasks};
    return this.getPagesByProfile(profile, idParentNode);
  }

  getPagesByProfile(profile: Profile, idParentNode: string = 'root') {
    const touristicTree = profile.trees?.find((t: Tree) => t.type === constants.codeValue.treeType.touristicTree);
    if (touristicTree) {
      if (idParentNode !== 'root') {
        touristicTree.rootNode = idParentNode;
      }
    }
    return this.transformData(profile);
  }

  async getLastPageNodes() {
    return this.requestPages(this.lastUrl);
  }

  requestPages(url: string) {
    this.lastUrl = url;
    const lang = `&lang=${this.languageService.getLanguage()}`;
    console.log(url.concat(lang));
    const options = {
      url: url.concat(lang),
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      params: {}
    };
    return this.request(options, this.pagesCallback.bind(this));
  }

  private request(options: any, callback: Function) {
    return new Promise<any>((resolve, reject) => {
      Http.request(options).then((resp) => {
        resolve(callback(resp));
      }).catch(error => {
        reject(error);
      });
    });
  }

  private basicCallback(resp: any) {
    return resp.data;
  }

  private filterCallback(resp: any) {
    return resp.data.content.filter((obj: any) => this.filter(obj));
  }

  private pagesCallback(resp: any) {
    const profile: Profile = resp.data;
    return this.transformData(profile);
  }

  private profileCallback(resp: any) {
    const profile: Profile = resp.data;
    this.databaseService.addProfile(profile);
    return profile;
  }

  private transformData(profile: Profile) {
    let params = {};
    if (profile.trees && profile.trees.length > 0) {
      const touristicTree = profile.trees.find(t => t.type === constants.codeValue.treeType.touristicTree);
      if (touristicTree) {
        const rootNode: Node = touristicTree.nodes[touristicTree.rootNode];
        rootNode.id = touristicTree.rootNode;
        if (rootNode.type === constants.codeValue.treenodeLeafType.task && profile.tasks) {
          const taskNodes: Node[] = [];
          if (rootNode['children']) {
            rootNode['children'].forEach((n) => {
              const taskNodeId = String(n);
              const taskNode = touristicTree.nodes[String(n)];
              taskNode.id = taskNodeId;
              taskNodes.push(taskNode);
            });
          } else {
            taskNodes.push(rootNode);
          }
          params = this.transformTask(profile.tasks, rootNode, taskNodes);
        } else {
          const nodeIds = touristicTree.nodes[touristicTree.rootNode]['children'];
          let nodes: Node[] = [];
          if (nodeIds) {
            nodeIds.forEach(k => {
              const n = touristicTree.nodes[k];
              n.id = k;
              nodes.push(n);
            });
            nodes.sort((a, b) => {return a.order - b.order});
          }
          params = {
            rootNode,
            nodes,
          };
        }
      }
    }
    return params;
  }

  transformTask(tasks: any[], rootNode: Node, taskNodes: Node[]) {
    let params = {};
    if (tasks && tasks.length > 0) {
      const actions = taskNodes.map(tn => tn.action);     
      const filterTask = tasks.filter(t => actions.includes(t.id));
      params = {
        rootNode,
        taskNodes,
        tasks: filterTask
      }
    }
    return params;
  }
}
