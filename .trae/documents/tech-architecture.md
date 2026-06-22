## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        A["React 18 + TypeScript"]
        B["Zustand 状态管理"]
        C["React Router DOM 路由"]
        D["Tailwind CSS 样式"]
        E["Lucide React 图标"]
        F["@dnd-kit 拖拽"]
        G["Recharts 图表"]
    end
    subgraph "数据层"
        H["Mock 数据 + LocalStorage 持久化"]
    end
    A --> B
    A --> C
    A --> D
    A --> E
    A --> F
    A --> G
    B --> H
```

## 2. 技术说明
- **前端**：React@18 + TypeScript + Tailwind CSS@3 + Vite
- **初始化工具**：vite-init
- **后端**：无（纯前端项目，使用 Mock 数据）
- **数据库**：无（使用 LocalStorage 做数据持久化）
- **状态管理**：Zustand
- **路由**：React Router DOM v6
- **拖拽**：@dnd-kit/core + @dnd-kit/sortable
- **图表**：Recharts
- **图标**：lucide-react
- **日期处理**：date-fns

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 重定向到 /calendar |
| /calendar | 排班日历页面 |
| /rooms | 房间看板页面 |
| /staff | 人员状态页面 |
| /consumables | 耗材预警页面 |
| /review | 复盘统计页面 |

## 4. API 定义
纯前端项目，无后端 API。所有数据通过 Mock 数据初始化，存储在 Zustand store 中，使用 LocalStorage 持久化。

## 5. 服务端架构图
不适用（纯前端项目）

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "Doctor" {
        string id PK
        string name
        string title
        string avatar
        string department
    }
    "Assistant" {
        string id PK
        string name
        string avatar
        string status
        string[] qualifications
        string department
    }
    "Room" {
        string id PK
        string name
        string type
        string status
    }
    "Schedule" {
        string id PK
        string doctorId FK
        string roomId FK
        string[] assistantIds FK
        string customerName
        string projectId FK
        string date
        string startTime
        string endTime
        string progress
        string delayReason
    }
    "Project" {
        string id PK
        string name
        string category
        string[] requiredQualifications
        number estimatedDuration
        string[] consumableIds
    }
    "Consumable" {
        string id PK
        string name
        number stock
        number threshold
        string unit
        string status
    }
    "Doctor" ||--o{ "Schedule" : "出诊"
    "Room" ||--o{ "Schedule" : "占用"
    "Assistant" }o--o{ "Schedule" : "跟台"
    "Project" ||--o{ "Schedule" : "预约"
    "Project" }o--o{ "Consumable" : "关联"
```

### 6.2 数据定义语言

**Doctor（医生）**
```typescript
interface Doctor {
  id: string;
  name: string;
  title: string;
  avatar: string;
  department: string;
}
```

**Assistant（医助/护士）**
```typescript
interface Assistant {
  id: string;
  name: string;
  avatar: string;
  status: 'idle' | 'busy' | 'break' | 'leave';
  qualifications: ('eye_nose' | 'laser' | 'injection' | 'anesthesia')[];
  department: string;
}
```

**Room（治疗间）**
```typescript
interface Room {
  id: string;
  name: string;
  type: 'operating' | 'laser' | 'injection';
  status: 'idle' | 'preparing' | 'in_progress' | 'handover';
}
```

**Schedule（排班/台次）**
```typescript
interface Schedule {
  id: string;
  doctorId: string;
  roomId: string;
  assistantIds: string[];
  customerName: string;
  projectId: string;
  date: string;
  startTime: string;
  endTime: string;
  progress: 'preparing' | 'arrived' | 'anesthesia_done' | 'doctor_in' | 'operating' | 'handover';
  delayReason?: string;
  isOvertime: boolean;
  isSwapped: boolean;
  anomalyNotes: string[];
}
```

**Project（项目）**
```typescript
interface Project {
  id: string;
  name: string;
  category: 'eye_nose' | 'laser' | 'injection';
  requiredQualifications: ('eye_nose' | 'laser' | 'injection' | 'anesthesia')[];
  estimatedDuration: number;
  consumableIds: string[];
}
```

**Consumable（耗材）**
```typescript
interface Consumable {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  unit: string;
  status: 'safe' | 'warning' | 'out_of_stock';
}
```
