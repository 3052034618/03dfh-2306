import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Doctor, Assistant, Room, Schedule, Project, Consumable, Notification, ProgressStage, AssistantStatus, RoomStatus } from '@/types'
import { mockDoctors, mockAssistants, mockRooms, mockSchedules, mockProjects, mockConsumables, mockNotifications } from '@/data/mock'

function progressToRoomStatus(progress: ProgressStage): RoomStatus {
  if (progress === 'handover') return 'handover'
  if (progress === 'operating' || progress === 'doctor_in') return 'in_progress'
  return 'preparing'
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

  updateAssistantStatus: (id: string, status: AssistantStatus) => void
  assignAssistant: (scheduleId: string, assistantId: string) => void
  removeAssistant: (scheduleId: string, assistantId: string) => void
  dispatchSupport: (scheduleId: string, assistantId: string) => void

  updateRoomStatus: (id: string, status: RoomStatus) => void
  syncRoomStatus: (roomId: string) => void

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

          const updatedAssistants = state.assistants.map((a) => {
            if (!schedule.assistantIds.includes(a.id)) return a
            const stillInOther = state.schedules.some(
              (s) => s.id !== id && s.assistantIds.includes(a.id) && s.progress !== 'handover'
            )
            return stillInOther ? a : { ...a, status: 'idle' as AssistantStatus }
          })

          const hasOtherSchedules = state.schedules.some(
            (s) => s.id !== id && s.roomId === schedule.roomId && s.progress !== 'handover'
          )
          const updatedRooms = state.rooms.map((r) =>
            r.id === schedule.roomId && !hasOtherSchedules
              ? { ...r, status: 'idle' as RoomStatus }
              : r
          )

          return {
            schedules: state.schedules.filter((s) => s.id !== id),
            assistants: updatedAssistants,
            rooms: updatedRooms,
          }
        }),

      updateScheduleProgress: (id, progress) =>
        set((state) => {
          const schedule = state.schedules.find((s) => s.id === id)
          const updatedSchedules = state.schedules.map((s) =>
            s.id === id ? { ...s, progress } : s
          )

          let updatedAssistants = state.assistants
          if (progress === 'handover' && schedule) {
            updatedAssistants = state.assistants.map((a) => {
              if (!schedule.assistantIds.includes(a.id)) return a
              const stillInOther = updatedSchedules.some(
                (s) => s.id !== id && s.assistantIds.includes(a.id) && s.progress !== 'handover'
              )
              return stillInOther ? a : { ...a, status: 'idle' as AssistantStatus }
            })
          }

          let updatedRooms = state.rooms
          if (schedule) {
            updatedRooms = state.rooms.map((r) =>
              r.id === schedule.roomId
                ? { ...r, status: progressToRoomStatus(progress) }
                : r
            )
          }

          return {
            schedules: updatedSchedules,
            assistants: updatedAssistants,
            rooms: updatedRooms,
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
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === scheduleId && !s.assistantIds.includes(assistantId)
              ? { ...s, assistantIds: [...s.assistantIds, assistantId] }
              : s
          ),
          assistants: state.assistants.map((a) =>
            a.id === assistantId ? { ...a, status: 'busy' as AssistantStatus } : a
          ),
        })),

      removeAssistant: (scheduleId, assistantId) =>
        set((state) => {
          const stillInOther = state.schedules.some(
            (s) => s.id !== scheduleId && s.assistantIds.includes(assistantId) && s.progress !== 'handover'
          )
          return {
            schedules: state.schedules.map((s) =>
              s.id === scheduleId
                ? { ...s, assistantIds: s.assistantIds.filter((id) => id !== assistantId) }
                : s
            ),
            assistants: state.assistants.map((a) =>
              a.id === assistantId
                ? { ...a, status: stillInOther ? a.status : ('idle' as AssistantStatus) }
                : a
            ),
          }
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
        }

        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === scheduleId && !s.assistantIds.includes(assistantId)
              ? { ...s, assistantIds: [...s.assistantIds, assistantId] }
              : s
          ),
          assistants: state.assistants.map((a) =>
            a.id === assistantId ? { ...a, status: 'busy' as AssistantStatus } : a
          ),
          notifications: [notification, ...state.notifications],
        }))
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
            (s) => s.roomId === roomId && s.progress !== 'handover'
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
          (s) => s.roomId === roomId && s.date === today && s.progress !== 'handover'
        )
      },
      getAssistantsByQualification: (qualification) =>
        get().assistants.filter((a) => a.qualifications.includes(qualification as Assistant['qualifications'][number])),
    }),
    {
      name: 'medical-scheduling-store',
    }
  )
)
