import * as Scheduler from "scheduler";

const {
    unstable_scheduleCallback,
    unstable_NormalPriority,
    unstable_ImmediatePriority,
    unstable_shouldYield,
} = Scheduler

const sleep = ms => {
    const current = Date.now();
    while (Date.now() - current < ms) {}
};

let lock = false


const work = () => {
    console.log('调度 normal_priority')

    // 模拟循环的工作
    if (!lock) {
        sleep(7)
        lock = true
    }

    if (unstable_shouldYield()) {
        console.log('让出给主线程执行')
        return work
    }


    console.log('normal_priority done')
}

unstable_scheduleCallback(unstable_NormalPriority, work)

// 在 3ms 之后插入一个高优先级的任务
setTimeout(() => {
    console.log('调度 ImmediatePriority')
    unstable_scheduleCallback(unstable_ImmediatePriority, () => {
        console.log("ImmediatePriority done ");
    });
}, 3)