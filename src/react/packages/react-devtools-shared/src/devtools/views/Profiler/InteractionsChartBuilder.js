/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

import ProfilerStore from 'react-devtools-shared/src/devtools/ProfilerStore';

                                         

                          
                                   
                              
                            
   

const cachedChartData                         = new Map();

export function getChartData({
  profilerStore,
  rootID,
}    
                               
                 
  )            {
  if (cachedChartData.has(rootID)) {
    return ((cachedChartData.get(rootID)     )           );
  }

  const dataForRoot = profilerStore.getDataForRoot(rootID);
  if (dataForRoot == null) {
    throw Error(`Could not find profiling data for root "${rootID}"`);
  }

  const {commitData, interactions} = dataForRoot;

  const lastInteractionTime =
    commitData.length > 0 ? commitData[commitData.length - 1].timestamp : 0;

  let maxCommitDuration = 0;

  commitData.forEach(commitDatum => {
    maxCommitDuration = Math.max(maxCommitDuration, commitDatum.duration);
  });

  const chartData = {
    interactions: Array.from(interactions.values()),
    lastInteractionTime,
    maxCommitDuration,
  };

  cachedChartData.set(rootID, chartData);

  return chartData;
}

export function invalidateChartData()       {
  cachedChartData.clear();
}
