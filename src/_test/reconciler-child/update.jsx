import * as React from "react";

export default function App() {
  const [visible, setVisible] = React.useState(true);
  const arr = [<div key="d1">1</div>, <div key="d2">2</div>];
  const element = (
    <div>
      <h1 key="h1">h1</h1>
      <h2 key="h2">h2</h2>
      <h3 key="h3" onClick={() => setVisible(!visible)}>
        h3
      </h3>
      {arr}
    </div>
  );
  const element2 = (
    <div>
      <h1 key="h9">h1</h1>
      <h2 key="h2">h2</h2>
      <h3 key="h3" onClick={() => setVisible(!visible)}>
        h3
      </h3>
      {arr}
    </div>
  );

  return visible ? element : element2;
}
