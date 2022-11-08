import React, { useMemo, useRef, useState } from 'react';
import { Application, ComponentSchema } from '@sunmao-ui/core';
import { Button, Radio } from '@arco-design/web-react';
import jsyaml from 'js-yaml';
import { css } from '@emotion/css';

import { PropertyViewer } from './components/PropertyViewer';
import { resolveApplication, resolveJson } from './resolve';
import { FileUploadArea } from './components/FileUploadArea';
import { SchemaTree } from './components/SchemaTree';
import { HashDivider, mergeApplication } from './mergeApplication';
import { ChangeDiffBlock } from './type';
import o from '../__tests__/mocks/ComponentDiff/o.json';
import a from '../__tests__/mocks/ComponentDiff/a.json';
import b from '../__tests__/mocks/ComponentDiff/b.json';

import '@arco-design/web-react/dist/css/arco.css';

const ViewerStyle = css`
  width: 100vw;
  height: 100vh;
  display: flex;
`;

const ResultAreaStyle = css`
  flex: 1 1 auto;
  height: 100%;
  overflow: auto;
  padding: 32px;
`;

export const Viewer: React.FC = () => {
  const [appO, setAppO] = useState(o as Application);
  const [appA, setAppA] = useState(a as Application);
  const [appB, setAppB] = useState(b as Application);

  const resolvedComponentsIdMap = useRef<Record<string, ComponentSchema>>({});
  const [mergedText, setMergedText] = useState<string>('');
  const [selectedHash, setSelectedHash] = useState<string>('');
  const [checkedHashes, setCheckedHashes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<'JSON' | 'YAML'>('JSON');

  const { diffBlocks, map, appSkeleton } = useMemo(
    () => mergeApplication(appO, appA, appB),
    [appA, appB, appO]
  );
  const changeDiffBlock: ChangeDiffBlock = diffBlocks.find(
    block => block.kind === 'change' && block.hashA === selectedHash
  ) as ChangeDiffBlock;

  const onClickSolve = () => {
    const newApp = resolveApplication({
      diffBlocks: diffBlocks,
      hashMap: map,
      resolvedComponentsIdMap: resolvedComponentsIdMap.current,
      checkedHashes,
      appSkeleton,
    });
    switch (exportFormat) {
      case 'JSON':
        setMergedText(JSON.stringify(newApp, null, 2));
        break;
      case 'YAML':
        setMergedText(jsyaml.dump(newApp));
        break;
    }
  };

  const onClickCopy = () => {
    navigator.clipboard.writeText(mergedText);
    setCopied(true);
  };

  const onSolveComponent = (component: Record<string, any>) => {
    const id = selectedHash.split(HashDivider)[0];
    resolvedComponentsIdMap.current[id] = component as ComponentSchema;
  };

  const onClickMerge = (o: Application, a: Application, b: Application) => {
    setAppO(o);
    setAppA(a);
    setAppB(b);
  };

  return (
    <div className={ViewerStyle}>
      <FileUploadArea onClickMerge={onClickMerge} />
      <SchemaTree
        diffs={diffBlocks}
        onSelectNode={hash => {
          setSelectedHash(hash);
        }}
        onCheck={value => {
          setCheckedHashes(value);
        }}
      />
      {changeDiffBlock ? (
        <PropertyViewer
          key={selectedHash}
          selectedHash={selectedHash}
          propsDiffBlocks={changeDiffBlock.diffBlocks}
          onCheck={map => {
            const component = resolveJson(changeDiffBlock.diffBlocks, map);
            onSolveComponent(component);
          }}
        />
      ) : undefined}
      <div className={ResultAreaStyle}>
        <h1>Result</h1>
        <Radio.Group
          defaultValue="JSON"
          value={exportFormat}
          onChange={val => setExportFormat(val)}
        >
          <Radio value="JSON">JSON</Radio>
          <Radio value="YAML">YAML</Radio>
        </Radio.Group>
        <Button type="primary" onClick={onClickSolve}>
          Apply
        </Button>
        <Button type="primary" disabled={!mergedText} onClick={onClickCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        <pre>{mergedText}</pre>
      </div>
    </div>
  );
};
