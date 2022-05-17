/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {createContext} from 'react';

const idToShowFnMap = new Map();
const idToHideFnMap = new Map();

let currentHideFn = null;
let currentOnChange = null;

function hideMenu() {
  if (typeof currentHideFn === 'function') {
    currentHideFn();

    if (typeof currentOnChange === 'function') {
      currentOnChange(false);
    }
  }

  currentHideFn = null;
  currentOnChange = null;
}

function showMenu({data, id, onChange, pageX, pageY}) {
  const showFn = idToShowFnMap.get(id);
  if (typeof showFn === 'function') {
    // Prevent open menus from being left hanging.
    hideMenu();

    currentHideFn = idToHideFnMap.get(id);
    showFn({data, pageX, pageY});

    if (typeof onChange === 'function') {
      currentOnChange = onChange;
      onChange(true);
    }
  }
}

function registerMenu(id, showFn, hideFn) {
  if (idToShowFnMap.has(id)) {
    throw Error(`Context menu with id "${id}" already registered.`);
  }

  idToShowFnMap.set(id, showFn);
  idToHideFnMap.set(id, hideFn);

  return function unregisterMenu() {
    idToShowFnMap.delete(id);
    idToHideFnMap.delete(id);
  };
}

export const RegistryContext = createContext({
  hideMenu,
  showMenu,
  registerMenu,
});
