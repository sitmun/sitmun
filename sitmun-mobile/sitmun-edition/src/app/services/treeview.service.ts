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
}

@Injectable({
  providedIn: 'root'
})
export class TreeviewService {

  complex = false;

  constructor() { }

  createTreeData(profile: any, complex = false) {
    this.complex = complex;
    const treeData: TreeNode[] = [];
    profile.trees.forEach((t: any) => {
      const rootNode = t.nodes[t.rootNode];
      treeData.push(this.createTreeNode(rootNode, t, profile.tasks));
    });
    return treeData;
  }

  createTreeNode(node: any, tree: any, tasks: any[]): TreeNode {
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
        treeNode.children?.push(this.createTreeNode(childNode, tree, tasks));
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
    }
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
          action: n.action
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
      if (node.action && resources.includes(node.action)) {
        node.checked = true;
      }
  
      if (node.children && node.children.length > 0) {
        this.setCheckedLayers(node.children, resources);
      }
    });
  }
}
