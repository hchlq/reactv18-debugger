/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

// This file uses workerize to load ./importFile.worker as a webworker and instanciates it,
// exposing flow typed functions that can be used on other files.

import * as importFileModule from './importFile';
import WorkerizedImportFile from './importFile.worker';

const workerizedImportFile = window.Worker
  ? WorkerizedImportFile()
  : importFileModule;

export const importFile = (file) => workerizedImportFile.importFile(file);
