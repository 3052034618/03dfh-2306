export type Qualification = 'eye_nose' | 'laser' | 'injection' | 'anesthesia'

export type AssistantStatus = 'idle' | 'busy' | 'break' | 'leave'

export type RoomType = 'operating' | 'laser' | 'injection'

export type RoomStatus = 'idle' | 'preparing' | 'in_progress' | 'handover'

export type ProgressStage = 'preparing' | 'arrived' | 'anesthesia_done' | 'doctor_in' | 'operating' | 'handover'

export type ConsumableStatus = 'safe' | 'warning' | 'out_of_stock'

export type ProjectCategory = 'eye_nose' | 'laser' | 'injection'

export interface Doctor {
  id: string
  name: string
  title: string
  avatar: string
  department: string
}

export interface Assistant {
  id: string
  name: string
  avatar: string
  status: AssistantStatus
  qualifications: Qualification[]
  department: string
}

export interface Room {
  id: string
  name: string
  type: RoomType
  status: RoomStatus
}

export interface Schedule {
  id: string
  doctorId: string
  roomId: string
  assistantIds: string[]
  customerName: string
  projectId: string
  date: string
  startTime: string
  endTime: string
  progress: ProgressStage
  delayReason?: string
  isOvertime: boolean
  isSwapped: boolean
  anomalyNotes: string[]
}

export interface Project {
  id: string
  name: string
  category: ProjectCategory
  requiredQualifications: Qualification[]
  estimatedDuration: number
  consumableIds: string[]
}

export interface Consumable {
  id: string
  name: string
  stock: number
  threshold: number
  unit: string
  status: ConsumableStatus
}

export interface Notification {
  id: string
  type: 'assignment' | 'delay' | 'consumable' | 'dispatch'
  message: string
  targetId: string
  timestamp: string
  read: boolean
}

export const QUALIFICATION_LABELS: Record<Qualification, string> = {
  eye_nose: '眼鼻手术',
  laser: '光电',
  injection: '注射',
  anesthesia: '麻醉',
}

export const PROGRESS_LABELS: Record<ProgressStage, string> = {
  preparing: '术前准备',
  arrived: '顾客到院',
  anesthesia_done: '麻醉完成',
  doctor_in: '医生入场',
  operating: '手术中',
  handover: '术后交接',
}

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  idle: '空闲',
  preparing: '准备中',
  in_progress: '手术中',
  handover: '术后交接',
}

export const ASSISTANT_STATUS_LABELS: Record<AssistantStatus, string> = {
  idle: '空闲',
  busy: '跟台中',
  break: '休息',
  leave: '请假',
}

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  eye_nose: '眼鼻手术',
  laser: '光电',
  injection: '注射',
}

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  operating: '手术室',
  laser: '光电室',
  injection: '注射室',
}
