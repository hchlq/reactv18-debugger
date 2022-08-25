/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import {findGitHubIssue} from './cache';
import UpdateExistingIssue from './UpdateExistingIssue';
import ReportNewIssue from './ReportNewIssue';
import WorkplaceGroup from './WorkplaceGroup';

export default function SuspendingErrorView({
  callStack,
  componentStack,
  errorMessage,
}) {
  const maybeItem =
    errorMessage !== null ? findGitHubIssue(errorMessage) : null;

  let GitHubUI;
  if (maybeItem != null) {
    GitHubUI = <UpdateExistingIssue gitHubIssue={maybeItem} />;
  } else {
    GitHubUI = (
      <ReportNewIssue
        callStack={callStack}
        componentStack={componentStack}
        errorMessage={errorMessage}
      />
    );
  }

  return (
    <>
      {GitHubUI}
      <WorkplaceGroup />
    </>
  );
}
