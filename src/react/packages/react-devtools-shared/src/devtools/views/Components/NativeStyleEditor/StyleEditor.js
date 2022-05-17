/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import {useContext, useMemo, useRef, useState} from 'react';
import {unstable_batchedUpdates as batchedUpdates} from 'react-dom';
import {copy} from 'clipboard-js';
import {
  BridgeContext,
  StoreContext,
} from 'react-devtools-shared/src/devtools/views/context';
import Button from '../../Button';
import ButtonIcon from '../../ButtonIcon';
import {serializeDataForCopy} from '../../utils';
import AutoSizeInput from './AutoSizeInput';
import styles from './StyleEditor.css';
import {sanitizeForParse} from '../../../utils';

export default function StyleEditor({id, style}) {
  const bridge = useContext(BridgeContext);
  const store = useContext(StoreContext);

  const changeAttribute = (oldName, newName, value) => {
    const rendererID = store.getRendererIDForElement(id);
    if (rendererID !== null) {
      bridge.send('NativeStyleEditor_renameAttribute', {
        id,
        rendererID,
        oldName,
        newName,
        value,
      });
    }
  };

  const changeValue = (name, value) => {
    const rendererID = store.getRendererIDForElement(id);
    if (rendererID !== null) {
      bridge.send('NativeStyleEditor_setValue', {
        id,
        rendererID,
        name,
        value,
      });
    }
  };

  const keys = useMemo(() => Array.from(Object.keys(style)), [style]);

  const handleCopy = () => copy(serializeDataForCopy(style));

  return (
    <div className={styles.StyleEditor}>
      <div className={styles.HeaderRow}>
        <div className={styles.Header}>
          <div className={styles.Brackets}>{'style {'}</div>
        </div>
        <Button onClick={handleCopy} title="Copy to clipboard">
          <ButtonIcon type="copy" />
        </Button>
      </div>
      {keys.length > 0 &&
        keys.map((attribute) => (
          <Row
            key={attribute}
            attribute={attribute}
            changeAttribute={changeAttribute}
            changeValue={changeValue}
            validAttributes={store.nativeStyleEditorValidAttributes}
            value={style[attribute]}
          />
        ))}
      <NewRow
        changeAttribute={changeAttribute}
        changeValue={changeValue}
        validAttributes={store.nativeStyleEditorValidAttributes}
      />
      <div className={styles.Brackets}>{'}'}</div>
    </div>
  );
}

function NewRow({changeAttribute, changeValue, validAttributes}) {
  const [key, setKey] = useState(0);
  const reset = () => setKey(key + 1);

  const newAttributeRef = useRef('');

  const changeAttributeWrapper = (oldAttribute, newAttribute, value) => {
    // Ignore attribute changes until a value has been specified
    newAttributeRef.current = newAttribute;
  };

  const changeValueWrapper = (attribute, value) => {
    // Blur events should reset/cancel if there's no value or no attribute
    if (newAttributeRef.current !== '') {
      if (value !== '') {
        changeValue(newAttributeRef.current, value);
      }
      reset();
    }
  };

  return (
    <Row
      key={key}
      attribute={''}
      attributePlaceholder="attribute"
      changeAttribute={changeAttributeWrapper}
      changeValue={changeValueWrapper}
      validAttributes={validAttributes}
      value={''}
      valuePlaceholder="value"
    />
  );
}

function Row({
  attribute,
  attributePlaceholder,
  changeAttribute,
  changeValue,
  validAttributes,
  value,
  valuePlaceholder,
}) {
  // TODO (RN style editor) Use @reach/combobox to auto-complete attributes.
  // The list of valid attributes would need to be injected by RN backend,
  // which would need to require them from ReactNativeViewViewConfig "validAttributes.style" keys.
  // This would need to degrade gracefully for react-native-web,
  // although we could let it also inject a custom set of allowed attributes.

  const [localAttribute, setLocalAttribute] = useState(attribute);
  const [localValue, setLocalValue] = useState(JSON.stringify(value));
  const [isAttributeValid, setIsAttributeValid] = useState(true);
  const [isValueValid, setIsValueValid] = useState(true);

  const validateAndSetLocalAttribute = (newAttribute) => {
    const isValid =
      newAttribute === '' ||
      validAttributes === null ||
      validAttributes.indexOf(newAttribute) >= 0;

    batchedUpdates(() => {
      setLocalAttribute(newAttribute);
      setIsAttributeValid(isValid);
    });
  };

  const validateAndSetLocalValue = (newValue) => {
    let isValid = false;
    try {
      JSON.parse(sanitizeForParse(newValue));
      isValid = true;
    } catch (error) {}

    batchedUpdates(() => {
      setLocalValue(newValue);
      setIsValueValid(isValid);
    });
  };

  const resetAttribute = () => {
    setLocalAttribute(attribute);
  };

  const resetValue = () => {
    setLocalValue(value);
  };

  const submitValueChange = () => {
    if (isAttributeValid && isValueValid) {
      const parsedLocalValue = JSON.parse(sanitizeForParse(localValue));
      if (value !== parsedLocalValue) {
        changeValue(attribute, parsedLocalValue);
      }
    }
  };

  const submitAttributeChange = () => {
    if (isAttributeValid && isValueValid) {
      if (attribute !== localAttribute) {
        changeAttribute(attribute, localAttribute, value);
      }
    }
  };

  return (
    <div className={styles.Row}>
      <Field
        className={isAttributeValid ? styles.Attribute : styles.Invalid}
        onChange={validateAndSetLocalAttribute}
        onReset={resetAttribute}
        onSubmit={submitAttributeChange}
        placeholder={attributePlaceholder}
        value={localAttribute}
      />
      :&nbsp;
      <Field
        className={isValueValid ? styles.Value : styles.Invalid}
        onChange={validateAndSetLocalValue}
        onReset={resetValue}
        onSubmit={submitValueChange}
        placeholder={valuePlaceholder}
        value={localValue}
      />
      ;
    </div>
  );
}

function Field({className, onChange, onReset, onSubmit, placeholder, value}) {
  const onKeyDown = (event) => {
    switch (event.key) {
      case 'Enter':
        onSubmit();
        break;
      case 'Escape':
        onReset();
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
        event.stopPropagation();
        break;
      default:
        break;
    }
  };

  return (
    <AutoSizeInput
      className={`${className} ${styles.Input}`}
      onBlur={onSubmit}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      value={value}
    />
  );
}
