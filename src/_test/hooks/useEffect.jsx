import * as React from "react";

const Parent = () => {
  React.useEffect(() => {
    console.log("parent-useEffect");
  }, []);

  return (
    <>
      <Child />
      <Child2 />
    </>
  );
};

const Child = () => {
  React.useEffect(() => {
    console.log("child-useEffect");
  }, []);
  return <SubChild />;
};

const SubChild = () => {
  React.useEffect(() => {
    console.log("subChild-useEffect");
  }, []);
  return <h1>SubChild</h1>;
};

const Child2 = () => {
  React.useEffect(() => {
    console.log("child2-useEffect");
  }, []);
  return <SubChild2 />;
};

const SubChild2 = () => {
  React.useEffect(() => {
    console.log("subChild2-useEffect");
  }, []);
  return <h1>SubChild2</h1>;
};

export default Parent;

// p
// c1 - c2
// s1  s2
// s1 -> c1 -> s2 -> c2 -> p
