# 计划：九州洞府购买系统

## 需求

1. 玩家可以在九大州**主城**购买当地洞府
2. 价格根据州风险等级定：base 3000 灵石，safe/low/medium/high 各有系数
3. 状态视图中展示玩家所有已拥有的洞府列表
4. 每个州的洞府配有独特的风景/内饰描述（供 agent 理解氛围）
5. 保留出生州赠送免费洞府的设定
6. 当前 `residence` 字段改为 `activeResidence`（运行时快捷引用），新增 `residences` 数组存全部洞府
7. `isAtResidence` 改为"在任意已购洞府位置时均可执行 residence 动作"

## 风险等级 → 洞府价格

| risk   | 系数 | 价格 |
|--------|------|------|
| safe   | 1.0  | 3000 |
| low    | 1.2  | 3600 |
| medium | 1.5  | 4500 |
| high   | 2.0  | 6000 |

## 数据模型变更

### model.ts

```ts
// 新增
export interface ResidenceDefinition {
  readonly stateId: string;
  readonly locationId: LocationId; // 绑定到该州 main-city
  readonly name: string;           // 例如 "青岚洞府"
  readonly description: string;    // 风景/内饰提示词
}

// 扩展 Cultivator
interface Cultivator {
  residence: Residence;             // 保留，改为当前活跃洞府 (运行时可切换)
  residences: Residence[];          // 新增：所有已购洞府列表
}

// Residence 接口不变
```

### constants.ts / residence.ts

新增 `RESIDENCE_CATALOG`: 九州洞府定义及风景描述。  
新增 `RESIDENCE_PRICE_MULTIPLIER` 和 `residencePrice(stateId)` 计算价格函数。

## 新增动作

| actionId | 类型 | 条件 | 效果 |
|----------|------|------|------|
| `buy-residence:<stateId>` | immediate | 在该州主城、有足够灵石、尚未拥有 | 扣灵石、推入 residences、切换 activeResidence |

## 逻辑变更

1. **isAtResidence** → 检查 `cultivator.residences` 中是否有任何洞府的 locationId 等于 `cultivator.locationId`
2. **listAvailableActions** → 在主城交易点增加 `buy-residence:<stateId>` 动作（未拥有时）
3. **performAction** → 新增 `buy-residence:` 分支处理
4. **getCultivatorState** → 在返回视图中追加 `residences` 和 `activeResidence` 字段
5. **defaultResidenceAt** → 同时推入 `residences` 数组
6. **hydrate/persist** → 确保 `residences` 数组在序列化/反序列化时保留

## 实施顺序

1. 在 residence.ts 新增洞府目录和价格函数
2. model.ts 扩展 Cultivator 增加 residences 字段
3. engine.ts 的 isAtResidence / listAvailableActions / performAction / getCultivatorState 改动
4. seed.ts 的 createCultivator 初始化 residences
5. 测试
6. 验证构建
