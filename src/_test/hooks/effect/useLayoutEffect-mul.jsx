import * as React from "react";

const Parent = () => {
  const [count, setCount] = React.useState()
  React.useLayoutEffect(() => {
    return () => {
      console.log("parent-useLayoutEffect");
    }
  }, [Math.random()]);

  React.useEffect(() => {
    setCount(count + 2)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Child />
      <Child2 />
    </>
  );
};

const Child = () => {
  React.useLayoutEffect(() => {
    return () => {
      console.log("child-useLayoutEffect");
    }
  }, [Math.random()]);
  return <SubChild />;
};

const SubChild = () => {
  React.useLayoutEffect(() => {
    return () => {
      console.log("subChild-useLayoutEffect");
    }
  }, [Math.random()]);
  return <h1>SubChild</h1>;
};

const Child2 = () => {
  React.useLayoutEffect(() => {
    return () => {
      console.log("child2-useLayoutEffect");
    }
  }, [Math.random()]);
  return <SubChild2 />;
};

const SubChild2 = () => {
  React.useLayoutEffect(() => {
    return () => {
      console.log("subChild2-useLayoutEffect");
    }
  }, [Math.random()]);
  return <h1>SubChild2</h1>;
};

export default Parent;

// p
// c1 - c2
// s1  s2
// s1 -> c1 -> s2 -> c2 -> p
