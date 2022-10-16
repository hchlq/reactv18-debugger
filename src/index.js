// import * as React from "react";
// import * as ReactDOM from "react-dom/client";
// import App from "./App";
//
// ReactDOM.createRoot(document.getElementById("root")).render(<App />);

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Scheduler  from "scheduler";

const {
    unstable_scheduleCallback,
    unstable_NormalPriority,
    unstable_ImmediatePriority
} = Scheduler

const sleep = ms => {
    const current = Date.now();
    while (Date.now() - current < ms) {}
};

unstable_scheduleCallback(unstable_ImmediatePriority, () => {
    console.log("ImmediatePriority");
});

function App() {
    return (
        <div className="App">
            <h1>Scheduler</h1>
        </div>
    );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
