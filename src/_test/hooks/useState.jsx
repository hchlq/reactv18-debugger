import * as React from "react";
const App = () => {
  console.log("render");
  const [count, setCount] = React.useState(0);
  return <h1 onClick={() => setCount(1)}>{count}</h1>;
};

export default App;
