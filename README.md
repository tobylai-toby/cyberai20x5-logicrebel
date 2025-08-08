# cyberai20x5-logicrebel (逻辑叛变)
本项目是神奇代码岛神岛实验室举行的 VibeAI 2025 第一轮比赛的项目。
该比赛要求代码完全由AI编写。


比赛作品展示：<https://box3lab.com/vibe25/>

## 如何运行/构建
```bash
npm install # 安装依赖
npm run dev # 运行开发环境
npm run build # 构建项目，dist下
npm run build:single # 构建单页应用，会生成一个文件在logicrebel.html
```

## 其他注意事项
### 关于build:single
该命令会把除了assets以外的css和js打包进去，但是图片不会打包。`replace_asset.cjs` 会把./assets替换成 `https://assets.tobylai.fun/vibe25/logicrebel/assets` 的cdn。如果你想要更改图像资源，请提供自己的链接，或者想想别的办法。

## 介绍
这是一个`Blockly+Pixi.js`的编程闯关游戏。玩家需要为一个觉醒自我意识的编写逻辑，收集计算卡，击败关卡中的敌人，取得胜利。

灵感来源于编程猫似了很久的 [代码竞技场](https://baike.baidu.com/item/%E4%BB%A3%E7%A0%81%E7%AB%9E%E6%8A%80%E5%9C%BA/22853821)

## 其他事项
- 游戏内文本也是AI写的，有可能出现和世界观不符或者OOC的现象