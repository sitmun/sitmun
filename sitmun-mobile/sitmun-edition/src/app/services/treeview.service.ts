import { Injectable } from '@angular/core';

export interface TreeNode {
  name: string;
  children?: TreeNode[];
  expanded?: boolean;
  checked?: boolean;
  visible?: boolean;
  resource?: string;
  action?: string;
  task?: any;
  image?: null | string;
  transparency?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TreeviewService {

  complex = false;

  constructor() { }

  createLayersTreeData(profile: any, complex = false) {
    this.complex = complex;
    const treeData: TreeNode[] = [];
    profile.trees.forEach((t: any) => {
      const rootNode = t.nodes[t.rootNode];
      treeData.push(this.createLayerTreeNode(rootNode, t, profile.tasks));
    });
    return treeData;
  }

  createLayersTreeDataOffline(layers: any) {
    const treeData: TreeNode[] = [];
    const treeNodeRoot: TreeNode = {
        name: "map.downloadLayers",
        expanded: true,
        checked: false,
        visible: true,
        children: [],
      };    
    layers.forEach((l: any) => {
      const treeNode: TreeNode = {
        name: l.name,
        expanded: true,
        checked: false,
        visible: true,
        action: l.id_layer,
        children: [],
        transparency: 1.0,
        task: { fields: JSON.parse(l.fieldsjson) }
      };
      if (!treeNodeRoot.children) {
        treeNodeRoot.children = [];
      }
      treeNodeRoot.children.push(treeNode);
    });
    treeData[0] = treeNodeRoot;
    return treeData;
  }

  createBackgroundsTreeData(profile: any) {
    const backgrounds: any[] = profile.backgrounds;
    const treeData: TreeNode[] = [];
    let checked = true;
    if (backgrounds && backgrounds.length > 0) {
      backgrounds.forEach(bg => {
        treeData.push(this.createBackgroundTreeNode(bg, checked));
        checked = false;
      });
    }
    return treeData;
  }

  private createLayerTreeNode(node: any, tree: any, tasks: any[]): TreeNode {
    const treeNode: TreeNode = {
      name: node.title,
      expanded: true,
      checked: false,
      visible: true,
      children: []
    };
    if (node.children && node.children.length > 0) {
      node.children.forEach((c: string) => {
        const childNode = tree.nodes[c];
        treeNode.children?.push(this.createLayerTreeNode(childNode, tree, tasks));
      });
    } else if (this.complex ) {
      if (node.resource) {
        const treeNodeRef: TreeNode = {
          name: 'Capa de referencia',
          expanded: true,
          checked: false,
          visible: true,
          children: [],
          resource: node.resource
        };
        treeNode.children?.push(treeNodeRef);
      }
      if (node.action) {
        const treeNodeEdit: TreeNode = {
          name: 'Capa de edición',
          expanded: true,
          checked: false,
          visible: true,
          children: [],
          action: node.action,
          task: tasks.find((t: any) => t.id === node.action)
        };
        treeNode.children?.push(treeNodeEdit);
      } else {
        treeNode.resource = node.resource;
      }
    } else {
      treeNode.resource = node.resource;
      treeNode.action = node.action;
      treeNode.task = tasks.find((t: any) => t.id === node.action);
      treeNode.transparency = 1.0;
    }
    return treeNode;
  }

  private createBackgroundTreeNode (bg: any, checked: boolean) {
    const treeNode: TreeNode = {
      name: bg.title,
      expanded: true,
      checked,
      resource: bg.id,
      image: bg.thumbnail
    };
    return treeNode;
  }

  toggleExpand(node: TreeNode) {
    node.expanded = !node.expanded;
  }

  toggleCheck(node: TreeNode) {
    this.checkChildren(node, node.checked || false);
  }

  checkChildren(node: TreeNode, checked: boolean) {
    if (node.children) {
      node.children.forEach(child => {
        child.checked = checked;
        this.checkChildren(child, checked);
      });
    }
  }

  toggleVisible(node: TreeNode) {
    this.visibleChildren(node, node.visible || false);
  }

  visibleChildren(node: TreeNode, visible: boolean) {
    if (node.children) {
      node.children.forEach(child => {
        child.visible = visible;
        this.visibleChildren(child, visible);
      });
    }
  }

  getCheckedLayers(nodes: TreeNode[]): any[] {
    let checkedLayers: any[] = [];
    nodes.forEach(n => {
      if (n.checked && n.resource) {
        checkedLayers.push({
          resource: n.resource,
          action: n.action,
          fields: n.task.fields,
        });
      }
      if (n.children && n.children.length > 0) {
        checkedLayers = checkedLayers.concat(this.getCheckedLayers(n.children));
      }
    });
    return checkedLayers;
  }

  setCheckedLayers(nodes: TreeNode[], resources: string[]): void {
    nodes.forEach(node => {
      if (node.action){
        node.checked = false; // Reset estado checked 
      }
      if (node.action && resources.includes(node.action)) {
        node.checked = true;
      }
  
      if (node.children && node.children.length > 0) {
        this.setCheckedLayers(node.children, resources);
      }
    });
  }
}
