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
}

@Injectable({
  providedIn: 'root'
})
export class TreeviewService {

  constructor() { }

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
}
