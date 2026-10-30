import type { TreeNode } from "../../src/data/types";

interface IntermediateNode {
  name: string;
  type: "dir" | "file";
  note?: string | undefined;
  children?: Map<string, IntermediateNode> | undefined;
}

/**
 * Builds a structured TreeNode hierarchy for display in the Dossier structure viewer.
 */
export function buildFileTree(
  filePaths: string[],
  fileNotes: Record<string, string> = {},
  maxEntries = 50,
): TreeNode[] {
  const root: IntermediateNode = {
    name: "root",
    type: "dir",
    children: new Map(),
  };

  // Sort paths for consistent tree construction
  const sortedPaths = [...filePaths].sort();

  for (const filePath of sortedPaths) {
    const parts = filePath.split("/").filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isFile = i === parts.length - 1;
      const subpath = parts.slice(0, i + 1).join("/");

      if (!current.children) {
        current.children = new Map();
      }

      let child = current.children.get(part);
      if (!child) {
        child = {
          name: part,
          type: isFile ? "file" : "dir",
          note: isFile ? fileNotes[subpath] : undefined,
          children: isFile ? undefined : new Map(),
        };
        current.children.set(part, child);
      } else if (isFile && fileNotes[subpath]) {
        child.note = fileNotes[subpath];
      }

      current = child as IntermediateNode;
    }
  }

  function convert(node: IntermediateNode, depth = 0): TreeNode {
    const res: TreeNode = {
      name: node.name,
      type: node.type,
      note: node.note,
    };

    if (node.children && node.children.size > 0) {
      // Sort: directories first, then files alphabetically
      const convertedChildren: TreeNode[] = Array.from(node.children.values())
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .slice(0, maxEntries)
        .map((child) => convert(child, depth + 1));

      res.children = convertedChildren;
    }

    return res;
  }

  return Array.from(root.children?.values() || []).map((node) => convert(node));
}
