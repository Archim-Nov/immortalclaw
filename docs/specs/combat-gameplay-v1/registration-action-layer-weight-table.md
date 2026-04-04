# 战斗注册标签动作层偏好权重表

## Summary

本文用于承接 `combat-gameplay-v1` 的动作层评分器，定义 `core_temperament` 与 `behavior_aspect` 如何映射到 `basic_attack / core_skill / escape` 的偏好权重。

本文是路线权重表 `registration-action-weight-table.md` 的动作层伴生文档。两者必须分开维护，以防路线倾向与动作倾向混淆。

## 1. 权重边界

- `core_temperament` 权重范围：`-2 ~ +2`
- `behavior_aspect` 权重范围：`-1 ~ +1`
- 权重用于 `ActionScore` 公式中的 `registrationActionBias` 项。

## 2. 核心心性动作权重表 (Core Temperament)

| ID | `basic_attack` | `core_skill` | `escape` |
| --- | --- | --- | --- |
| `shou_jie` (守戒) | `0` | `-1` | `+1` |
| `duan_feng` (断锋) | `0` | `+2` | `-2` |
| `fu_sheng` (扶生) | `0` | `-1` | `+1` |
| `xiang_rong` (向荣) | `0` | `0` | `0` |
| `qian_yuan` (潜渊) | `0` | `+1` | `0` |
| `guan_lan` (观澜) | `0` | `-1` | `+1` |
| `chi_xin` (炽心) | `0` | `+1` | `-1` |
| `zheng_sheng` (争胜) | `0` | `+2` | `-2` |
| `zhen_yue` (镇岳) | `0` | `0` | `0` |
| `shou_cheng` (守成) | `0` | `-1` | `+1` |

## 3. 行事相动作权重表 (Behavior Aspect)

| ID | `basic_attack` | `core_skill` | `escape` |
| --- | --- | --- | --- |
| `metal` (金/裁断) | `0` | `+1` | `0` |
| `wood` (木/生发) | `0` | `0` | `0` |
| `water` (水/观势) | `0` | `-1` | `+1` |
| `fire` (火/烈行) | `0` | `+1` | `-1` |
| `earth` (土/镇持) | `0` | `-1` | `+1` |
| `metal-wood` (砺生) | `0` | `0` | `0` |
| `metal-water` (冷鉴) | `0` | `-1` | `+1` |
| `metal-fire` (烈锋) | `0` | `+1` | `-1` |
| `metal-earth` (守序) | `0` | `0` | `0` |
| `wood-water` (润悟) | `0` | `-1` | `+1` |
| `wood-fire` (荣焰) | `0` | `+1` | `-1` |
| `wood-earth` (厚培) | `0` | `0` | `0` |
| `water-fire` (潜燃) | `0` | `+1` | `0` |
| `water-earth` (潜守) | `0` | `-1` | `+1` |
| `fire-earth` (炽垒) | `0` | `+1` | `0` |

## 4. 运行时规则

- 动作评分必须使用本表，不得复用路线权重表。
- 评分公式详见 `docs/specs/combat-gameplay-v1/spec.md`。
- 评分后取 Top 2 进行加权抽样。
