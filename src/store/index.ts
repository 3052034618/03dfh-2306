import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Doctor,
  Assistant,
  Room,
  Schedule,
  Project,
  Consumable,
  Notification,
  ProgressStage,
  AssistantStatus,
  RoomStatus,
  HandoverItemKey,
  HandoverItems,
} from '@/types'
import { mockDoctors, mockAssistants, mockRooms, mockSchedules, mockProjects, mockConsumables, mockNotifications } from '@/data/mock'

function progressToRoomStatus(progress: ProgressStage): RoomStatus {
  if (progress === 'handover') return 'handover'
  if (progress === 'operating' || progress === 'doctor_in') return 'in_progress'
  return 'preparing'
}

function isScheduleActive(s: Schedule): boolean {
  return s.progress !== 'handover' || (s.progress === 'handover' && !s.handoverCompletedAt)
}

function reconcileState(
  schedules: Schedule[],
  assistants: Assistant[],
  rooms: Room[]
): { assistants: Assistant[]; rooms: Room[] } {
  const today = new Date().toISOString().split('T')[0]
  const activeSchedules = schedules.filter((s) => s.date === today && isScheduleActive(s))

  const busyAssistantIds = new Set<string>()
  const roomActiveMap = new Map<string, Schedule>()

  activeSchedules.forEach((s) => {
    s.assistantIds.forEach((id) => busyAssistantIds.add(id))
    const existing = roomActiveMap.get(s.roomId)
    if (!existing || (s.progress !== 'handover' && existing.progress === 'handover')) {
      roomActiveMap.set(s.roomId, s)
    }
  })

  const reconciledAssistants = assistants.map((a) => {
    if (a.status === 'leave') return a
    const shouldBeBusy = busyAssistantIds.has(a.id)
    if (shouldBeBusy && a.status !== 'busy') {
      return { ...a, status: 'busy' as AssistantStatus }
    }
    if (!shouldBeBusy && a.status === 'busy') {
      return { ...a, status: 'idle' as AssistantStatus }
    }
    return a
  })

  const reconciledRooms = rooms.map((r) => {
    const active = roomActiveMap.get(r.id)
    if (active) {
      const targetStatus = progressToRoomStatus(active.progress)
      if (r.status !== targetStatus) return { ...r, status: targetStatus }
    } else if (r.status !== 'idle') {
      return { ...r, status: 'idle' as RoomStatus }
    }
    return r
  })

  return { assistants: reconciledAssistants, rooms: reconciledRooms }
}

interface AppState {
  doctors: Doctor[]
  assistants: Assistant[]
  rooms: Room[]
  schedules: Schedule[]
  projects: Project[]
  consumables: Consumable[]
  notifications: Notification[]

  addSchedule: (schedule: Schedule) => void
  updateSchedule: (id: string, data: Partial<Schedule>) => void
  deleteSchedule: (id: string) => void
  updateScheduleProgress: (id: string, progress: ProgressStage) => void
  reportDelay: (id: string, reason: string) => void
  toggleHandoverItem: (id: string, item: HandoverItemKey, value?: boolean | string) => void
  completeHandover: (id: string) => void

  updateAssistantStatus: (id: string, status: AssistantStatus) => void
  assignAssistant: (scheduleId: string, assistantId: string) => void
  removeAssistant: (scheduleId: string, assistantId: string) => void
  dispatchSupport: (scheduleId: string, assistantId: string) => void

  updateRoomStatus: (id: string, status: RoomStatus) => void
  syncRoomStatus: (roomId: string) => void
  reconcileAllState: () => void

  updateConsumable: (id: string, data: Partial<Consumable>) => void
  addConsumableRequest: (consumableId: string, note: string) => void

  addNotification: (notification: Notification) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  markNotificationsReadByTarget: (targetId: string) => void

  getDoctorById: (id: string) => Doctor | undefined
  getAssistantById: (id: string) => Assistant | undefined
  getRoomById: (id: string) => Room | undefined
  getProjectById: (id: string) => Project | undefined
  getScheduleForRoom: (roomId: string) => Schedule | undefined
  getAssistantsByQualification: (qualification: string) => Assistant[]
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      doctors: mockDoctors,
      assistants: mockAssistants,
      rooms: mockRooms,
      schedules: mockSchedules,
      projects: mockProjects,
      consumables: mockConsumables,
      notifications: mockNotifications,

      reconcileAllState: () =>
        set((state) => {
          const { assistants, rooms } = reconcileState(state.schedules, state.assistants, state.rooms)
          return { assistants, rooms }
        }),

      addSchedule: (schedule) =>
        set((state) => {
          const updatedAssistants = state.assistants.map((a) =>
            schedule.assistantIds.includes(a.id)
              ? { ...a, status: 'busy' as AssistantStatus }
              : a
          )

          const updatedRooms = state.rooms.map((r) =>
            r.id === schedule.roomId
              ? { ...r, status: progressToRoomStatus(schedule.progress) }
              : r
          )

          return {
            schedules: [...state.schedules, schedule],
            assistants: updatedAssistants,
            rooms: updatedRooms,
          }
        }),

      updateSchedule: (id, data) =>
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id ? { ...s, ...data } : s
          ),
        })),

      deleteSchedule: (id) =>
        set((state) => {
          const schedule = state.schedules.find((s) => s.id === id)
          if (!schedule) return { schedules: state.schedules.filter((s) => s.id !== id) }

          const remaining = state.schedules.filter((s) => s.id !== id)
          const { assistants: updatedAssistants, rooms: updatedRooms } = reconcileState(
            remaining,
            state.assistants,
            state.rooms
          )

          return {
            schedules: remaining,
            assistants: updatedAssistants,
            rooms: updatedRooms,
          }
        }),

      updateScheduleProgress: (id, progress) =>
        set((state) => {
          const schedule = state.schedules.find((s) => s.id === id)
          if (!schedule) return state

          const nextHandover: HandoverItems | undefined =
            progress === 'handover' && !schedule.handover
              ? { customer_departed: false, consumables_collected: false, photos_archived: false }
              : schedule.handover

          const updatedSchedules = state.schedules.map((s) =>
            s.id === id ? { ...s, progress, handover: nextHandover } : s
          )

          const { assistants: updatedAssistants, rooms: updatedRooms } = reconcileState(
            updatedSchedules,
            state.assistants,
            state.rooms
          )

          return {
            schedules: updatedSchedules,
            assistants: updatedAssistants,
            rooms: updatedRooms,
          }
        }),

      toggleHandoverItem: (id, item, value) =>
        set((state) => ({
          schedules: state.schedules.map((s) => {
            if (s.id !== id || !s.handover) return s
            if (item === 'review_note') {
              return {
                ...s,
                handover: { ...s.handover, review_note: typeof value === 'string' ? value : s.handover.review_note },
              }
            }
            const boolVal = typeof value === 'boolean' ? value : !s.handover[item]
            return { ...s, handover: { ...s.handover, [item]: boolVal } }
          }),
        })),

      completeHandover: (id) =>
        set((state) => {
          const schedule = state.schedules.find((s) => s.id === id)
          if (!schedule || schedule.progress !== 'handover') return state

          const completedAt = new Date().toISOString()
          const updatedSchedules = state.schedules.map((s) =>
            s.id === id ? { ...s, handoverCompletedAt: completedAt } : s
          )

          const { assistants: updatedAssistants, rooms: updatedRooms } = reconcileState(
            updatedSchedules,
            state.assistants,
            state.rooms
          )

          const doctor = state.getDoctorById(schedule.doctorId)
          const project = state.getProjectById(schedule.projectId)
          const notifs: Notification[] = schedule.assistantIds.map((aid) => ({
            id: `n_${Date.now()}_${aid}`,
            type: 'handover',
            message: `台次交接完成：${doctor?.name ?? ''}医生-${project?.name ?? ''}，可查看复盘`,
            targetId: aid,
            timestamp: completedAt,
            read: false,
            scheduleId: id,
          }))

          return {
            schedules: updatedSchedules,
            assistants: updatedAssistants,
            rooms: updatedRooms,
            notifications: [...notifs, ...state.notifications],
          }
        }),

      reportDelay: (id, reason) =>
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id
              ? { ...s, delayReason: reason, anomalyNotes: [...s.anomalyNotes, `延误：${reason}`] }
              : s
          ),
        })),

      updateAssistantStatus: (id, status) =>
        set((state) => ({
          assistants: state.assistants.map((a) =>
            a.id === id ? { ...a, status } : a
          ),
        })),

      assignAssistant: (scheduleId, assistantId) =>
        set((state) => {
          const updatedSchedules = state.schedules.map((s) =>
            s.id === scheduleId && !s.assistantIds.includes(assistantId)
              ? { ...s, assistantIds: [...s.assistantIds, assistantId] }
              : s
          )
          const { assistants } = reconcileState(updatedSchedules, state.assistants, state.rooms)
          return { schedules: updatedSchedules, assistants }
        }),

      removeAssistant: (scheduleId, assistantId) =>
        set((state) => {
          const updatedSchedules = state.schedules.map((s) =>
            s.id === scheduleId
              ? { ...s, assistantIds: s.assistantIds.filter((id) => id !== assistantId) }
              : s
          )
          const { assistants } = reconcileState(updatedSchedules, state.assistants, state.rooms)
          return { schedules: updatedSchedules, assistants }
        }),

      dispatchSupport: (scheduleId, assistantId) => {
        const state = get()
        const schedule = state.schedules.find((s) => s.id === scheduleId)
        const assistant = state.assistants.find((a) => a.id === assistantId)
        if (!schedule || !assistant) return

        const notification: Notification = {
          id: `n_${Date.now()}`,
          type: 'dispatch',
          message: `您已被调派支援：${state.getDoctorById(schedule.doctorId)?.name ?? ''}医生-${state.getProjectById(schedule.projectId)?.name ?? ''}`,
          targetId: assistantId,
          timestamp: new Date().toISOString(),
          read: false,
          scheduleId,
        }

        set((state) => {
          const updatedSchedules = state.schedules.map((s) =>
            s.id === scheduleId && !s.assistantIds.includes(assistantId)
              ? { ...s, assistantIds: [...s.assistantIds, assistantId] }
              : s
          )
          const { assistants } = reconcileState(updatedSchedules, state.assistants, state.rooms)
          return {
            schedules: updatedSchedules,
            assistants,
            notifications: [notification, ...state.notifications],
          }
        })
      },

      updateRoomStatus: (id, status) =>
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === id ? { ...r, status } : r
          ),
        })),

      syncRoomStatus: (roomId) =>
        set((state) => {
          const activeSchedule = state.schedules.find(
            (s) => s.roomId === roomId && isScheduleActive(s)
          )
          const newStatus: RoomStatus = activeSchedule
            ? progressToRoomStatus(activeSchedule.progress)
            : 'idle'
          return {
            rooms: state.rooms.map((r) =>
              r.id === roomId ? { ...r, status: newStatus } : r
            ),
          }
        }),

      updateConsumable: (id, data) =>
        set((state) => ({
          consumables: state.consumables.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        })),

      addConsumableRequest: (consumableId, note) => {
        const state = get()
        const consumable = state.consumables.find((c) => c.id === consumableId)
        if (!consumable) return

        const notification: Notification = {
          id: `n_${Date.now()}`,
          type: 'consumable',
          message: `耗材申请：${consumable.name}，备注：${note}`,
          targetId: '',
          timestamp: new Date().toISOString(),
          read: false,
        }

        set((state) => ({
          notifications: [notification, ...state.notifications],
        }))
      },

      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      markNotificationsReadByTarget: (targetId) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.targetId === targetId ? { ...n, read: true } : n
          ),
        })),

      getDoctorById: (id) => get().doctors.find((d) => d.id === id),
      getAssistantById: (id) => get().assistants.find((a) => a.id === id),
      getRoomById: (id) => get().rooms.find((r) => r.id === id),
      getProjectById: (id) => get().projects.find((p) => p.id === id),
      getScheduleForRoom: (roomId) => {
        const today = new Date().toISOString().split('T')[0]
        return get().schedules.find(
          (s) => s.roomId === roomId && s.date === today && isScheduleActive(s)
        )
      },
      getAssistantsByQualification: (qualification) =>
        get().assistants.filter((a) => a.qualifications.includes(qualification as Assistant['qualifications'][number])),
    }),
    {
      name: 'medical-scheduling-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const { assistants, rooms } = reconcileState(state.schedules, state.assistants, state.rooms)
          state.assistants = assistants
          state.rooms = rooms
        }
      },
    }
  )
)
