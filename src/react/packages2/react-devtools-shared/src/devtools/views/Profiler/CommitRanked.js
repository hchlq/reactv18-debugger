/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import {useCallback, useContext, useMemo, useState} from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import {FixedSizeList} from 'react-window';
import {ProfilerContext} from './ProfilerContext';
import NoCommitData from './NoCommitData';
import CommitRankedListItem from './CommitRankedListItem';
import HoveredFiberInfo from './HoveredFiberInfo';
import {scale} from './utils';
import {StoreContext} from '../context';
import {SettingsContext} from '../Settings/SettingsContext';
import {useHighlightNativeElement} from '../hooks';
import Tooltip from './Tooltip';

import styles from './CommitRanked.css';

export default function CommitRankedAutoSizer(_) {
  const {profilerStore} = useContext(StoreContext);
  const {rootID, selectedCommitIndex, selectFiber} =
    useContext(ProfilerContext);
  const {profilingCache} = profilerStore;

  const deselectCurrentFiber = useCallback(
    (event) => {
      event.stopPropagation();
      selectFiber(null, null);
    },
    [selectFiber],
  );

  let commitTree = null;
  let chartData = null;
  if (selectedCommitIndex !== null) {
    commitTree = profilingCache.getCommitTree({
      commitIndex: selectedCommitIndex,
      rootID: rootID,
    });

    chartData = profilingCache.getRankedChartData({
      commitIndex: selectedCommitIndex,
      commitTree,
      rootID: rootID,
    });
  }

  if (commitTree != null && chartData != null && chartData.nodes.length > 0) {
    return (
      <div className={styles.Container} onClick={deselectCurrentFiber}>
        <AutoSizer>
          {({height, width}) => (
            <CommitRanked
              chartData={chartData}
              commitTree={commitTree}
              height={height}
              width={width}
            />
          )}
        </AutoSizer>
      </div>
    );
  } else {
    return <NoCommitData />;
  }
}

function CommitRanked({chartData, commitTree, height, width}) {
  const [hoveredFiberData, setHoveredFiberData] = useState(null);
  const {lineHeight} = useContext(SettingsContext);
  const {selectedFiberID, selectFiber} = useContext(ProfilerContext);
  const {highlightNativeElement, clearHighlightNativeElement} =
    useHighlightNativeElement();

  const selectedFiberIndex = useMemo(
    () => getNodeIndex(chartData, selectedFiberID),
    [chartData, selectedFiberID],
  );

  const handleElementMouseEnter = useCallback(
    ({id, name}) => {
      highlightNativeElement(id); // Highlight last hovered element.
      setHoveredFiberData({id, name}); // Set hovered fiber data for tooltip
    },
    [highlightNativeElement],
  );

  const handleElementMouseLeave = useCallback(() => {
    clearHighlightNativeElement(); // clear highlighting of element on mouse leave
    setHoveredFiberData(null); // clear hovered fiber data for tooltip
  }, [clearHighlightNativeElement]);

  const itemData = useMemo(
    () => ({
      chartData,
      onElementMouseEnter: handleElementMouseEnter,
      onElementMouseLeave: handleElementMouseLeave,
      scaleX: scale(0, chartData.nodes[selectedFiberIndex].value, 0, width),
      selectedFiberID,
      selectedFiberIndex,
      selectFiber,
      width,
    }),
    [
      chartData,
      handleElementMouseEnter,
      handleElementMouseLeave,
      selectedFiberID,
      selectedFiberIndex,
      selectFiber,
      width,
    ],
  );

  // Tooltip used to show summary of fiber info on hover
  const tooltipLabel = useMemo(
    () =>
      hoveredFiberData !== null ? (
        <HoveredFiberInfo fiberData={hoveredFiberData} />
      ) : null,
    [hoveredFiberData],
  );

  return (
    <Tooltip label={tooltipLabel}>
      <FixedSizeList
        height={height}
        innerElementType="svg"
        itemCount={chartData.nodes.length}
        itemData={itemData}
        itemSize={lineHeight}
        width={width}
      >
        {CommitRankedListItem}
      </FixedSizeList>
    </Tooltip>
  );
}

const getNodeIndex = (chartData, id) => {
  if (id === null) {
    return 0;
  }
  const {nodes} = chartData;
  for (let index = 0; index < nodes.length; index++) {
    if (nodes[index].id === id) {
      return index;
    }
  }
  return 0;
};
