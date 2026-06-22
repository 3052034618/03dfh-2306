import type { Doctor, Assistant, Room, Schedule, Project, Consumable, Notification } from '@/types'

export const mockDoctors: Doctor[] = [
  { id: 'd1', name: '王思远', title: '主任医师', avatar: '', department: '整形外科' },
  { id: 'd2', name: '李明华', title: '副主任医师', avatar: '', department: '皮肤科' },
  { id: 'd3', name: '陈雅琪', title: '主任医师', avatar: '', department: '整形外科' },
  { id: 'd4', name: '张伟东', title: '主治医师', avatar: '', department: '皮肤科' },
  { id: 'd5', name: '刘婉清', title: '副主任医师', avatar: '', department: '微创美容' },
]

export const mockAssistants: Assistant[] = [
  { id: 'a1', name: '赵小敏', avatar: '', status: 'idle', qualifications: ['eye_nose', 'anesthesia'], department: '整形外科' },
  { id: 'a2', name: '钱丽华', avatar: '', status: 'busy', qualifications: ['laser', 'injection'], department: '皮肤科' },
  { id: 'a3', name: '孙婷婷', avatar: '', status: 'idle', qualifications: ['eye_nose'], department: '整形外科' },
  { id: 'a4', name: '周文静', avatar: '', status: 'busy', qualifications: ['injection'], department: '微创美容' },
  { id: 'a5', name: '吴佳琪', avatar: '', status: 'idle', qualifications: ['laser'], department: '皮肤科' },
  { id: 'a6', name: '郑美玲', avatar: '', status: 'break', qualifications: ['eye_nose', 'injection'], department: '整形外科' },
  { id: 'a7', name: '王小红', avatar: '', status: 'idle', qualifications: ['anesthesia'], department: '麻醉科' },
  { id: 'a8', name: '冯晓芳', avatar: '', status: 'leave', qualifications: ['laser', 'injection'], department: '皮肤科' },
  { id: 'a9', name: '陈小琴', avatar: '', status: 'busy', qualifications: ['eye_nose', 'anesthesia'], department: '整形外科' },
  { id: 'a10', name: '杨秀兰', avatar: '', status: 'idle', qualifications: ['injection', 'laser'], department: '微创美容' },
]

export const mockRooms: Room[] = [
  { id: 'r1', name: '手术室1', type: 'operating', status: 'in_progress' },
  { id: 'r2', name: '手术室2', type: 'operating', status: 'preparing' },
  { id: 'r3', name: '光电室1', type: 'laser', status: 'in_progress' },
  { id: 'r4', name: '光电室2', type: 'laser', status: 'idle' },
  { id: 'r5', name: '注射室1', type: 'injection', status: 'handover' },
  { id: 'r6', name: '注射室2', type: 'injection', status: 'idle' },
  { id: 'r7', name: '手术室3', type: 'operating', status: 'idle' },
  { id: 'r8', name: 'VIP手术室', type: 'operating', status: 'in_progress' },
]

export const mockProjects: Project[] = [
  { id: 'p1', name: '双眼皮成形术', category: 'eye_nose', requiredQualifications: ['eye_nose', 'anesthesia'], estimatedDuration: 120, consumableIds: ['c1', 'c2', 'c5'] },
  { id: 'p2', name: '鼻综合塑形', category: 'eye_nose', requiredQualifications: ['eye_nose', 'anesthesia'], estimatedDuration: 180, consumableIds: ['c1', 'c3', 'c5'] },
  { id: 'p3', name: '热玛吉紧致', category: 'laser', requiredQualifications: ['laser'], estimatedDuration: 60, consumableIds: ['c4', 'c6'] },
  { id: 'p4', name: '皮秒祛斑', category: 'laser', requiredQualifications: ['laser'], estimatedDuration: 45, consumableIds: ['c4', 'c7'] },
  { id: 'p5', name: '玻尿酸填充', category: 'injection', requiredQualifications: ['injection'], estimatedDuration: 30, consumableIds: ['c8', 'c9'] },
  { id: 'p6', name: '肉毒素瘦脸', category: 'injection', requiredQualifications: ['injection'], estimatedDuration: 20, consumableIds: ['c10'] },
  { id: 'p7', name: '眼袋去除术', category: 'eye_nose', requiredQualifications: ['eye_nose', 'anesthesia'], estimatedDuration: 90, consumableIds: ['c1', 'c2'] },
  { id: 'p8', name: '光子嫩肤', category: 'laser', requiredQualifications: ['laser'], estimatedDuration: 40, consumableIds: ['c4', 'c6'] },
]

export const mockConsumables: Consumable[] = [
  { id: 'c1', name: '可吸收缝线', stock: 45, threshold: 20, unit: '包', status: 'safe' },
  { id: 'c2', name: '手术刀片', stock: 18, threshold: 20, unit: '片', status: 'warning' },
  { id: 'c3', name: '鼻假体', stock: 5, threshold: 8, unit: '个', status: 'warning' },
  { id: 'c4', name: '冷凝胶', stock: 30, threshold: 15, unit: '瓶', status: 'safe' },
  { id: 'c5', name: '麻醉药(利多卡因)', stock: 3, threshold: 10, unit: '支', status: 'out_of_stock' },
  { id: 'c6', name: '耦合剂', stock: 22, threshold: 10, unit: '瓶', status: 'safe' },
  { id: 'c7', name: '皮秒探头', stock: 8, threshold: 5, unit: '个', status: 'safe' },
  { id: 'c8', name: '玻尿酸(大分子)', stock: 6, threshold: 8, unit: '支', status: 'warning' },
  { id: 'c9', name: '玻尿酸(小分子)', stock: 12, threshold: 8, unit: '支', status: 'safe' },
  { id: 'c10', name: '肉毒素', stock: 2, threshold: 5, unit: '瓶', status: 'out_of_stock' },
  { id: 'c11', name: '纱布敷料', stock: 50, threshold: 20, unit: '包', status: 'safe' },
  { id: 'c12', name: '碘伏消毒液', stock: 15, threshold: 10, unit: '瓶', status: 'safe' },
]

const today = new Date().toISOString().split('T')[0]

export const mockSchedules: Schedule[] = [
  { id: 's1', doctorId: 'd1', roomId: 'r1', assistantIds: ['a1', 'a9'], customerName: '张女士', projectId: 'p1', date: today, startTime: '09:00', endTime: '11:00', progress: 'operating', isOvertime: false, isSwapped: false, anomalyNotes: [] },
  { id: 's2', doctorId: 'd2', roomId: 'r3', assistantIds: ['a2'], customerName: '李女士', projectId: 'p3', date: today, startTime: '09:30', endTime: '10:30', progress: 'operating', isOvertime: false, isSwapped: false, anomalyNotes: [] },
  { id: 's3', doctorId: 'd3', roomId: 'r8', assistantIds: ['a3', 'a7'], customerName: '王先生', projectId: 'p2', date: today, startTime: '10:00', endTime: '13:00', progress: 'anesthesia_done', delayReason: '顾客迟到15分钟', isOvertime: false, isSwapped: false, anomalyNotes: ['顾客迟到'] },
  { id: 's4', doctorId: 'd5', roomId: 'r5', assistantIds: ['a4'], customerName: '赵女士', projectId: 'p5', date: today, startTime: '10:00', endTime: '10:30', progress: 'handover', isOvertime: false, isSwapped: false, anomalyNotes: [] },
  { id: 's5', doctorId: 'd4', roomId: 'r2', assistantIds: ['a5'], customerName: '孙女士', projectId: 'p4', date: today, startTime: '11:00', endTime: '11:45', progress: 'preparing', isOvertime: false, isSwapped: false, anomalyNotes: [] },
  { id: 's6', doctorId: 'd1', roomId: 'r1', assistantIds: ['a1'], customerName: '刘先生', projectId: 'p7', date: today, startTime: '14:00', endTime: '15:30', progress: 'preparing', isOvertime: false, isSwapped: false, anomalyNotes: [] },
  { id: 's7', doctorId: 'd3', roomId: 'r7', assistantIds: ['a6', 'a7'], customerName: '陈女士', projectId: 'p1', date: today, startTime: '14:30', endTime: '16:30', progress: 'preparing', isOvertime: false, isSwapped: true, anomalyNotes: ['临时换台：原排郑美玲换赵小敏'] },
  { id: 's8', doctorId: 'd2', roomId: 'r3', assistantIds: ['a5'], customerName: '周女士', projectId: 'p8', date: today, startTime: '14:00', endTime: '14:40', progress: 'preparing', isOvertime: false, isSwapped: false, anomalyNotes: [] },
  { id: 's9', doctorId: 'd5', roomId: 'r6', assistantIds: ['a10'], customerName: '吴女士', projectId: 'p6', date: today, startTime: '15:00', endTime: '15:20', progress: 'preparing', isOvertime: false, isSwapped: false, anomalyNotes: [] },
]

export const mockNotifications: Notification[] = [
  { id: 'n1', type: 'assignment', message: '您已被安排跟台：王思远医生-双眼皮成形术，09:00-11:00，手术室1', targetId: 'a1', timestamp: `${today}T08:30:00`, read: true },
  { id: 'n2', type: 'delay', message: '手术室2 陈雅琪医生台次延误：顾客迟到15分钟', targetId: 'a3', timestamp: `${today}T10:15:00`, read: false },
  { id: 'n3', type: 'consumable', message: '麻醉药(利多卡因)库存不足，仅剩3支，请尽快补货', targetId: '', timestamp: `${today}T08:00:00`, read: false },
  { id: 'n4', type: 'dispatch', message: '您已被调派支援：VIP手术室 鼻综合塑形', targetId: 'a7', timestamp: `${today}T09:45:00`, read: true },
]
