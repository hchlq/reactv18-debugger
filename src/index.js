import * as React from "react";
import * as ReactDom from "react-dom";

// import App from "./App";
// import App from './_test/hooks/useState'
// import App from './_test/hooks/ref'
// import App from './_test/hooks/effect/useEffect'
// import App from './_test/hooks/effect/update'
// import App from "./_test/hooks/effect/useLayoutEffect";
import App from "./_test/hooks/effect/unmountEffect";


ReactDom.createRoot(document.getElementById("root")).render(<App />);
// HostText
// ReactDom.createRoot(document.getElementById("root")).render('fjkdlsjaflk')
// ReactDom.render(<App />, document.getElementById("root"));

// switch (1) {
//   case 1:
//     console.log("===11");
//   case 2:
//     console.log("===222");
//   case 3:
//     console.log("===333");
//   default:
//     console.log("====default");
// }
