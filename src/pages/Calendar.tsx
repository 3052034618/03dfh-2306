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
} from 'lucide-react'
import { format, addDays, startOfWeek, isSameDay, parseISO, differenceInMinutes } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Schedule, ProjectCategory, Qualification } from '@/types'
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

type ViewMode = 'week' | 'day'

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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)

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

  const goToPrev = useCallback(() => {
    setCurrentDate((d) => addDays(d, viewMode === 'week' ? -7 : -1))
  }, [viewMode])

  const goToNext = useCallback(() => {
    setCurrentDate((d) => addDays(d, viewMode === 'week' ? 7 : 1))
  }, [viewMode])

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const selectedProject = useMemo(() => projects.find((p) => p.id === form.projectId), [projects, form.projectId])

  const recommendedAssistants = useMemo(() => {
    if (!selectedProject) return []
    return assistants.filter((a) => {
      if (a.status === 'leave') return false
      return selectedProject.requiredQualifications.some((q) => a.qualifications.includes(q))
    })
  }, [selectedProject, assistants])

  const handleFormChange = useCallback((field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

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
  }, [projects])

  const handleSubmit = useCallback(() => {
    if (!form.doctorId || !form.projectId || !form.roomId || !form.customerName || !form.date || !form.startTime || !form.endTime) return

    const newSchedule: Schedule = {
      id: `s_${Date.now()}`,
      doctorId: form.doctorId,
      roomId: form.roomId,
      assistantIds: [],
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
    setSelectedSchedule(newSchedule)
    setForm(EMPTY_FORM)
  }, [form, addSchedule])

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
        id: `n_${Date.now()}`,
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

  const openAddDrawer = useCallback((date?: string, hour?: number) => {
    setForm({
      ...EMPTY_FORM,
      date: date ?? format(new Date(), 'yyyy-MM-dd'),
      startTime: hour ? `${String(hour).padStart(2, '0')}:00` : '09:00',
      endTime: hour ? `${String(hour + 1).padStart(2, '0')}:00` : '10:00',
    })
    setSelectedSchedule(null)
    setDrawerOpen(true)
  }, [])

  const openScheduleDetail = useCallback(
    (schedule: Schedule) => {
      setSelectedSchedule(schedule)
      setForm(EMPTY_FORM)
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

      return (
        <div
          key={schedule.id}
          onClick={() => openScheduleDetail(schedule)}
          className={cn(
            'absolute left-1 right-1 rounded-lg border-l-4 px-2 py-1 cursor-pointer transition-all duration-150 overflow-hidden',
            style.bg,
            style.border,
            style.text,
            isSelected ? 'ring-2 ring-coral-400 shadow-md z-10' : 'hover:shadow-sm hover:z-10'
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
          {schedule.delayReason && (
            <div className="flex items-center gap-0.5 text-[10px] text-coral-500 mt-0.5">
              <AlertCircle size={10} />
              <span className="truncate">{schedule.delayReason}</span>
            </div>
          )}
        </div>
      )
    },
    [getScheduleStyle, getDoctorById, getProjectById, getRoomById, getScheduleTop, getScheduleHeight, selectedSchedule, openScheduleDetail, viewMode]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
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
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">房间</label>
                    <select
                      className="select-field"
                      value={form.roomId}
                      onChange={(e) => handleFormChange('roomId', e.target.value)}
                    >
                      <option value="">请选择房间</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.status === 'idle' ? '空闲' : '占用'})
                        </option>
                      ))}
                    </select>
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
                        <div className="space-y-2">
                          {recommendedAssistants.map((a) => {
                            const matchCount = a.qualifications.filter((q) =>
                              selectedProject.requiredQualifications.includes(q)
                            ).length
                            const isFullMatch = selectedProject.requiredQualifications.every((q) =>
                              a.qualifications.includes(q)
                            )

                            return (
                              <div
                                key={a.id}
                                className={cn(
                                  'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
                                  isFullMatch
                                    ? 'border-emerald-200 bg-emerald-50/50'
                                    : 'border-warm-200 bg-white',
                                  a.status === 'busy' && 'opacity-60'
                                )}
                              >
                                <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center shrink-0">
                                  <User size={14} className="text-navy-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-navy-800">{a.name}</span>
                                    <span
                                      className={cn(
                                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                                        a.status === 'idle'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : a.status === 'busy'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-warm-200 text-navy-500'
                                      )}
                                    >
                                      {ASSISTANT_STATUS_LABELS[a.status]}
                                    </span>
                                    {isFullMatch && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-medium">
                                        完全匹配
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    {a.qualifications.map((q) => {
                                      const isMatch = selectedProject.requiredQualifications.includes(q)
                                      return (
                                        <span
                                          key={q}
                                          className={cn(
                                            'badge text-[10px] px-1.5 py-0',
                                            isMatch ? `badge-${q}` : 'bg-warm-100 text-navy-400'
                                          )}
                                        >
                                          {QUALIFICATION_LABELS[q]}
                                        </span>
                                      )
                                    })}
                                    <span className="text-[10px] text-navy-300 ml-1">
                                      匹配 {matchCount}/{selectedProject.requiredQualifications.length}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  className={cn(
                                    'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shrink-0',
                                    a.status === 'busy'
                                      ? 'bg-warm-100 text-navy-300 cursor-not-allowed'
                                      : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                                  )}
                                  disabled={a.status === 'busy'}
                                  onClick={() => {
                                    if (form.doctorId && form.projectId && form.roomId && form.customerName && form.date) {
                                      const tempSchedule: Schedule = {
                                        id: `s_temp_${Date.now()}`,
                                        doctorId: form.doctorId,
                                        roomId: form.roomId,
                                        assistantIds: [],
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
                                      addSchedule(tempSchedule)
                                      handleAssignAssistant(tempSchedule.id, a.id)
                                    }
                                  }}
                                >
                                  指派
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
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
                  disabled={!form.doctorId || !form.projectId || !form.roomId || !form.customerName || !form.date}
                  className={cn(
                    'w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
                    form.doctorId && form.projectId && form.roomId && form.customerName && form.date
                      ? 'bg-navy-800 text-white hover:bg-navy-700 active:scale-[0.98]'
                      : 'bg-warm-200 text-navy-300 cursor-not-allowed'
                  )}
                >
                  确认添加排班
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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
  getAssistantById: (id: string) => { id: string; name: string; status: string } | undefined
  assistants: { id: string; name: string; status: string; qualifications: Qualification[] }[]
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
    .filter(Boolean)

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
            {assignedAssistants.map((a) =>
              a ? (
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
              ) : null
            )}
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
