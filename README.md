# 坦克大战 · TANK BATTLE

经典街机风格的网页版坦克大战，使用 **TypeScript + Vite + Canvas** 实现，模块化、强类型，开发体验更佳。

## 玩法

- **方向键 / WASD**：移动
- **空格 / J**：开火
- **P**：暂停
- **Enter**：开始 / 重新开始

击毁所有敌方坦克即可过关，保护好底部的基地，子弹打光生命或基地被摧毁则游戏结束。

## 特性

- 13×13 网格地图：砖墙、钢墙、草地、基地
- 敌方坦克 AI 与定时刷怪、逐关推进
- 子弹可对冲抵消
- 基地双层加固并带耐久
- 坦克自动车道居中，转弯顺畅不卡墙
- 经典街机 HUD：关卡 / 得分 / 生命 / 剩余敌军

## 开发

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器 (热更新)
npm run build    # 类型检查 + 生产构建到 dist/
npm run preview  # 本地预览构建产物
npm run typecheck # 仅类型检查
```

## 项目结构

```
index.html          页面结构与街机外壳
src/
  main.ts           入口
  game.ts           游戏主循环与状态机
  map.ts            地图加载与碰撞查询
  renderer.ts       Canvas 绘制
  input.ts          键盘输入
  ui.ts             HUD 与遮罩层
  constants.ts      常量、方向、瓦片枚举
  types.ts          实体类型定义
  style.css         街机风格样式
```
