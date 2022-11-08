import { JSONType, PropsDiffBlock } from './type';
/**
 * Merge 3 JSON and return diffs and conflicts
 * @param o origin JSON 
 * @param a a JSON
 * @param b b JSON
 * @param path Optional. Pass path when call this function recursively
 * @returns 
 */
export function mergeJSON(
  o: JSONType,
  a: JSONType,
  b: JSONType,
  path = ''
): PropsDiffBlock[] {
  const blocks: PropsDiffBlock[] = [];
  for (const oKey in o) {
    const oVal = o[oKey];
    const aVal = a[oKey];
    const bVal = b[oKey];
    if (oKey in a && oKey in b) {
      // oKey is both in a and b
      if (oVal === aVal && oVal === bVal) {
        // 3 values are equal
        blocks.push({
          kind: 'equal',
          key: oKey,
          value: oVal,
          path: `${path}.${oKey}`,
          // they can not have children
          children: [],
        });
        continue;
      }
      if (oVal !== aVal && oVal !== bVal && aVal !== bVal) {
        // 3 values are not equal, have conflicts
        if (typeof aVal === 'object' && typeof bVal === 'object') {
          // if they are objects, merge them recursively
          const diffBlocks = mergeJSON(oVal, aVal, bVal, `${path}.${oKey}`);
          const childrenHasConflict = propsDiffBlocksHasChange(diffBlocks);
          if (childrenHasConflict) {
            // If their children have conflict, mark it them as 'change'.
            blocks.push({
              kind: 'change',
              key: oKey,
              value: oVal,
              path: `${path}.${oKey}`,
              children: diffBlocks,
              childrenHasConflict: propsDiffBlocksHasChange(diffBlocks),
            });
          } else {
            // If their children have no conflict, mark as 'equal'
            blocks.push({
              kind: 'equal',
              key: oKey,
              value: oVal,
              path: `${path}.${oKey}`,
              children: diffBlocks,
            });
          }
        } else {
          // if they are different and not objects, mark as 'conflict'
          blocks.push({
            kind: 'conflict',
            key: oKey,
            oValue: oVal,
            aValue: aVal,
            bValue: bVal,
            path: `${path}.${oKey}`,
          });
        }
        continue;
      }
      if (oVal !== aVal && oVal === bVal) {
        // a !== o && b === o, a overwrite b
        blocks.push({
          kind: 'change',
          key: oKey,
          value: aVal,
          path: `${path}.${oKey}`,
          children: [],
          childrenHasConflict: false,
        });
        continue;
      }
      if (oVal === aVal && oVal !== bVal) {
        // b !== o && a === o, b overwrite a
        blocks.push({
          kind: 'change',
          key: oKey,
          value: bVal,
          path: `${path}.${oKey}`,
          children: [],
          childrenHasConflict: false,
        });
        continue;
      }
    } else if (notIn(oKey, a) && oKey in b) {
      // only a delete this key
      if (bVal !== oVal) {
        // b changed
        blocks.push({
          kind: 'conflict',
          key: oKey,
          oValue: oVal,
          aValue: null,
          bValue: bVal,
          path: `${path}.${oKey}`,
        });
        continue;
      } else {
        // b did not change, just skip it, use a.
        continue;
      }
    } else if (notIn(oKey, b) && oKey in a) {
      // only b delete this key
      if (aVal !== oVal) {
        // a changed
        blocks.push({
          kind: 'conflict',
          key: oKey,
          oValue: oVal,
          aValue: aVal,
          bValue: null,
          path: `${path}.${oKey}`,
        });
        continue;
      } else {
        // just skip it.
        continue;
      }
    } else if (notIn(oKey, b) && notIn(oKey, a)) {
      // both delete, skip it.
      continue;
    }
  }

  const aBlocks = findNewField(o, a, b, path);
  const bBlocks = findNewField(o, a, b, path, true);
  return blocks.concat(aBlocks).concat(bBlocks);
}

/**
 * find the newly added fields that are in a or b and not in o.
 * @param o 
 * @param a 
 * @param b 
 * @param path Optional. Pass path when call this function recursively
 * @param reverse Optional. reverse the order of a and b
 * @returns 
 */
function findNewField(
  o: JSONType,
  a: JSONType,
  b: JSONType,
  path = '',
  reverse = false
): PropsDiffBlock[] {
  const blocks: PropsDiffBlock[] = [];
  const target = reverse ? b : a;
  const another = reverse ? a : b;

  for (const newKey in target) {
    const oVal = o[newKey];
    const aVal = target[newKey];
    const bVal = another[newKey];
    if (notIn(newKey, o) && notIn(newKey, another)) {
      // aKey is only in a, just add it.
      blocks.push({
        kind: 'equal',
        key: newKey,
        value: aVal,
        path: `${path}.${newKey}`,
        children: [],
      });
      continue;
    }

    if (!reverse && notIn(newKey, o) && newKey in another) {
      // If reverse is true, don't merge the key that ab both have, because it is already merged.
      // aKey is both in a and b
      if (typeof aVal === 'object' && typeof bVal === 'object') {
        // are object, merge them
        const diffBlocks = mergeJSON(oVal, aVal, bVal);
        blocks.push({
          kind: 'change',
          key: newKey,
          value: aVal,
          path: `${path}.${newKey}`,
          children: diffBlocks,
          childrenHasConflict: propsDiffBlocksHasChange(diffBlocks),
        });
      } else if (aVal === bVal) {
        // are equal
        blocks.push({
          kind: 'equal',
          key: newKey,
          value: aVal,
          path: `${path}.${newKey}`,
          children: [],
        });
      } else {
        // are different
        blocks.push({
          kind: 'conflict',
          key: newKey,
          oValue: oVal,
          aValue: aVal,
          bValue: bVal,
          path: `${path}.${newKey}`,
        });
      }
    }
  }
  return blocks;
}

function notIn(key: string, obj: object) {
  return !(key in obj);
}

export function propsDiffBlocksHasChange(blocks: PropsDiffBlock[]) {
  return blocks.some(
    block =>
      block.kind === 'conflict' || (block.kind === 'change' && block.childrenHasConflict)
  );
}
