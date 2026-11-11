import { TreeNode, TreeviewService } from "./treeview.service";

describe("getCheckedLayers", () => {
  const service = new TreeviewService();

  it("returns a ticked node that has a task and no cartography", () => {
    const nodes: TreeNode[] = [
      {
        name: "Punts de prova",
        checked: true,
        action: "task/32344",
        task: { fields: ["name"] },
      },
    ];

    expect(service.getCheckedLayers(nodes)).toEqual([
      { resource: undefined, action: "task/32344", fields: ["name"] },
    ]);
  });

  it("does not throw when a ticked node has cartography and no task", () => {
    const nodes: TreeNode[] = [
      { name: "Base", checked: true, resource: "layer/4748" },
    ];

    expect(service.getCheckedLayers(nodes)).toEqual([
      { resource: "layer/4748", action: undefined, fields: undefined },
    ]);
  });

  it("skips an unticked node", () => {
    const nodes: TreeNode[] = [
      {
        name: "Base",
        checked: false,
        resource: "layer/1",
        action: "task/1",
        task: { fields: ["name"] },
      },
    ];

    expect(service.getCheckedLayers(nodes)).toEqual([]);
  });
});
