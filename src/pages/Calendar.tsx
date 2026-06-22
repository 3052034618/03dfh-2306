import { useState, useMemo, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  UserCheck,
  Clock,
  User,
  CalendarDays,
  LayoutList,
  AlertCircle,
  Users,
  AlertTriangle,
  Check,
  GripVertical,
  ChevronDown,
  BarChart3,
  Stethoscope,
  Home,
} from 'lucide-react'
import { format, addDays, startOfWeek, isSameDay, parseISO, differenceInMinutes } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Schedule, ProjectCategory, Qualification, Assistant, RoomType } from '@/types'
import {
  QUALIFICATION_LABELS,
  PROJECT_CATEGORY_LABELS,
  ASSISTANT_STATUS_LABELS,
  PROGRESS_LABELS,
} from '@/types'

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8)

const CATEGORY_COLORS: Record<ProjectCategory, { bg: string; border: string; text: string; dot: string }> = {
  eye_nose: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800', dot: 'bg-purple-500' },
  laser: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', dot: 'bg-blue-500' },
  injection: { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-800', dot: 'bg-teal-500' },
}

const CATEGORY_BADGE: Record<ProjectCategory, string> = {
  eye_nose: 'badge badge-eye_nose',
  laser: 'badge badge-laser',
  injection: 'badge badge-injection',
}

type ViewMode = 'week' | 'day' | 'overview'

type OverviewTab = 'doctor' | 'room' | 'assistant'

interface FormData {
  doctorId: string
  projectId: string
  roomId: string
  customerName: string
  date: string
  startTime: string
  endTime: string
}

const EMPTY_FORM: FormData = {
  doctorId: '',
  projectId: '',
  roomId: '',
  customerName: '',
  date: '',
  startTime: '09:00',
  endTime: '10:00',
}

function isTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && start2 < end1
}

function DraggableAssistantChip({
  assistant,
}: {
  assistant: Assistant
}) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('assistantId', assistant.id)
      e.dataTransfer.effectAllowed = 'copy'
    },
    [assistant.id]
  )

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-navy-100 text-navy-700 text-xs font-medium shrink-0 cursor-grab active:cursor-grabbing hover:bg-navy-200 transition-colors"
    >
      <GripVertical size={10} className="text-navy-400" />
      <User size={12} />
      <span>{assistant.name}</span>
    </div>
  )
}

function DraggableAssistantItem({
  assistant,
  isAssigned,
  onToggle,
}: {
  assistant: Assistant
  isAssigned: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer',
        isAssigned
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-warm-200 bg-white hover:border-navy-200',
        assistant.status === 'busy' && !isAssigned && 'opacity-50'
      )}
      onClick={onToggle}
    >
      <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center shrink-0">
        <User size={14} className="text-navy-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-navy-800">{assistant.name}</span>
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              assistant.status === 'idle'
                ? 'bg-emerald-100 text-emerald-700'
                : assistant.status === 'busy'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-warm-200 text-navy-500'
            )}
          >
            {ASSISTANT_STATUS_LABELS[assistant.status]}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {assistant.qualifications.map((q) => (
            <span key={q} className={cn('badge text-[10px] px-1.5 py-0', `badge-${q}`)}>
              {QUALIFICATION_LABELS[q]}
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0">
        {isAssigned ? (
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check size={12} className="text-white" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-warm-300" />
        )}
      </div>
    </div>
  )
}

export default function Calendar() {
  const schedules = useStore((s) => s.schedules)
  const doctors = useStore((s) => s.doctors)
  const projects = useStore((s) => s.projects)
  const rooms = useStore((s) => s.rooms)
  const assistants = useStore((s) => s.assistants)
  const addSchedule = useStore((s) => s.addSchedule)
  const assignAssistant = useStore((s) => s.assignAssistant)
  const removeAssistant = useStore((s) => s.removeAssistant)
  const addNotification = useStore((s) => s.addNotification)
  const getDoctorById = useStore((s) => s.getDoctorById)
  const getProjectById = useStore((s) => s.getProjectById)
  const getRoomById = useStore((s) => s.getRoomById)
  const getAssistantById = useStore((s) => s.getAssistantById)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [overviewTab, setOverviewTab] = useState<OverviewTab>('doctor')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [draftAssistantIds, setDraftAssistantIds] = useState<string[]>([])

  const [dropTargetScheduleId, setDropTargetScheduleId] = useState<string | null>(null)

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const displayDays = useMemo(() => (viewMode === 'week' ? weekDays : [currentDate]), [viewMode, weekDays, currentDate])

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>()
    schedules.forEach((s) => {
      const list = map.get(s.date) ?? []
      list.push(s)
      map.set(s.date, list)
    })
    return map
  }, [schedules])

  const selectedProject = useMemo(() => projects.find((p) => p.id === form.projectId), [projects, form.projectId])

  const recommendedAssistants = useMemo(() => {
    if (!selectedProject) return []
    return assistants.filter((a) => {
      if (a.status === 'leave') return false
      return selectedProject.requiredQualifications.some((q) => a.qualifications.includes(q))
    })
  }, [selectedProject, assistants])

  const roomConflicts = useMemo(() => {
    if (!form.roomId || !form.date || !form.startTime || !form.endTime) return []
    return schedules.filter((s) => {
      if (s.id === selectedSchedule?.id) return false
      return (
        s.roomId === form.roomId &&
        s.date === form.date &&
        isTimeOverlap(form.startTime, form.endTime, s.startTime, s.endTime)
      )
    })
  }, [form, schedules, selectedSchedule])

  const hasConflict = roomConflicts.length > 0

  const roomOccupancyMap = useMemo(() => {
    const map = new Map<string, { conflicted: boolean; schedules: Schedule[] }>()
    if (!form.date || !form.startTime || !form.endTime) return map
    rooms.forEach((r) => {
      const conflicted = schedules.filter((s) => {
        if (s.id === selectedSchedule?.id) return false
        return (
          s.roomId === r.id &&
          s.date === form.date &&
          isTimeOverlap(form.startTime, form.endTime, s.startTime, s.endTime)
        )
      })
      map.set(r.id, { conflicted: conflicted.length > 0, schedules: conflicted })
    })
    return map
  }, [rooms, form.date, form.startTime, form.endTime, schedules, selectedSchedule])

  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false)

  const goToPrev = useCallback(() => {
    setCurrentDate((d) => addDays(d, viewMode === 'week' ? -7 : -1))
  }, [viewMode])

  const goToNext = useCallback(() => {
    setCurrentDate((d) => addDays(d, viewMode === 'week' ? 7 : 1))
  }, [viewMode])

  const overviewDateStr = useMemo(() => format(currentDate, 'yyyy-MM-dd'), [currentDate])
  const overviewSchedules = useMemo(() => schedulesByDate.get(overviewDateStr) ?? [], [schedulesByDate, overviewDateStr])

  const hasOverlap = useCallback((schedules: Schedule[], current: Schedule): boolean => {
    return schedules.some(
      (s) => s.id !== current.id && isTimeOverlap(current.startTime, current.endTime, s.startTime, s.endTime)
    )
  }, [])

  const schedulesByDoctor = useMemo(() => {
    const map = new Map<string, Schedule[]>()
    doctors.forEach((d) => map.set(d.id, []))
    overviewSchedules.forEach((s) => {
      const list = map.get(s.doctorId) ?? []
      list.push(s)
      map.set(s.doctorId, list)
    })
    return map
  }, [doctors, overviewSchedules])

  const schedulesByRoom = useMemo(() => {
    const map = new Map<string, Schedule[]>()
    rooms.forEach((r) => map.set(r.id, []))
    overviewSchedules.forEach((s) => {
      const list = map.get(s.roomId) ?? []
      list.push(s)
      map.set(s.roomId, list)
    })
    return map
  }, [rooms, overviewSchedules])

  const schedulesByAssistant = useMemo(() => {
    const map = new Map<string, Schedule[]>()
    assistants.forEach((a) => map.set(a.id, []))
    overviewSchedules.forEach((s) => {
      s.assistantIds.forEach((aid) => {
        const list = map.get(aid) ?? []
        list.push(s)
        map.set(aid, list)
      })
    })
    return map
  }, [assistants, overviewSchedules])

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const handleFormChange = useCallback((field: keyof FormData, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'date' || field === 'startTime' || field === 'endTime') {
        if (next.roomId) {
          const roomId = next.roomId
          setTimeout(() => {
            setForm((p) => {
              const occupancy = rooms.reduce<{ conflicted: boolean } | null>((acc, r) => {
                if (r.id === roomId) {
                  const conflicted = schedules.some((s) => {
                    if (selectedSchedule?.id === s.id) return false
                    return s.roomId === roomId && s.date === p.date && isTimeOverlap(p.startTime, p.endTime, s.startTime, s.endTime)
                  })
                  return { conflicted }
                }
                return acc
              }, null)
              if (occupancy?.conflicted) {
                return { ...p, roomId: '' }
              }
              return p
            })
          }, 0)
        }
        setRoomDropdownOpen(false)
      }
      return next
    })
  }, [rooms, schedules, selectedSchedule])

  const handleProjectChange = useCallback((projectId: string) => {
    const proj = projects.find((p) => p.id === projectId)
    setForm((prev) => ({
      ...prev,
      projectId,
      endTime: proj
        ? (() => {
            const [h] = prev.startTime.split(':').map(Number)
            const endH = h + Math.ceil(proj.estimatedDuration / 60)
            return `${String(endH).padStart(2, '0')}:00`
          })()
        : prev.endTime,
    }))
    setDraftAssistantIds([])
  }, [projects])

  const toggleDraftAssistant = useCallback((assistantId: string) => {
    setDraftAssistantIds((prev) =>
      prev.includes(assistantId)
        ? prev.filter((id) => id !== assistantId)
        : [...prev, assistantId]
    )
  }, [])

  const handleSubmit = useCallback(() => {
    if (!form.doctorId || !form.projectId || !form.roomId || !form.customerName || !form.date || !form.startTime || !form.endTime) return
    if (hasConflict) return

    const newSchedule: Schedule = {
      id: `s_${Date.now()}`,
      doctorId: form.doctorId,
      roomId: form.roomId,
      assistantIds: draftAssistantIds,
      customerName: form.customerName,
      projectId: form.projectId,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      progress: 'preparing',
      isOvertime: false,
      isSwapped: false,
      anomalyNotes: [],
    }

    addSchedule(newSchedule)

    draftAssistantIds.forEach((assistantId) => {
      const assistant = getAssistantById(assistantId)
      const doctor = getDoctorById(form.doctorId)
      const project = getProjectById(form.projectId)

      if (assistant) {
        addNotification({
          id: `n_${Date.now()}_${assistantId}`,
          type: 'assignment',
          message: `您已被安排跟台：${doctor?.name ?? ''}医生-${project?.name ?? ''}，${form.startTime}-${form.endTime}`,
          targetId: assistantId,
          timestamp: new Date().toISOString(),
          read: false,
        })
      }
    })

    setSelectedSchedule(newSchedule)
    setForm(EMPTY_FORM)
    setDraftAssistantIds([])
  }, [form, draftAssistantIds, addSchedule, addNotification, getAssistantById, getDoctorById, getProjectById, hasConflict])

  const handleAssignAssistant = useCallback(
    (scheduleId: string, assistantId: string) => {
      const schedule = schedules.find((s) => s.id === scheduleId)
      if (!schedule) return
      if (schedule.assistantIds.includes(assistantId)) return

      assignAssistant(scheduleId, assistantId)

      const assistant = getAssistantById(assistantId)
      const doctor = getDoctorById(schedule.doctorId)
      const project = getProjectById(schedule.projectId)

      addNotification({
        id: `n_${Date.now()}_${assistantId}`,
        type: 'assignment',
        message: `您已被安排跟台：${doctor?.name ?? ''}医生-${project?.name ?? ''}，${schedule.startTime}-${schedule.endTime}`,
        targetId: assistantId,
        timestamp: new Date().toISOString(),
        read: false,
      })

      if (selectedSchedule?.id === scheduleId) {
        setSelectedSchedule((prev) =>
          prev ? { ...prev, assistantIds: [...prev.assistantIds, assistantId] } : prev
        )
      }
    },
    [schedules, assignAssistant, getAssistantById, getDoctorById, getProjectById, addNotification, selectedSchedule]
  )

  const handleRemoveAssistant = useCallback(
    (scheduleId: string, assistantId: string) => {
      removeAssistant(scheduleId, assistantId)
      if (selectedSchedule?.id === scheduleId) {
        setSelectedSchedule((prev) =>
          prev ? { ...prev, assistantIds: prev.assistantIds.filter((id) => id !== assistantId) } : prev
        )
      }
    },
    [removeAssistant, selectedSchedule]
  )

  const handleDropOnSchedule = useCallback(
    (e: React.DragEvent, scheduleId: string) => {
      e.preventDefault()
      setDropTargetScheduleId(null)

      const assistantId = e.dataTransfer.getData('assistantId')
      if (!assistantId) return

      const schedule = schedules.find((s) => s.id === scheduleId)
      const assistant = getAssistantById(assistantId)

      if (schedule && assistant && !schedule.assistantIds.includes(assistantId)) {
        handleAssignAssistant(scheduleId, assistantId)
      }
    },
    [schedules, getAssistantById, handleAssignAssistant]
  )

  const openAddDrawer = useCallback((date?: string, hour?: number) => {
    setForm({
      ...EMPTY_FORM,
      date: date ?? format(new Date(), 'yyyy-MM-dd'),
      startTime: hour ? `${String(hour).padStart(2, '0')}:00` : '09:00',
      endTime: hour ? `${String(hour + 1).padStart(2, '0')}:00` : '10:00',
    })
    setDraftAssistantIds([])
    setSelectedSchedule(null)
    setDrawerOpen(true)
  }, [])

  const openScheduleDetail = useCallback(
    (schedule: Schedule) => {
      setSelectedSchedule(schedule)
      setForm(EMPTY_FORM)
      setDraftAssistantIds([])
      setDrawerOpen(true)
    },
    []
  )

  const getScheduleStyle = useCallback((schedule: Schedule) => {
    const project = getProjectById(schedule.projectId)
    const category = project?.category ?? 'injection'
    return CATEGORY_COLORS[category]
  }, [getProjectById])

  const getScheduleTop = useCallback((startTime: string) => {
    const [h, m] = startTime.split(':').map(Number)
    return (h - 8) * 64 + (m / 60) * 64
  }, [])

  const getScheduleHeight = useCallback((startTime: string, endTime: string) => {
    return Math.max(differenceInMinutes(parseISO(`2025-01-01T${endTime}`), parseISO(`2025-01-01T${startTime}`)), 20) * (64 / 60)
  }, [])

  const renderScheduleBlock = useCallback(
    (schedule: Schedule) => {
      const style = getScheduleStyle(schedule)
      const doctor = getDoctorById(schedule.doctorId)
      const project = getProjectById(schedule.projectId)
      const room = getRoomById(schedule.roomId)
      const top = getScheduleTop(schedule.startTime)
      const height = getScheduleHeight(schedule.startTime, schedule.endTime)
      const isSelected = selectedSchedule?.id === schedule.id
      const isDropTarget = dropTargetScheduleId === schedule.id

      const assignedAssistants = schedule.assistantIds
        .map((id) => getAssistantById(id))
        .filter((a): a is Assistant => a !== undefined)

      return (
        <div
          key={schedule.id}
          data-schedule-id={schedule.id}
          onClick={() => openScheduleDetail(schedule)}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
            if (dropTargetScheduleId !== schedule.id) {
              setDropTargetScheduleId(schedule.id)
            }
          }}
          onDragLeave={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX
            const y = e.clientY
            if (
              x <= rect.left ||
              x >= rect.right ||
              y <= rect.top ||
              y >= rect.bottom
            ) {
              setDropTargetScheduleId(null)
            }
          }}
          onDrop={(e) => handleDropOnSchedule(e, schedule.id)}
          className={cn(
            'absolute left-1 right-1 rounded-lg border-l-4 px-2 py-1 cursor-pointer transition-all duration-150 overflow-hidden',
            style.bg,
            style.border,
            style.text,
            isSelected && 'ring-2 ring-coral-400 shadow-md z-10',
            isDropTarget && 'ring-2 ring-emerald-400 shadow-lg z-20 scale-[1.02]',
            !isSelected && !isDropTarget && 'hover:shadow-sm hover:z-10'
          )}
          style={{ top: `${top}px`, height: `${height}px` }}
        >
          <div className="flex items-center gap-1 text-xs font-semibold truncate">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
            <span className="truncate">{project?.name}</span>
          </div>
          <div className="text-[10px] opacity-80 truncate mt-0.5">
            {schedule.customerName} · {doctor?.name}
          </div>
          {(viewMode === 'day' || height > 60) && (
            <div className="text-[10px] opacity-70 truncate mt-0.5">
              <Clock size={10} className="inline mr-0.5 -mt-px" />
              {schedule.startTime}-{schedule.endTime} · {room?.name}
            </div>
          )}
          {(viewMode === 'day' || height > 80) && assignedAssistants.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {assignedAssistants.slice(0, 3).map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-white/80 text-navy-600"
                >
                  <User size={8} />
                  {a.name}
                </span>
              ))}
              {assignedAssistants.length > 3 && (
                <span className="text-[10px] text-navy-500">+{assignedAssistants.length - 3}</span>
              )}
            </div>
          )}
          {schedule.delayReason && (
            <div className="flex items-center gap-0.5 text-[10px] text-coral-500 mt-0.5">
              <AlertCircle size={10} />
              <span className="truncate">{schedule.delayReason}</span>
            </div>
          )}
        </div>
      )
    },
    [getScheduleStyle, getDoctorById, getProjectById, getRoomById, getAssistantById, getScheduleTop, getScheduleHeight, selectedSchedule, openScheduleDetail, viewMode, dropTargetScheduleId, handleDropOnSchedule]
  )

  const allAssistantsForDrag = useMemo(
    () => assistants.filter((a) => a.status === 'idle' || a.status === 'break'),
    [assistants]
  )

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-warm-200/60 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="section-title">排班日历</h1>
              <div className="flex items-center bg-warm-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('week')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                    viewMode === 'week' ? 'bg-white text-navy-800 shadow-sm' : 'text-navy-400 hover:text-navy-600'
                  )}
                >
                  <CalendarDays size={14} />
                  周视图
                </button>
                <button
                  onClick={() => setViewMode('day')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                    viewMode === 'day' ? 'bg-white text-navy-800 shadow-sm' : 'text-navy-400 hover:text-navy-600'
                  )}
                >
                  <LayoutList size={14} />
                  日视图
                </button>
                <button
                  onClick={() => setViewMode('overview')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                    viewMode === 'overview' ? 'bg-white text-navy-800 shadow-sm' : 'text-navy-400 hover:text-navy-600'
                  )}
                >
                  <BarChart3 size={14} />
                  资源总览
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button onClick={goToPrev} className="p-1.5 rounded-lg hover:bg-warm-100 transition-colors">
                  <ChevronLeft size={18} className="text-navy-600" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-navy-600 hover:bg-warm-100 transition-colors"
                >
                  今天
                </button>
                <button onClick={goToNext} className="p-1.5 rounded-lg hover:bg-warm-100 transition-colors">
                  <ChevronRight size={18} className="text-navy-600" />
                </button>
              </div>
              <span className="text-sm font-semibold text-navy-700 min-w-[120px] text-center">
                {viewMode === 'week'
                  ? `${format(weekStart, 'M月d日', { locale: zhCN })} - ${format(addDays(weekStart, 6), 'M月d日', { locale: zhCN })}`
                  : format(currentDate, 'yyyy年M月d日 EEEE', { locale: zhCN })}
              </span>

              <div className="flex items-center gap-2 ml-2">
                {(['eye_nose', 'laser', 'injection'] as ProjectCategory[]).map((cat) => (
                  <span key={cat} className={CATEGORY_BADGE[cat]}>
                    {PROJECT_CATEGORY_LABELS[cat]}
                  </span>
                ))}
              </div>

              <button onClick={() => openAddDrawer()} className="btn-primary flex items-center gap-1.5 ml-2">
                <Plus size={15} />
                新增排班
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        {viewMode === 'overview' ? (
          <OverviewView
            overviewTab={overviewTab}
            setOverviewTab={setOverviewTab}
            overviewDateStr={overviewDateStr}
            isToday={isSameDay(currentDate, new Date())}
            doctors={doctors}
            rooms={rooms}
            assistants={assistants}
            schedulesByDoctor={schedulesByDoctor}
            schedulesByRoom={schedulesByRoom}
            schedulesByAssistant={schedulesByAssistant}
            hasOverlap={hasOverlap}
            getScheduleStyle={getScheduleStyle}
            getDoctorById={getDoctorById}
            getProjectById={getProjectById}
            getRoomById={getRoomById}
            getAssistantById={getAssistantById}
            openScheduleDetail={openScheduleDetail}
            openAddDrawer={openAddDrawer}
            dropTargetScheduleId={dropTargetScheduleId}
            setDropTargetScheduleId={setDropTargetScheduleId}
            handleDropOnSchedule={handleDropOnSchedule}
          />
        ) : (
          <div className="flex-1 overflow-auto bg-warm-50">
            <div className="flex min-w-max">
              {/* Time Column */}
              <div className="w-16 shrink-0 sticky left-0 z-20 bg-warm-50">
                <div className="h-12 border-b border-warm-200/60" />
                {HOURS.map((hour) => (
                  <div key={hour} className="h-16 border-b border-warm-100 flex items-start justify-end pr-2 pt-0">
                    <span className="text-[11px] text-navy-300 font-medium -mt-2">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {displayDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const daySchedules = schedulesByDate.get(dateStr) ?? []
                const isToday = isSameDay(day, new Date())

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      'flex-1 min-w-[140px] border-r border-warm-200/60 last:border-r-0',
                      viewMode === 'day' && 'min-w-[300px]'
                    )}
                  >
                    {/* Day Header */}
                    <div
                      className={cn(
                        'h-12 flex flex-col items-center justify-center border-b border-warm-200/60 sticky top-0 z-10',
                        isToday ? 'bg-coral-50' : 'bg-white'
                      )}
                    >
                      <span className={cn('text-[10px] font-medium', isToday ? 'text-coral-500' : 'text-navy-300')}>
                        {format(day, 'EEE', { locale: zhCN })}
                      </span>
                      <span
                        className={cn(
                          'text-sm font-bold',
                          isToday ? 'text-coral-600' : 'text-navy-700'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Time Slots */}
                    <div className="relative">
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="h-16 border-b border-warm-100 hover:bg-navy-50/30 transition-colors cursor-pointer"
                          onClick={() => openAddDrawer(dateStr, hour)}
                        />
                      ))}

                      {/* Current Time Indicator */}
                      {isToday && (() => {
                        const now = new Date()
                        const h = now.getHours()
                        const m = now.getMinutes()
                        if (h < 8 || h >= 18) return null
                        const top = (h - 8) * 64 + (m / 60) * 64
                        return (
                          <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${top}px` }}>
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-coral-400 -ml-1" />
                              <div className="flex-1 h-px bg-coral-400" />
                            </div>
                          </div>
                        )
                      })()}

                      {/* Schedule Blocks */}
                      {daySchedules.map(renderScheduleBlock)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Draggable Assistants */}
      <div className="w-56 bg-white border-l border-warm-200/60 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-warm-200/60">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-navy-600" />
            <span className="text-sm font-semibold text-navy-800">可调配人员</span>
          </div>
          <p className="text-[11px] text-navy-400 mt-1">拖拽到排班块上快速分配</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {allAssistantsForDrag.map((assistant) => (
            <div key={assistant.id} className="mb-2">
              <DraggableAssistantChip assistant={assistant} />
            </div>
          ))}
          {allAssistantsForDrag.length === 0 && (
            <div className="text-center text-xs text-navy-300 py-4">
              暂无空闲人员
            </div>
          )}
        </div>
        <div className="p-3 border-t border-warm-200/60">
          <p className="text-[10px] text-navy-400 text-center">
            共 {allAssistantsForDrag.length} 人可调配
          </p>
        </div>
      </div>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-navy-900/30 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-[440px] bg-white shadow-2xl flex flex-col animate-slide-in">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200/60 shrink-0">
              <h2 className="font-serif text-lg font-semibold text-navy-800">
                {selectedSchedule ? '排班详情' : '新增排班'}
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-warm-100 transition-colors"
              >
                <X size={18} className="text-navy-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedSchedule ? (
                <ScheduleDetailPanel
                  schedule={selectedSchedule}
                  getDoctorById={getDoctorById}
                  getProjectById={getProjectById}
                  getRoomById={getRoomById}
                  getAssistantById={getAssistantById}
                  assistants={assistants}
                  onAssign={handleAssignAssistant}
                  onRemove={handleRemoveAssistant}
                />
              ) : (
                <div className="p-6 space-y-5">
                  {/* Doctor */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">医生</label>
                    <select
                      className="select-field"
                      value={form.doctorId}
                      onChange={(e) => handleFormChange('doctorId', e.target.value)}
                    >
                      <option value="">请选择医生</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} - {d.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Project */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">项目</label>
                    <select
                      className="select-field"
                      value={form.projectId}
                      onChange={(e) => handleProjectChange(e.target.value)}
                    >
                      <option value="">请选择项目</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({PROJECT_CATEGORY_LABELS[p.category]} / {p.estimatedDuration}分钟)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Room */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-navy-700">房间</label>
                      {hasConflict && (
                        <span className="text-[11px] text-coral-500 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          时间冲突
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setRoomDropdownOpen(!roomDropdownOpen)}
                        className={cn(
                          'select-field w-full text-left flex items-center justify-between',
                          hasConflict && 'border-coral-300 focus:ring-coral-300 bg-coral-50'
                        )}
                      >
                        <span className={cn(!form.roomId && 'text-gray-400')}>
                          {form.roomId
                            ? (() => {
                                const r = rooms.find((rm) => rm.id === form.roomId)
                                return r
                                  ? `${r.name} (${r.type === 'operating' ? '手术室' : r.type === 'laser' ? '光电室' : '注射室'})`
                                  : '请选择房间'
                              })()
                            : '请选择房间'}
                        </span>
                        <ChevronDown size={14} className="text-gray-400 shrink-0" />
                      </button>
                      {roomDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-warm-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                          {rooms.map((r) => {
                            const occupancy = roomOccupancyMap.get(r.id)
                            const isConflicted = occupancy?.conflicted ?? false
                            const typeLabel = r.type === 'operating' ? '手术室' : r.type === 'laser' ? '光电室' : '注射室'

                            return (
                              <div key={r.id}>
                                <button
                                  type="button"
                                  disabled={isConflicted}
                                  onClick={() => {
                                    if (!isConflicted) {
                                      handleFormChange('roomId', r.id)
                                      setRoomDropdownOpen(false)
                                    }
                                  }}
                                  className={cn(
                                    'w-full px-3 py-2.5 text-left text-sm transition-colors',
                                    isConflicted
                                      ? 'bg-coral-50/50 text-coral-400 cursor-not-allowed'
                                      : form.roomId === r.id
                                        ? 'bg-navy-50 text-navy-800 font-medium'
                                        : 'text-navy-700 hover:bg-warm-50'
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>
                                      {r.name} ({typeLabel})
                                    </span>
                                    {isConflicted ? (
                                      <span className="flex items-center gap-1 text-[10px] text-coral-500">
                                        <AlertTriangle size={10} />
                                        占用中
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-emerald-500">可用</span>
                                    )}
                                  </div>
                                  {isConflicted && occupancy && occupancy.schedules.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                      {occupancy.schedules.map((s) => {
                                        const doc = getDoctorById(s.doctorId)
                                        const proj = getProjectById(s.projectId)
                                        return (
                                          <div key={s.id} className="text-[10px] text-coral-400 flex items-center gap-1">
                                            <Clock size={8} />
                                            {s.startTime}-{s.endTime} {doc?.name} · {proj?.name}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    {hasConflict && roomConflicts.length > 0 && (
                      <div className="mt-2 p-2 rounded-lg bg-coral-50 border border-coral-200/60 text-[11px] text-coral-700">
                        <p className="font-medium mb-1">冲突排班：</p>
                        {roomConflicts.map((s) => {
                          const doctor = getDoctorById(s.doctorId)
                          const project = getProjectById(s.projectId)
                          return (
                            <div key={s.id} className="flex items-center gap-1.5">
                              <Clock size={10} />
                              <span>
                                {s.startTime}-{s.endTime} {doctor?.name} {project?.name}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">顾客姓名</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="请输入顾客姓名"
                      value={form.customerName}
                      onChange={(e) => handleFormChange('customerName', e.target.value)}
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">日期</label>
                    <input
                      type="date"
                      className="input-field"
                      value={form.date}
                      onChange={(e) => handleFormChange('date', e.target.value)}
                    />
                  </div>

                  {/* Time Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">开始时间</label>
                      <input
                        type="time"
                        className="input-field"
                        value={form.startTime}
                        onChange={(e) => handleFormChange('startTime', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">结束时间</label>
                      <input
                        type="time"
                        className="input-field"
                        value={form.endTime}
                        onChange={(e) => handleFormChange('endTime', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Draft Assistants List */}
                  {draftAssistantIds.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-navy-700">
                          已选配台 ({draftAssistantIds.length})
                        </span>
                        <button
                          onClick={() => setDraftAssistantIds([])}
                          className="text-xs text-coral-500 hover:text-coral-600"
                        >
                          清空
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {draftAssistantIds.map((id) => {
                          const a = getAssistantById(id)
                          if (!a) return null
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium"
                            >
                              <Check size={10} />
                              {a.name}
                              <button
                                onClick={() => toggleDraftAssistant(id)}
                                className="ml-0.5 hover:text-emerald-900"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommended Assistants */}
                  {selectedProject && (
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-3">
                        <UserCheck size={16} className="text-emerald-600" />
                        <span className="text-sm font-semibold text-navy-800">推荐配台</span>
                        <span className="text-xs text-navy-400">
                          需要资质：{selectedProject.requiredQualifications.map((q) => QUALIFICATION_LABELS[q]).join('、')}
                        </span>
                      </div>

                      {recommendedAssistants.length === 0 ? (
                        <div className="text-sm text-navy-400 py-3 text-center bg-warm-50 rounded-lg">
                          暂无符合条件的配台人员
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {recommendedAssistants.map((a) => {
                            const matchCount = a.qualifications.filter((q) =>
                              selectedProject.requiredQualifications.includes(q)
                            ).length
                            const isFullMatch = selectedProject.requiredQualifications.every((q) =>
                              a.qualifications.includes(q)
                            )
                            const isSelected = draftAssistantIds.includes(a.id)

                            return (
                              <DraggableAssistantItem
                                key={a.id}
                                assistant={a}
                                isAssigned={isSelected}
                                onToggle={() => toggleDraftAssistant(a.id)}
                              />
                            )
                          })}
                        </div>
                      )}

                      <p className="text-[10px] text-navy-400 mt-2">
                        点击人员添加到待分配列表，确认提交后统一保存
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            {!selectedSchedule && (
              <div className="px-6 py-4 border-t border-warm-200/60 shrink-0">
                <button
                  onClick={handleSubmit}
                  disabled={!form.doctorId || !form.projectId || !form.roomId || !form.customerName || !form.date || hasConflict}
                  className={cn(
                    'w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2',
                    form.doctorId && form.projectId && form.roomId && form.customerName && form.date && !hasConflict
                      ? 'bg-navy-800 text-white hover:bg-navy-700 active:scale-[0.98]'
                      : 'bg-warm-200 text-navy-300 cursor-not-allowed'
                  )}
                >
                  {hasConflict ? (
                    <>
                      <AlertCircle size={16} />
                      存在时间冲突，请调整
                    </>
                  ) : (
                    `确认添加排班${draftAssistantIds.length > 0 ? ` (${draftAssistantIds.length}人)` : ''}`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface OverviewViewProps {
  overviewTab: OverviewTab
  setOverviewTab: (tab: OverviewTab) => void
  overviewDateStr: string
  isToday: boolean
  doctors: { id: string; name: string; title: string }[]
  rooms: { id: string; name: string; type: RoomType }[]
  assistants: Assistant[]
  schedulesByDoctor: Map<string, Schedule[]>
  schedulesByRoom: Map<string, Schedule[]>
  schedulesByAssistant: Map<string, Schedule[]>
  hasOverlap: (schedules: Schedule[], current: Schedule) => boolean
  getScheduleStyle: (schedule: Schedule) => { bg: string; border: string; text: string; dot: string }
  getDoctorById: (id: string) => { id: string; name: string; title: string } | undefined
  getProjectById: (id: string) => { id: string; name: string; category: ProjectCategory } | undefined
  getRoomById: (id: string) => { id: string; name: string } | undefined
  getAssistantById: (id: string) => Assistant | undefined
  openScheduleDetail: (schedule: Schedule) => void
  openAddDrawer: (date?: string, hour?: number) => void
  dropTargetScheduleId: string | null
  setDropTargetScheduleId: (id: string | null) => void
  handleDropOnSchedule: (e: React.DragEvent, scheduleId: string) => void
}

function OverviewView({
  overviewTab,
  setOverviewTab,
  overviewDateStr,
  isToday,
  doctors,
  rooms,
  assistants,
  schedulesByDoctor,
  schedulesByRoom,
  schedulesByAssistant,
  hasOverlap,
  getScheduleStyle,
  getDoctorById,
  getProjectById,
  getRoomById,
  getAssistantById,
  openScheduleDetail,
  openAddDrawer,
  dropTargetScheduleId,
  setDropTargetScheduleId,
  handleDropOnSchedule,
}: OverviewViewProps) {
  const getResources = () => {
    switch (overviewTab) {
      case 'doctor':
        return doctors.map((d) => ({
          id: d.id,
          name: d.name,
          subtitle: d.title,
          icon: <Stethoscope size={14} className="text-navy-500" />,
          schedules: schedulesByDoctor.get(d.id) ?? [],
        }))
      case 'room':
        return rooms.map((r) => ({
          id: r.id,
          name: r.name,
          subtitle: r.type === 'operating' ? '手术室' : r.type === 'laser' ? '光电室' : '注射室',
          icon: <Home size={14} className="text-navy-500" />,
          schedules: schedulesByRoom.get(r.id) ?? [],
        }))
      case 'assistant':
        return assistants.map((a) => ({
          id: a.id,
          name: a.name,
          subtitle: ASSISTANT_STATUS_LABELS[a.status],
          icon: <User size={14} className="text-navy-500" />,
          schedules: schedulesByAssistant.get(a.id) ?? [],
        }))
    }
  }

  const resources = getResources()

  return (
    <div className="flex-1 overflow-auto bg-warm-50 flex flex-col">
      {/* Dimension Tabs */}
      <div className="px-6 py-3 bg-white border-b border-warm-200/60 shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOverviewTab('doctor')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              overviewTab === 'doctor'
                ? 'bg-navy-800 text-white shadow-sm'
                : 'bg-warm-100 text-navy-500 hover:bg-warm-200'
            )}
          >
            <Stethoscope size={14} />
            医生
          </button>
          <button
            onClick={() => setOverviewTab('room')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              overviewTab === 'room'
                ? 'bg-navy-800 text-white shadow-sm'
                : 'bg-warm-100 text-navy-500 hover:bg-warm-200'
            )}
          >
            <Home size={14} />
            房间
          </button>
          <button
            onClick={() => setOverviewTab('assistant')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              overviewTab === 'assistant'
                ? 'bg-navy-800 text-white shadow-sm'
                : 'bg-warm-100 text-navy-500 hover:bg-warm-200'
            )}
          >
            <Users size={14} />
            医助
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-xs text-navy-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded ring-2 ring-coral-500 bg-coral-50" />
              <span>时间冲突</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          <div className="flex">
            {/* Resource Name Column */}
            <div className="w-40 shrink-0 sticky left-0 z-20 bg-warm-50">
              <div className="h-10 border-b border-warm-200/60 bg-white" />
              {resources.map((res) => (
                <div
                  key={res.id}
                  className="h-16 border-b border-warm-100 flex items-center gap-2 px-3 bg-white"
                >
                  <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center justify-center shrink-0">
                    {res.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-navy-800 truncate">{res.name}</div>
                    <div className="text-[10px] text-navy-400 truncate">{res.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline Column */}
            <div className="flex-1 relative">
              {/* Hour Headers */}
              <div className="flex sticky top-0 z-10 bg-white">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-10 border-b border-warm-200/60 border-r border-warm-100 flex items-center justify-center"
                    style={{ width: '96px' }}
                  >
                    <span className="text-[11px] text-navy-400 font-medium">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Resource Rows with Timeline */}
              {resources.map((res) => (
                <div key={res.id} className="relative flex" style={{ height: '64px' }}>
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="h-16 border-b border-warm-100 border-r border-warm-100 hover:bg-navy-50/30 transition-colors cursor-pointer"
                      style={{ width: '96px' }}
                      onClick={() => openAddDrawer(overviewDateStr, hour)}
                    />
                  ))}

                  {/* Current Time Indicator */}
                  {isToday && (() => {
                    const now = new Date()
                    const h = now.getHours()
                    const m = now.getMinutes()
                    if (h < 8 || h >= 18) return null
                    const left = ((h - 8) + m / 60) * 96
                    return (
                      <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `${left}px` }}>
                        <div className="flex flex-col items-center h-full">
                          <div className="w-2 h-2 rounded-full bg-coral-400 -mt-1" />
                          <div className="w-px flex-1 bg-coral-400" />
                        </div>
                      </div>
                    )
                  })()}

                  {/* Schedule Blocks */}
                  {res.schedules.map((s) => {
                    const style = getScheduleStyle(s)
                    const project = getProjectById(s.projectId)
                    const doctor = getDoctorById(s.doctorId)
                    const room = getRoomById(s.roomId)
                    const left = ((Number(s.startTime.split(':')[0]) - 8) + Number(s.startTime.split(':')[1]) / 60) * 96
                    const width = (
                      (Number(s.endTime.split(':')[0]) - Number(s.startTime.split(':')[0])) +
                      (Number(s.endTime.split(':')[1]) - Number(s.startTime.split(':')[1])) / 60
                    ) * 96
                    const isDropTarget = dropTargetScheduleId === s.id
                    const isConflicted = hasOverlap(res.schedules, s)

                    const assignedAssistants = s.assistantIds
                      .map((id) => getAssistantById(id))
                      .filter((a): a is Assistant => a !== undefined)

                    return (
                      <div
                        key={s.id}
                        data-schedule-id={s.id}
                        onClick={() => openScheduleDetail(s)}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'copy'
                          if (dropTargetScheduleId !== s.id) {
                            setDropTargetScheduleId(s.id)
                          }
                        }}
                        onDragLeave={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const x = e.clientX
                          const y = e.clientY
                          if (
                            x <= rect.left ||
                            x >= rect.right ||
                            y <= rect.top ||
                            y >= rect.bottom
                          ) {
                            setDropTargetScheduleId(null)
                          }
                        }}
                        onDrop={(e) => handleDropOnSchedule(e, s.id)}
                        className={cn(
                          'absolute top-1 bottom-1 rounded-lg border-l-4 px-2 py-1 cursor-pointer transition-all duration-150 overflow-hidden',
                          style.bg,
                          style.border,
                          style.text,
                          isConflicted && 'ring-2 ring-coral-500 border-l-coral-500 z-10',
                          isDropTarget && 'ring-2 ring-emerald-400 shadow-lg z-20 scale-[1.01]',
                          !isConflicted && !isDropTarget && 'hover:shadow-sm hover:z-10'
                        )}
                        style={{ left: `${left + 2}px`, width: `${Math.max(width - 4, 40)}px`, top: '4px', height: '56px' }}
                      >
                        <div className="flex items-center gap-1 text-xs font-semibold truncate">
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
                          <span className="truncate">{project?.name}</span>
                          {isConflicted && (
                            <AlertTriangle size={10} className="text-coral-500 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] opacity-80 truncate mt-0.5">
                          {s.customerName} · {doctor?.name}
                        </div>
                        <div className="text-[10px] opacity-70 truncate mt-0.5">
                          <Clock size={10} className="inline mr-0.5 -mt-px" />
                          {s.startTime}-{s.endTime} · {room?.name}
                        </div>
                        {assignedAssistants.length > 0 && width > 120 && (
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {assignedAssistants.slice(0, 2).map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] rounded-full bg-white/80 text-navy-600"
                              >
                                {a.name}
                              </span>
                            ))}
                            {assignedAssistants.length > 2 && (
                              <span className="text-[9px] text-navy-500">+{assignedAssistants.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScheduleDetailPanel({
  schedule,
  getDoctorById,
  getProjectById,
  getRoomById,
  getAssistantById,
  assistants,
  onAssign,
  onRemove,
}: {
  schedule: Schedule
  getDoctorById: (id: string) => { id: string; name: string; title: string } | undefined
  getProjectById: (id: string) => { id: string; name: string; category: ProjectCategory; requiredQualifications: Qualification[] } | undefined
  getRoomById: (id: string) => { id: string; name: string } | undefined
  getAssistantById: (id: string) => Assistant | undefined
  assistants: Assistant[]
  onAssign: (scheduleId: string, assistantId: string) => void
  onRemove: (scheduleId: string, assistantId: string) => void
}) {
  const doctor = getDoctorById(schedule.doctorId)
  const project = getProjectById(schedule.projectId)
  const room = getRoomById(schedule.roomId)
  const category = project?.category ?? 'injection'
  const style = CATEGORY_COLORS[category]

  const assignedAssistants = schedule.assistantIds
    .map((id) => getAssistantById(id))
    .filter((a): a is Assistant => a !== undefined)

  const recommendedAssistants = project
    ? assistants.filter((a) => {
        if (a.status === 'leave') return false
        if (schedule.assistantIds.includes(a.id)) return false
        return project.requiredQualifications.some((q) => a.qualifications.includes(q))
      })
    : []

  return (
    <div className="p-6 space-y-5">
      {/* Schedule Info Card */}
      <div className={cn('rounded-xl border-l-4 p-4', style.bg, style.border)}>
        <div className="flex items-center gap-2 mb-2">
          <span className={cn('w-2 h-2 rounded-full', style.dot)} />
          <span className={cn('font-semibold', style.text)}>{project?.name}</span>
          <span className={CATEGORY_BADGE[category]}>{PROJECT_CATEGORY_LABELS[category]}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-navy-400 text-xs">医生</span>
            <p className="font-medium text-navy-800">{doctor?.name}</p>
          </div>
          <div>
            <span className="text-navy-400 text-xs">房间</span>
            <p className="font-medium text-navy-800">{room?.name}</p>
          </div>
          <div>
            <span className="text-navy-400 text-xs">顾客</span>
            <p className="font-medium text-navy-800">{schedule.customerName}</p>
          </div>
          <div>
            <span className="text-navy-400 text-xs">时间</span>
            <p className="font-medium text-navy-800">
              {schedule.startTime}-{schedule.endTime}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-navy-400">进度</span>
          <span className="badge bg-navy-100 text-navy-700">{PROGRESS_LABELS[schedule.progress]}</span>
          {schedule.isOvertime && <span className="badge bg-coral-100 text-coral-700">超时</span>}
          {schedule.isSwapped && <span className="badge bg-amber-100 text-amber-700">换台</span>}
        </div>
        {schedule.delayReason && (
          <div className="mt-2 flex items-start gap-1.5 text-sm text-coral-600">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{schedule.delayReason}</span>
          </div>
        )}
      </div>

      {/* Assigned Assistants */}
      <div>
        <h3 className="text-sm font-semibold text-navy-800 mb-2">已配台人员</h3>
        {assignedAssistants.length === 0 ? (
          <div className="text-sm text-navy-400 py-3 text-center bg-warm-50 rounded-lg">
            暂未分配配台人员
          </div>
        ) : (
          <div className="space-y-2">
            {assignedAssistants.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-warm-50 border border-warm-200/60"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                  <UserCheck size={12} className="text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-navy-800 flex-1">{a.name}</span>
                <button
                  onClick={() => onRemove(schedule.id, a.id)}
                  className="text-xs text-coral-400 hover:text-coral-600 font-medium transition-colors"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Assistants for Assignment */}
      {project && recommendedAssistants.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <UserCheck size={14} className="text-emerald-600" />
            <h3 className="text-sm font-semibold text-navy-800">推荐配台</h3>
            <span className="text-xs text-navy-400">
              需要资质：{project.requiredQualifications.map((q) => QUALIFICATION_LABELS[q]).join('、')}
            </span>
          </div>
          <div className="space-y-2">
            {recommendedAssistants.map((a) => {
              const isFullMatch = project.requiredQualifications.every((q) =>
                a.qualifications.includes(q)
              )
              return (
                <div
                  key={a.id}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-lg border transition-all',
                    isFullMatch ? 'border-emerald-200 bg-emerald-50/30' : 'border-warm-200 bg-white'
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center justify-center">
                    <User size={12} className="text-navy-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-navy-800">{a.name}</span>
                      {isFullMatch && (
                        <span className="text-[10px] px-1.5 py-0 rounded-full bg-emerald-200 text-emerald-800 font-medium">
                          完全匹配
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 mt-0.5">
                      {a.qualifications.map((q) => (
                        <span key={q} className={cn('badge text-[10px] px-1.5 py-0', `badge-${q}`)}>
                          {QUALIFICATION_LABELS[q]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => onAssign(schedule.id, a.id)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0',
                      a.status === 'busy'
                        ? 'bg-amber-100 text-amber-600 cursor-default'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                    )}
                    disabled={a.status === 'busy'}
                  >
                    {a.status === 'busy' ? '跟台中' : '指派'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Anomaly Notes */}
      {schedule.anomalyNotes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-navy-800 mb-2">异常记录</h3>
          <div className="space-y-1">
            {schedule.anomalyNotes.map((note, i) => (
              <div key={i} className="text-sm text-navy-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200/60">
                {note}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
