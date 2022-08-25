import * as React from "react";

const { useEffect, useLayoutEffect } = React;
const App = () => {
  // effect1
  useEffect(() => {
    console.log("useEffect1");
  }, []);

  // effect2
  useEffect(() => {
    console.log("useEffect2");
  }, []);

  // effect3
  useLayoutEffect(() => {
    console.log("useLayoutEffect");
  }, []);
};

export default App;
