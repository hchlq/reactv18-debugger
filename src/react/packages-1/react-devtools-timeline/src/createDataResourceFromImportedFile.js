/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {createResource} from 'react-devtools-shared/src/devtools/cache';
import {importFile} from './import-worker';

export default function createDataResourceFromImportedFile(file) {
  return createResource(
    () => {
      return new Promise((resolve, reject) => {
        const promise = importFile(file);
        promise.then((data) => {
          switch (data.status) {
            case 'SUCCESS':
              resolve(data.processedData);
              break;
            case 'INVALID_PROFILE_ERROR':
              resolve(data.error);
              break;
            case 'UNEXPECTED_ERROR':
              reject(data.error);
              break;
          }
        });
      });
    },
    () => file,
    {useWeakMap: true},
  );
}
