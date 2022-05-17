/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import {createContext, useCallback, useContext, useEffect} from 'react';
import {createResource} from '../../cache';
import {BridgeContext, StoreContext} from '../context';
import {TreeStateContext} from './TreeContext';
import {separateDisplayNameAndHOCs} from 'react-devtools-shared/src/utils';

const OwnersListContext = createContext(null);
OwnersListContext.displayName = 'OwnersListContext';

const inProgressRequests = new WeakMap();
const resource = createResource(
  (element) => {
    const request = inProgressRequests.get(element);
    if (request != null) {
      return request.promise;
    }

    let resolveFn = null;
    const promise = new Promise((resolve) => {
      resolveFn = resolve;
    });

    inProgressRequests.set(element, {promise, resolveFn});

    return promise;
  },
  (element) => element,
  {useWeakMap: true},
);

function OwnersListContextController({children}) {
  const bridge = useContext(BridgeContext);
  const store = useContext(StoreContext);
  const {ownerID} = useContext(TreeStateContext);

  const read = useCallback(
    (id) => {
      const element = store.getElementByID(id);
      if (element !== null) {
        return resource.read(element);
      } else {
        return null;
      }
    },
    [store],
  );

  useEffect(() => {
    const onOwnersList = (ownersList) => {
      const id = ownersList.id;

      const element = store.getElementByID(id);
      if (element !== null) {
        const request = inProgressRequests.get(element);
        if (request != null) {
          inProgressRequests.delete(element);

          request.resolveFn(
            ownersList.owners === null
              ? null
              : ownersList.owners.map((owner) => {
                  const [displayNameWithoutHOCs, hocDisplayNames] =
                    separateDisplayNameAndHOCs(owner.displayName, owner.type);

                  return {
                    ...owner,
                    displayName: displayNameWithoutHOCs,
                    hocDisplayNames,
                  };
                }),
          );
        }
      }
    };

    bridge.addListener('ownersList', onOwnersList);
    return () => bridge.removeListener('ownersList', onOwnersList);
  }, [bridge, store]);

  // This effect requests an updated owners list any time the selected owner changes
  useEffect(() => {
    if (ownerID !== null) {
      const rendererID = store.getRendererIDForElement(ownerID);
      if (rendererID !== null) {
        bridge.send('getOwnersList', {id: ownerID, rendererID});
      }
    }

    return () => {};
  }, [bridge, ownerID, store]);

  return (
    <OwnersListContext.Provider value={read}>
      {children}
    </OwnersListContext.Provider>
  );
}

export {OwnersListContext, OwnersListContextController};
