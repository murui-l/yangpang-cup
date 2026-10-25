# 杨胖杯制作资料

保存杨胖杯已完成成图、六支队伍的当前队标、比分配置和制作源文件。交付图片在 `outputs/`，可复用资料在 `yangpang/`。

## 已完成内容

- 波喵 VS 寒岛：九局战报，146 : 144。
- 不知豆队 VS 虾头路障：九局战报，139 : 146，左队使用秋裤透明队标，当前成图为 v3。
- 杨胖杯 2v 均分榜：白鸽天行体版本，使用“小岛”，总均分 7.99。
- 宇宙胖猴：暗号、大胖子；宇航员胖猴、行星环队标。
- 爱康tv：郑文康、小爱莉；用户指定动漫人物及 ZmjjKK 上下交错手势队标。

## 目录

- `outputs/`：当前版本的 PNG、JPG 和制作记录。
- `outputs/杨胖杯_队标/`：两张新增透明队标、阵容和完整生成提示词。
- `yangpang/teams.json`：当前六队登记，后续以用户最新阵容为准。
- `yangpang/matches/`：两场九局比分，保留各场当时显示名。
- `yangpang/average-ranking/`：均分榜渲染脚本、固定数据、背景及用户提供字体。
- `yangpang/qqspeed-battle-report/`：现有战报技能的项目快照，含六枚当前队标、模板及渲染脚本。

## 数据范围

用户已确认此前以“赛程总览，总比分情况”制作的六张数据图属于**帕斯杯**，包括早期误用杨胖杯文件名的深蓝银白版。因此 `work/yangpang-data/`、六张数据图、预览和压缩包均不纳入本仓库。原文件保留在工作区。

历史比赛与均分榜的选手显示名按当时输入保存；不把新队伍阵容反向覆盖到旧成绩。

## 本地重制

战报使用 Node.js、Playwright、Sharp 和 Chrome/Edge。地图库仍在 `E:/qq飞车地图`，其 45 张地图是共享素材，未重复打包入仓库。运行方法见 `yangpang/qqspeed-battle-report/references/workflow.md`；配置中的队标路径已改为仓库相对路径。

均分榜运行 `node yangpang/average-ranking/build-ranking.cjs`。依赖可由本地安装或 `QQSPEED_NODE_MODULES` 指定；浏览器可通过 `QQSPEED_BROWSER` 指定。已保存背景优先使用，输出会采用新文件名，保护当前成图。

生成队标使用内置 imagegen；最终提示词见 `outputs/杨胖杯_队标/队伍登记与设计记录.json`，其他素材出处见各制作记录。
