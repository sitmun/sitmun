import { Injectable } from '@angular/core';

export interface TreeNode {
  name: string;
  children?: TreeNode[];
  expanded?: boolean;
  checked?: boolean;
  visible?: boolean;
  resource?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TreeviewService {

  constructor() { }

  createTreeData(trees: any[]) {
    const treeData: TreeNode[] = [];
    trees.forEach((t: any) => {
      const rootNode = t.nodes[t.rootNode];
      treeData.push(this.createTreeNode(rootNode, t));
    });
    return treeData;
  }

  createTreeNode(node: any, tree: any): TreeNode {
    const treeNode: TreeNode = {
      name: node.title,
      expanded: true,
      checked: false,
      visible: true,
      children: [],
      resource: node.resource
    };
    if (node.children && node.children.length > 0) {
      node.children.forEach((c: string) => {
        const childNode = tree.nodes[c];
        treeNode.children?.push(this.createTreeNode(childNode, tree));
      });
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

  getCheckedLayers(nodes: TreeNode[]): string[] {
    let checkedLayers: string[] = [];
    nodes.forEach(n => {
      if (n.checked && n.resource) {
        checkedLayers.push(n.resource);
      }
      if (n.children && n.children.length > 0) {
        checkedLayers = checkedLayers.concat(this.getCheckedLayers(n.children));
      }
    });
    return checkedLayers;
  }

  setCheckedLayers(nodes: TreeNode[], resources: string[]): void {
    nodes.forEach(node => {
      if (node.resource && resources.includes(node.resource)) {
        node.checked = true;
      }
  
      if (node.children && node.children.length > 0) {
        this.setCheckedLayers(node.children, resources);
      }
    });
  } 


}
