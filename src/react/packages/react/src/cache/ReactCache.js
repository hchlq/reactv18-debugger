/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *      
 */

                                                    

import {createContext} from 'react';
import invariant from 'shared/invariant';

               
                           
   

// TODO: should there be a default cache?
const CacheContext                             = createContext(null);

function CacheImpl() {
  this.resources = new Map();
  // TODO: cancellation token.
}

function createCache()        {
  // $FlowFixMe
  return new CacheImpl();
}

function readCache()        {
  // TODO: this doesn't subscribe.
  // But we really want load context anyway.
  const value = CacheContext._currentValue;
  if (value instanceof CacheImpl) {
    return value;
  }
  invariant(false, 'Could not read the cache.');
}

const CacheProvider = CacheContext.Provider;

export {createCache, readCache, CacheProvider};
