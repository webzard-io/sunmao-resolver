import { Application, ComponentSchema } from '@sunmao-ui/core';
import { flatten } from 'lodash';
import * as Diff3 from 'node-diff3';
import { mergeJSON, propsDiffBlocksHasChange } from './mergeJSON';
import {
  ComponentHashMap,
  DiffBlock,
  OKDiffBlock,
  ConflictDiffBlock,
  ChangeDiffBlock,
} from './type';

export const HashDivider = `@@`;

/**
 * merge 3 Sunmao Applications, return diffs and conflicts
 * @param o origin Sunmao Application
 * @param a 
 * @param b 
 * @returns 
 */
export function mergeApplication(
  o: Application,
  a: Application,
  b: Application
): {
  diffBlocks: DiffBlock[];
  map: ComponentHashMap;
  appSkeleton: Application;
} {
  function hashComponent(component: ComponentSchema<unknown>): string {
    const json = JSON.stringify(component);
    let hash = 0;
    let i = 0;
    let chr = 0;
    if (json.length === 0) return `${hash}`;
    for (i = 0; i < json.length; i++) {
      chr = json.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return `${component.id}${HashDivider}${hash}`;
  }

  const map: ComponentHashMap = {};

  const oHashed = o.spec.components.map(c => {
    const hash = hashComponent(c);
    map[hash] = c;
    return hash;
  });
  const aHashed = a.spec.components.map(c => {
    const hash = hashComponent(c);
    map[hash] = c;
    return hash;
  });
  const bHashed = b.spec.components.map(c => {
    const hash = hashComponent(c);
    map[hash] = c;
    return hash;
  });

  const mergeRegion = Diff3.diff3Merge(aHashed, oHashed, bHashed);
  const formatted = flatten(mergeRegion.map(r => formatMergeRegionToDiffBlock(r, map)));
  const appSkeleton = { ...o, spec: { ...o.spec, components: [] } };
  return { diffBlocks: formatted, map, appSkeleton };
}

function formatMergeRegionToDiffBlock(
  region: Diff3.MergeRegion<string>,
  map: ComponentHashMap
): DiffBlock[] {
  if (region.ok) {
    const block: OKDiffBlock = {
      kind: 'ok',
      o: region.ok.map(hash => map[hash]),
      hashes: region.ok,
    };
    return [block];
  }
  const blocks: DiffBlock[] = [];
  if (region.conflict) {
    const conflict = region.conflict;
    let ca = 0;
    let cb = 0;
    while (conflict.a[ca] || conflict.b[ca]) {
      const hashA = conflict.a[ca];
      const hashB = conflict.b[cb];
      const hashO = conflict.o[cb];
      const idA = hashA.split(HashDivider)[0];
      const idB = hashB.split(HashDivider)[0];
      if (idA === idB) {
        const propsDiffBlocks = mergeJSON(map[hashO], map[hashA], map[hashB]);
        const block: ChangeDiffBlock = {
          kind: 'change',
          hashA: hashA,
          hashB: hashB,
          id: idA,
          o: map[hashO],
          a: map[hashA],
          b: map[hashB],
          diffBlocks: propsDiffBlocks,
          hasConflict: propsDiffBlocksHasChange(propsDiffBlocks),
        };
        blocks.push(block);
        ca++;
        cb++;
      } else {
        break;
      }
    }

    const restAHashes = conflict.a.filter(
      hash => !blocks.find(block => block.kind === 'change' && block.hashA === hash)
    );
    const restBHashes = conflict.b.filter(
      hash => !blocks.find(block => block.kind === 'change' && block.hashB === hash)
    );

    if (restAHashes.length || restBHashes.length) {
      const block: ConflictDiffBlock = {
        kind: 'conflict',
        aHashes: restAHashes,
        bHashes: restBHashes,
        a: restAHashes.map(hash => map[hash]),
        b: restBHashes.map(hash => map[hash]),
      };

      blocks.push(block);
    }
  }

  return blocks;
}
