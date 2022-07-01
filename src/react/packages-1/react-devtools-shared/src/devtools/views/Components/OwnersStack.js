/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
import * as React from 'react';
import {
  Fragment,
  useCallback,
  useContext,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import Toggle from '../Toggle';
import Badge from './Badge';
import {OwnersListContext} from './OwnersListContext';
import {TreeDispatcherContext, TreeStateContext} from './TreeContext';
import {useIsOverflowing} from '../hooks';
import {StoreContext} from '../context';
import Tooltip from '../Components/reach-ui/tooltip';
import {
  Menu,
  MenuList,
  MenuButton,
  MenuItem,
} from '../Components/reach-ui/menu-button';

import styles from './OwnersStack.css';

function dialogReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_OWNER_ID':
      const selectedIndex = action.owners.findIndex(
        (owner) => owner.id === action.ownerID,
      );
      return {
        ownerID: action.ownerID,
        owners: action.owners,
        selectedIndex,
      };
    case 'UPDATE_SELECTED_INDEX':
      return {
        ...state,
        selectedIndex: action.selectedIndex,
      };
    default:
      throw new Error(`Invalid action "${action.type}"`);
  }
}

export default function OwnerStack() {
  const read = useContext(OwnersListContext);
  const {ownerID} = useContext(TreeStateContext);
  const treeDispatch = useContext(TreeDispatcherContext);

  const [state, dispatch] = useReducer(dialogReducer, {
    ownerID: null,
    owners: [],
    selectedIndex: 0,
  });

  // When an owner is selected, we either need to update the selected index, or we need to fetch a new list of owners.
  // We use a reducer here so that we can avoid fetching a new list unless the owner ID has actually changed.
  if (ownerID === null) {
    dispatch({
      type: 'UPDATE_OWNER_ID',
      ownerID: null,
      owners: [],
    });
  } else if (ownerID !== state.ownerID) {
    const isInStore =
      state.owners.findIndex((owner) => owner.id === ownerID) >= 0;
    dispatch({
      type: 'UPDATE_OWNER_ID',
      ownerID,
      owners: isInStore ? state.owners : read(ownerID) || [],
    });
  }

  const {owners, selectedIndex} = state;

  const selectOwner = useCallback(
    (owner) => {
      if (owner !== null) {
        const index = owners.indexOf(owner);
        dispatch({
          type: 'UPDATE_SELECTED_INDEX',
          selectedIndex: index >= 0 ? index : 0,
        });
        treeDispatch({type: 'SELECT_OWNER', payload: owner.id});
      } else {
        dispatch({
          type: 'UPDATE_SELECTED_INDEX',
          selectedIndex: 0,
        });
        treeDispatch({type: 'RESET_OWNER_STACK'});
      }
    },
    [owners, treeDispatch],
  );

  const [elementsTotalWidth, setElementsTotalWidth] = useState(0);
  const elementsBarRef = useRef(null);
  const isOverflowing = useIsOverflowing(elementsBarRef, elementsTotalWidth);

  const selectedOwner = owners[selectedIndex];

  useLayoutEffect(() => {
    // If we're already overflowing, then we don't need to re-measure items.
    // That's because once the owners stack is open, it can only get larger (by drilling in).
    // A totally new stack can only be reached by exiting this mode and re-entering it.
    if (elementsBarRef.current === null || isOverflowing) {
      return () => {};
    }

    let totalWidth = 0;
    for (let i = 0; i < owners.length; i++) {
      const element = elementsBarRef.current.children[i];
      const computedStyle = getComputedStyle(element);

      totalWidth +=
        element.offsetWidth +
        parseInt(computedStyle.marginLeft, 10) +
        parseInt(computedStyle.marginRight, 10);
    }

    setElementsTotalWidth(totalWidth);
  }, [elementsBarRef, isOverflowing, owners.length]);

  return (
    <div className={styles.OwnerStack}>
      <div className={styles.Bar} ref={elementsBarRef}>
        {isOverflowing && (
          <Fragment>
            <ElementsDropdown
              owners={owners}
              selectedIndex={selectedIndex}
              selectOwner={selectOwner}
            />
            <BackToOwnerButton
              owners={owners}
              selectedIndex={selectedIndex}
              selectOwner={selectOwner}
            />
            {selectedOwner != null && (
              <ElementView
                owner={selectedOwner}
                isSelected={true}
                selectOwner={selectOwner}
              />
            )}
          </Fragment>
        )}
        {!isOverflowing &&
          owners.map((owner, index) => (
            <ElementView
              key={index}
              owner={owner}
              isSelected={index === selectedIndex}
              selectOwner={selectOwner}
            />
          ))}
      </div>
      <div className={styles.VRule} />
      <Button
        className={styles.IconButton}
        onClick={() => selectOwner(null)}
        title="Back to tree view"
      >
        <ButtonIcon type="close" />
      </Button>
    </div>
  );
}

function ElementsDropdown({owners, selectedIndex, selectOwner}) {
  const store = useContext(StoreContext);

  const menuItems = [];
  for (let index = owners.length - 1; index >= 0; index--) {
    const owner = owners[index];
    const isInStore = store.containsElement(owner.id);
    menuItems.push(
      <MenuItem
        key={owner.id}
        className={`${styles.Component} ${isInStore ? '' : styles.NotInStore}`}
        onSelect={() => (isInStore ? selectOwner(owner) : null)}
      >
        {owner.displayName}

        <Badge
          className={styles.Badge}
          hocDisplayNames={owner.hocDisplayNames}
          type={owner.type}
        />
      </MenuItem>,
    );
  }

  return (
    <Menu>
      <MenuButton className={styles.MenuButton}>
        <Tooltip label="Open elements dropdown">
          <span className={styles.MenuButtonContent} tabIndex={-1}>
            <ButtonIcon type="more" />
          </span>
        </Tooltip>
      </MenuButton>
      <MenuList className={styles.Modal}>{menuItems}</MenuList>
    </Menu>
  );
}

function ElementView({isSelected, owner, selectOwner}) {
  const store = useContext(StoreContext);

  const {displayName, hocDisplayNames, type} = owner;
  const isInStore = store.containsElement(owner.id);

  const handleChange = useCallback(() => {
    if (isInStore) {
      selectOwner(owner);
    }
  }, [isInStore, selectOwner, owner]);

  return (
    <Toggle
      className={`${styles.Component} ${isInStore ? '' : styles.NotInStore}`}
      isChecked={isSelected}
      onChange={handleChange}
    >
      {displayName}

      <Badge
        className={styles.Badge}
        hocDisplayNames={hocDisplayNames}
        type={type}
      />
    </Toggle>
  );
}

function BackToOwnerButton({owners, selectedIndex, selectOwner}) {
  const store = useContext(StoreContext);

  if (selectedIndex <= 0) {
    return null;
  }

  const owner = owners[selectedIndex - 1];
  const isInStore = store.containsElement(owner.id);

  return (
    <Button
      className={isInStore ? undefined : styles.NotInStore}
      onClick={() => (isInStore ? selectOwner(owner) : null)}
      title={`Up to ${owner.displayName || 'owner'}`}
    >
      <ButtonIcon type="previous" />
    </Button>
  );
}
