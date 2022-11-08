import { mergeApplication } from '../src/mergeApplication';
import o from './mocks/PropertyDiff/o.json';
import a from './mocks/PropertyDiff/a.json';
import b from './mocks/PropertyDiff/b.json';
import resolvedApp from './mocks/PropertyDiff/solved.json';
import { Application, ComponentSchema } from '@sunmao-ui/core';
import { ChangeDiffBlock, OKDiffBlock } from '../src/type';
import { resolveApplication, resolveJson } from '../src/resolve';

describe('diff property changes of component', () => {
  const { diffBlocks, map, appSkeleton } = mergeApplication(
    o as Application,
    a as Application,
    b as Application
  );
  const block1 = diffBlocks[0] as OKDiffBlock;
  const block2 = diffBlocks[1] as ChangeDiffBlock;
  it(`detect property's conflicts`, () => {
    expect(block1.kind).toEqual('ok');
    expect(block2.kind).toEqual('change');
    expect(block2.diffBlocks.map(d => d.kind)).toEqual([
      'equal',
      'equal',
      'change',
      'change',
    ]);
  });

  it(`resolve component's conflicts`, () => {
    const resolvedComponent = resolveJson(block2.diffBlocks, {
      '.properties.data': 'a',
      '.properties.pagination.pageSize': 'b',
      '.traits.1.properties.styles.0.cssProperties.width': 'a',
      '.properties.columns.2.title': 'a',
    });
    const newAPP = resolveApplication({
      diffBlocks,
      hashMap: map,
      resolvedComponentsIdMap: {
        [block2.id]: resolvedComponent as ComponentSchema,
      },
      checkedHashes: [block2.hashA],
      appSkeleton,
    });
    expect(newAPP).toEqual(resolvedApp);
  });
});
