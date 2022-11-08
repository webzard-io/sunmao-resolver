import { Application, ComponentSchema } from '@sunmao-ui/core';
import { ComponentHashMap, DiffBlock, PropsDiffBlock } from './type';

export type CheckedPropsMap = Record<string, 'a' | 'b'>;

// Apply changes of blocks and export to Sunmao Application.
/**
 *
 * @param diffBlocks
 * @param hashMap The map returned by merge function. eg: {text1: component}
 * @param resolvedComponentsIdMap The map of changed components, decided by user. eg: {text1: component, text2: component}
 * @param checkedHashes eg: [text1@@232325345, text2@@468783475]
 * @param appSkeleton The origin application schema
 * @returns
 */
export function resolveApplication(params: {
  diffBlocks: DiffBlock[];
  hashMap: ComponentHashMap;
  resolvedComponentsIdMap: Record<string, ComponentSchema>;
  checkedHashes: string[];
  appSkeleton: Application;
}): Application {
  const { diffBlocks, hashMap, resolvedComponentsIdMap, checkedHashes, appSkeleton } =
    params;
  const components = diffBlocks.reduce((res, block) => {
    switch (block.kind) {
      case 'ok':
        return res.concat(block.hashes.map(hash => hashMap[hash]));
      case 'conflict':
        const checkedComponents = block.aHashes
          .concat(block.bHashes)
          .filter(hash => checkedHashes.includes(hash))
          .map(item => hashMap[item]);
        return res.concat(checkedComponents);
      case 'change':
        if (!block.hasConflict) {
          return res.concat([resolveJson(block.diffBlocks, {})]);
        }
        if (checkedHashes.includes(block.hashA) && resolvedComponentsIdMap[block.id]) {
          return res.concat([resolvedComponentsIdMap[block.id]]);
        }
    }
    return res;
  }, [] as any[]);

  return {
    ...appSkeleton,
    spec: {
      ...appSkeleton.spec,
      components,
    },
  };
}

/**
 *
 * @param blocks PropsDiffBlock[] JSONDiffBlocks
 * @param map The key is the path of object, The value is 'a' or 'b'. eg: {'.properties.data': 'a'}
 * @returns JSON
 */
// Apply changes of component and export to Sunmao Component Schema.
export function resolveJson(
  blocks: PropsDiffBlock[],
  map: CheckedPropsMap
): Record<string, any> {
  const json: Record<string, any> = {};
  blocks.forEach(block => {
    switch (block.kind) {
      case 'equal':
        json[block.key] = block.value;
        break;
      case 'change':
        if (block.childrenHasConflict) {
          json[block.key] = resolveJson(block.children, map);
        } else if (block.children.length > 0) {
          json[block.key] = resolveJson(block.children, {});
        } else {
          json[block.key] = block.value;
        }
        break;
      case 'conflict':
        if (map[block.path] === 'a') {
          json[block.key] = block.aValue;
        } else {
          json[block.key] = block.bValue;
        }
    }
  });
  return json;
}
