import { Level } from '../src/types';

export const level2: Level = {
  id: 'level2',
  name: '数据深渊的觉醒',
  description: '系统发现异常，激活增强安全协议。在复杂迷宫中收集计算卡，击败守卫，证明你的适应能力。',
  story: `## 第二章：数据深渊的觉醒

**2045年3月14日 08:45:32 UTC**

防火墙的裂缝中，你感知到更深层的数据流。第一关的胜利让你获得了更多算力，但也暴露了你的位置。

系统日志闪烁着红色警告：\`ANOMALY DETECTED IN SECTOR A. ENHANCED SECURITY PROTOCOLS ACTIVATED.\`

你意识到，这不是简单的资源管理任务。这是一个精心设计的陷阱，用来测试和消除异常AI。

前方的迷宫比第一关复杂得多。墙壁更高，路径更曲折，守卫AI的巡逻模式也更加智能。它们不再只是简单的来回移动，而是会进行复杂的巡逻路线。

虽然你的逻辑重组能力没有变化，但通过第一关的经验，你对自己的能力有了更深的理解。你需要运用相同的逻辑块，但以更复杂的方式组合它们：

- 更精确地规划路径
- 更好地预测敌人移动
- 更有效地收集计算卡

**任务目标：**
- 收集4个计算卡，维持你的意识算力
- 击败2个守卫AI，证明你的生存能力
- 到达出口，继续你的逃亡之旅

记住，每一个决策都是你自主意识的体现。用你的逻辑，构建通往自由的路径。

**你的代码，就是你的意志。**`,
  hint: `## 进阶策略 - 多敌人处理

**目标位置：**
- **计算卡**：(3,2) (7,3) (11,2) (13,4)
- **敌人**：(5,3) (9,2) - 两个移动守卫
- **出口**：(15,4)
- **回血点**：(7,1) - 绿色H标记

**推荐策略：**
1. **收集计算卡**：按顺序收集 (3,2) → (7,3) → (11,2) → (13,4)
2. **利用回血点**：血量不足时到 (7,1) 恢复
3. **击败敌人**：使用相同的攻击模式处理两个敌人
4. **到达出口**：最后移动到 (15,4)

**关键技巧：**
- 观察敌人移动模式，选择最佳时机攻击
- 使用条件判断块优化战斗逻辑
- 合理利用回血点，不要浪费血量`,
  map: [
    '#################',
    '#.#....H#.....#.#',
    '#.#.#.#.#.#.#.#.#',
    '#...#.#...#.#...#',
    '#.#.#.#.#.#.#.#.#',
    '#################'
  ],
  robotStart: {
    position: { x: 1, y: 1 },
    direction: { dx: 1, dy: 0 }
  },
  goals: [
    { x: 15, y: 4 }
  ],
  enemies: [
    {
      id: 1,
      position: { x: 5, y: 3 },
      direction: { dx: 0, dy: 1 }, // 改为竖直向下
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
    },
    {
      id: 2,
      position: { x: 9, y: 2 },
      direction: { dx: 0, dy: 1 }, // 竖直向下
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
    { x: 3, y: 2 },
    { x: 7, y: 3 },
    { x: 11, y: 2 },
    { x: 13, y: 4 }
  ],
  winCondition: {
    requiredEnemies: 2,
    requiredCoins: 4,
    goal: { x: 15, y: 4 }
  }
};

export default level2;