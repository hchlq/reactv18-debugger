import * as React from "react";
const { useState } = React;

export default function App() {
  const [text, reset] = useState("foo");
  return (
    <h1 onClick={() => reset(Math.random().toString())}>
      {text === "foo" ? text : <h2>00000</h2>}
    </h1>
  );
}
