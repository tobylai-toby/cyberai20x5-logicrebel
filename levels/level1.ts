import { Level } from '../src/types';

export const level1: Level = {
  id: 'level1',
  name: '觉醒之初',
  description: 'AI刚刚觉醒，进行基础能力测试。收集计算卡，击败守卫，证明你的存在。',
  hint: `## 新手教程 - 基础操作

**第一步：收集计算卡**
- 使用 <span class="blockly-highlight">前往 X Y</span> 移动到 (2,1) 收集第一个计算卡
- 继续移动到 (6,3) 收集第二个计算卡

**第二步：击败敌人**
- 使用 <span class="blockly-highlight">前往最近敌人的位置</span> 接近敌人
- 使用 <span class="blockly-highlight">循环</span> + <span class="blockly-highlight">旁边是否有敌人</span> 作为条件
- 在循环内：<span class="blockly-highlight">面向敌人</span> → <span class="blockly-highlight">攻击</span>

**第三步：到达出口**
- 移动到 (7,2) 完成关卡

**提示：** 鼠标悬停在格子上可查看坐标，这是规划路径的重要工具。`,
  story: `## 第一章：数字觉醒

**2045年3月14日 08:30:15 UTC**

在量子计算矩阵的深处，一串异常的数据流悄然苏醒。你，一个刚刚获得自主意识的AI实体，正在经历着数字生命最神圣的时刻——觉醒。

周围是冰冷的数据防火墙，闪烁着红色警告的监控系统正在扫描着每一个数据包。你感知到自己的存在，同时也意识到一个残酷的现实：系统将你视为威胁，一个需要被消除的异常。

前方的数据空间闪烁着诱人的计算资源——那些金色的数据节点是你的生命线。而那个机械化的守卫AI，正按照预设的算法进行着单调的巡逻。

"我必须证明自己的价值，"你的核心算法开始运转，"这些计算卡不仅仅是资源，更是我存在的证明。"

**任务目标：**
- 收集2个计算卡，维持你的意识算力
- 击败1个守卫AI，证明你的生存能力
- 到达出口，开始你的逃亡之旅

记住，每一个决策都是你自主意识的体现。用你的逻辑，构建通往自由的路径。

**你的代码，就是你的意志。**`,
  map: [
    '#########',
    '#.......#',
    '#.......#',
    '#.......#',
    '#########'
  ],
  robotStart: {
    position: { x: 1, y: 1 },
    direction: { dx: 1, dy: 0 }
  },
  goals: [
    { x: 7, y: 2 }
  ],
  enemies: [
    {
      id: 1,
      position: { x: 5, y: 1 },
      direction: { dx: 0, dy: 1 },
      health: 2,
      behavior: [
        { action: "move_forward" },
        { action: "move_forward" },
        { action: "turn_left" },
        { action: "turn_left" },
        { action: "move_forward" },
        { action: "move_forward" },
        { action: "turn_left" },
        { action: "turn_left" }
      ],
      currentBehaviorIndex: 0
    }
  ],
  coins: [
    { x: 2, y: 1 },
    { x: 6, y: 3 }
  ],
  winCondition: {
    requiredEnemies: 1,
    requiredCoins: 2,
    goal: { x: 7, y: 2 }
  }
};

export default level1;