/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {unstable_batchedUpdates as batchedUpdates} from 'react-dom';
import {useLocalStorage, useSubscription} from '../hooks';
import {
  TreeDispatcherContext,
  TreeStateContext,
} from '../Components/TreeContext';
import {StoreContext} from '../context';

const ProfilerContext = createContext(null);
ProfilerContext.displayName = 'ProfilerContext';

function ProfilerContextController({children}) {
  const store = useContext(StoreContext);
  const {selectedElementID} = useContext(TreeStateContext);
  const dispatch = useContext(TreeDispatcherContext);

  const {profilerStore} = store;

  const subscription = useMemo(
    () => ({
      getCurrentValue: () => ({
        didRecordCommits: profilerStore.didRecordCommits,
        isProcessingData: profilerStore.isProcessingData,
        isProfiling: profilerStore.isProfiling,
        profilingData: profilerStore.profilingData,
        supportsProfiling: store.rootSupportsBasicProfiling,
      }),
      subscribe: (callback) => {
        profilerStore.addListener('profilingData', callback);
        profilerStore.addListener('isProcessingData', callback);
        profilerStore.addListener('isProfiling', callback);
        store.addListener('rootSupportsBasicProfiling', callback);
        return () => {
          profilerStore.removeListener('profilingData', callback);
          profilerStore.removeListener('isProcessingData', callback);
          profilerStore.removeListener('isProfiling', callback);
          store.removeListener('rootSupportsBasicProfiling', callback);
        };
      },
    }),
    [profilerStore, store],
  );
  const {
    didRecordCommits,
    isProcessingData,
    isProfiling,
    profilingData,
    supportsProfiling,
  } = useSubscription(subscription);

  const [prevProfilingData, setPrevProfilingData] = useState(null);
  const [rootID, setRootID] = useState(null);
  const [selectedFiberID, selectFiberID] = useState(null);
  const [selectedFiberName, selectFiberName] = useState(null);

  const selectFiber = useCallback(
    (id, name) => {
      selectFiberID(id);
      selectFiberName(name);

      // Sync selection to the Components tab for convenience.
      // Keep in mind that profiling data may be from a previous session.
      // If data has been imported, we should skip the selection sync.
      if (
        id !== null &&
        profilingData !== null &&
        profilingData.imported === false
      ) {
        // We should still check to see if this element is still in the store.
        // It may have been removed during profiling.
        if (store.containsElement(id)) {
          dispatch({
            type: 'SELECT_ELEMENT_BY_ID',
            payload: id,
          });
        }
      }
    },
    [dispatch, selectFiberID, selectFiberName, store, profilingData],
  );

  const setRootIDAndClearFiber = useCallback(
    (id) => {
      selectFiber(null, null);
      setRootID(id);
    },
    [setRootID, selectFiber],
  );

  if (prevProfilingData !== profilingData) {
    batchedUpdates(() => {
      setPrevProfilingData(profilingData);

      const dataForRoots =
        profilingData !== null ? profilingData.dataForRoots : null;
      if (dataForRoots != null) {
        const firstRootID = dataForRoots.keys().next().value || null;

        if (rootID === null || !dataForRoots.has(rootID)) {
          let selectedElementRootID = null;
          if (selectedElementID !== null) {
            selectedElementRootID =
              store.getRootIDForElement(selectedElementID);
          }
          if (
            selectedElementRootID !== null &&
            dataForRoots.has(selectedElementRootID)
          ) {
            setRootIDAndClearFiber(selectedElementRootID);
          } else {
            setRootIDAndClearFiber(firstRootID);
          }
        }
      }
    });
  }

  const startProfiling = useCallback(
    () => store.profilerStore.startProfiling(),
    [store],
  );
  const stopProfiling = useCallback(
    () => store.profilerStore.stopProfiling(),
    [store],
  );

  const [isCommitFilterEnabled, setIsCommitFilterEnabled] = useLocalStorage(
    'React::DevTools::isCommitFilterEnabled',
    false,
  );
  const [minCommitDuration, setMinCommitDuration] = useLocalStorage(
    'minCommitDuration',
    0,
  );

  const [selectedCommitIndex, selectCommitIndex] = useState(null);
  const [selectedTabID, selectTab] = useLocalStorage(
    'React::DevTools::Profiler::defaultTab',
    'flame-chart',
  );

  if (isProfiling) {
    batchedUpdates(() => {
      if (selectedCommitIndex !== null) {
        selectCommitIndex(null);
      }
      if (selectedFiberID !== null) {
        selectFiberID(null);
        selectFiberName(null);
      }
    });
  }

  const value = useMemo(
    () => ({
      selectedTabID,
      selectTab,

      didRecordCommits,
      isProcessingData,
      isProfiling,
      profilingData,
      startProfiling,
      stopProfiling,
      supportsProfiling,

      rootID,
      setRootID: setRootIDAndClearFiber,

      isCommitFilterEnabled,
      setIsCommitFilterEnabled,
      minCommitDuration,
      setMinCommitDuration,

      selectedCommitIndex,
      selectCommitIndex,

      selectedFiberID,
      selectedFiberName,
      selectFiber,
    }),
    [
      selectedTabID,
      selectTab,

      didRecordCommits,
      isProcessingData,
      isProfiling,
      profilingData,
      startProfiling,
      stopProfiling,
      supportsProfiling,

      rootID,
      setRootID,
      setRootIDAndClearFiber,

      isCommitFilterEnabled,
      setIsCommitFilterEnabled,
      minCommitDuration,
      setMinCommitDuration,

      selectedCommitIndex,
      selectCommitIndex,

      selectedFiberID,
      selectedFiberName,
      selectFiber,
    ],
  );

  return (
    <ProfilerContext.Provider value={value}>
      {children}
    </ProfilerContext.Provider>
  );
}

export {ProfilerContext, ProfilerContextController};
