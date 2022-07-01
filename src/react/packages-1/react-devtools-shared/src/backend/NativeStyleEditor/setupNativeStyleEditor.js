/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import Agent from 'react-devtools-shared/src/backend/agent';
import resolveBoxStyle from './resolveBoxStyle';
import isArray from 'react-devtools-shared/src/isArray';

export default function setupNativeStyleEditor(
  bridge,
  agent,
  resolveNativeStyle,
  validAttributes,
) {
  bridge.addListener('NativeStyleEditor_measure', ({id, rendererID}) => {
    measureStyle(agent, bridge, resolveNativeStyle, id, rendererID);
  });

  bridge.addListener(
    'NativeStyleEditor_renameAttribute',
    ({id, rendererID, oldName, newName, value}) => {
      renameStyle(agent, id, rendererID, oldName, newName, value);
      setTimeout(() =>
        measureStyle(agent, bridge, resolveNativeStyle, id, rendererID),
      );
    },
  );

  bridge.addListener(
    'NativeStyleEditor_setValue',
    ({id, rendererID, name, value}) => {
      setStyle(agent, id, rendererID, name, value);
      setTimeout(() =>
        measureStyle(agent, bridge, resolveNativeStyle, id, rendererID),
      );
    },
  );

  bridge.send('isNativeStyleEditorSupported', {
    isSupported: true,
    validAttributes,
  });
}

const EMPTY_BOX_STYLE = {
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const componentIDToStyleOverrides = new Map();

function measureStyle(agent, bridge, resolveNativeStyle, id, rendererID) {
  const data = agent.getInstanceAndStyle({id, rendererID});
  if (!data || !data.style) {
    bridge.send('NativeStyleEditor_styleAndLayout', {
      id,
      layout: null,
      style: null,
    });
    return;
  }

  const {instance, style} = data;

  let resolvedStyle = resolveNativeStyle(style);

  // If it's a host component we edited before, amend styles.
  const styleOverrides = componentIDToStyleOverrides.get(id);
  if (styleOverrides != null) {
    resolvedStyle = Object.assign({}, resolvedStyle, styleOverrides);
  }

  if (!instance || typeof instance.measure !== 'function') {
    bridge.send('NativeStyleEditor_styleAndLayout', {
      id,
      layout: null,
      style: resolvedStyle || null,
    });
    return;
  }

  // $FlowFixMe the parameter types of an unknown function are unknown
  instance.measure((x, y, width, height, left, top) => {
    // RN Android sometimes returns undefined here. Don't send measurements in this case.
    // https://github.com/jhen0409/react-native-debugger/issues/84#issuecomment-304611817
    if (typeof x !== 'number') {
      bridge.send('NativeStyleEditor_styleAndLayout', {
        id,
        layout: null,
        style: resolvedStyle || null,
      });
      return;
    }
    const margin =
      (resolvedStyle != null && resolveBoxStyle('margin', resolvedStyle)) ||
      EMPTY_BOX_STYLE;
    const padding =
      (resolvedStyle != null && resolveBoxStyle('padding', resolvedStyle)) ||
      EMPTY_BOX_STYLE;
    bridge.send('NativeStyleEditor_styleAndLayout', {
      id,
      layout: {
        x,
        y,
        width,
        height,
        left,
        top,
        margin,
        padding,
      },
      style: resolvedStyle || null,
    });
  });
}

function shallowClone(object) {
  const cloned = {};
  for (const n in object) {
    cloned[n] = object[n];
  }
  return cloned;
}

function renameStyle(agent, id, rendererID, oldName, newName, value) {
  const data = agent.getInstanceAndStyle({id, rendererID});
  if (!data || !data.style) {
    return;
  }

  const {instance, style} = data;

  const newStyle = newName
    ? {[oldName]: undefined, [newName]: value}
    : {[oldName]: undefined};

  let customStyle;

  // TODO It would be nice if the renderer interface abstracted this away somehow.
  if (instance !== null && typeof instance.setNativeProps === 'function') {
    // In the case of a host component, we need to use setNativeProps().
    // Remember to "correct" resolved styles when we read them next time.
    const styleOverrides = componentIDToStyleOverrides.get(id);
    if (!styleOverrides) {
      componentIDToStyleOverrides.set(id, newStyle);
    } else {
      Object.assign(styleOverrides, newStyle);
    }
    // TODO Fabric does not support setNativeProps; chat with Sebastian or Eli
    instance.setNativeProps({style: newStyle});
  } else if (isArray(style)) {
    const lastIndex = style.length - 1;
    if (typeof style[lastIndex] === 'object' && !isArray(style[lastIndex])) {
      customStyle = shallowClone(style[lastIndex]);
      delete customStyle[oldName];
      if (newName) {
        customStyle[newName] = value;
      } else {
        customStyle[oldName] = undefined;
      }

      agent.overrideValueAtPath({
        type: 'props',
        id,
        rendererID,
        path: ['style', lastIndex],
        value: customStyle,
      });
    } else {
      agent.overrideValueAtPath({
        type: 'props',
        id,
        rendererID,
        path: ['style'],
        value: style.concat([newStyle]),
      });
    }
  } else if (typeof style === 'object') {
    customStyle = shallowClone(style);
    delete customStyle[oldName];
    if (newName) {
      customStyle[newName] = value;
    } else {
      customStyle[oldName] = undefined;
    }

    agent.overrideValueAtPath({
      type: 'props',
      id,
      rendererID,
      path: ['style'],
      value: customStyle,
    });
  } else {
    agent.overrideValueAtPath({
      type: 'props',
      id,
      rendererID,
      path: ['style'],
      value: [style, newStyle],
    });
  }

  agent.emit('hideNativeHighlight');
}

function setStyle(agent, id, rendererID, name, value) {
  const data = agent.getInstanceAndStyle({id, rendererID});
  if (!data || !data.style) {
    return;
  }

  const {instance, style} = data;
  const newStyle = {[name]: value};

  // TODO It would be nice if the renderer interface abstracted this away somehow.
  if (instance !== null && typeof instance.setNativeProps === 'function') {
    // In the case of a host component, we need to use setNativeProps().
    // Remember to "correct" resolved styles when we read them next time.
    const styleOverrides = componentIDToStyleOverrides.get(id);
    if (!styleOverrides) {
      componentIDToStyleOverrides.set(id, newStyle);
    } else {
      Object.assign(styleOverrides, newStyle);
    }
    // TODO Fabric does not support setNativeProps; chat with Sebastian or Eli
    instance.setNativeProps({style: newStyle});
  } else if (isArray(style)) {
    const lastLength = style.length - 1;
    if (typeof style[lastLength] === 'object' && !isArray(style[lastLength])) {
      agent.overrideValueAtPath({
        type: 'props',
        id,
        rendererID,
        path: ['style', lastLength, name],
        value,
      });
    } else {
      agent.overrideValueAtPath({
        type: 'props',
        id,
        rendererID,
        path: ['style'],
        value: style.concat([newStyle]),
      });
    }
  } else {
    agent.overrideValueAtPath({
      type: 'props',
      id,
      rendererID,
      path: ['style'],
      value: [style, newStyle],
    });
  }

  agent.emit('hideNativeHighlight');
}
