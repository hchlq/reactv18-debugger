import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root"), {
    unstable_concurrentUpdatesByDefault: true
}).render(<App />);



// import './test/scheduler/interruptLowerPrior'
