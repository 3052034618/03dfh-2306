import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import {
  Clock,
  User,
  Scissors,
  ChevronRight,
  AlertTriangle,
  Users,
  X,
  Send,
  MessageSquare,
  CheckCircle2,
  Check,
  FileCheck,
} from 'lucide-react'
import type { ProgressStage, RoomStatus, HandoverItemKey, Schedule } from '@/types'
import {
  PROGRESS_LABELS,
  ROOM_STATUS_LABELS,
  ROOM_TYPE_LABELS,
  QUALIFICATION_LABELS,
  HANDOVER_ITEM_LABELS,
} from '@/types'

const PROGRESS_STAGES: ProgressStage[] = [
  'preparing',
  'arrived',
  'anesthesia_done',
  'doctor_in',
  'operating',
  'handover',
]

const STATUS_CONFIG: Record<
  RoomStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  idle: {
    label: ROOM_STATUS_LABELS.idle,
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
  preparing: {
    label: ROOM_STATUS_LABELS.preparing,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
  },
  in_progress: {
    label: ROOM_STATUS_LABELS.in_progress,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-400',
  },
  handover: {
    label: ROOM_STATUS_LABELS.handover,
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    dot: 'bg-cyan-400',
  },
}

const DELAY_REASONS = [
  '顾客迟到',
  '麻醉延迟',
  '设备故障',
  '耗材不足',
  '医生延迟',
]

type BadgeVariant = 'eye_nose' | 'laser' | 'injection' | 'anesthesia'

const ROOM_TYPE_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  operating: { variant: 'eye_nose', label: ROOM_TYPE_LABELS.operating },
  laser: { variant: 'laser', label: ROOM_TYPE_LABELS.laser },
  injection: { variant: 'injection', label: ROOM_TYPE_LABELS.injection },
}

export default function Rooms() {
  const rooms = useStore((s) => s.rooms)
  const schedules = useStore((s) => s.schedules)
  const getDoctorById = useStore((s) => s.getDoctorById)
  const getProjectById = useStore((s) => s.getProjectById)
  const getAssistantById = useStore((s) => s.getAssistantById)
  const getScheduleForRoom = useStore((s) => s.getScheduleForRoom)
  const updateScheduleProgress = useStore((s) => s.updateScheduleProgress)
  const reportDelay = useStore((s) => s.reportDelay)
  const dispatchSupport = useStore((s) => s.dispatchSupport)
  const toggleHandoverItem = useStore((s) => s.toggleHandoverItem)
  const completeHandover = useStore((s) => s.completeHandover)

  const [delayModalRoomId, setDelayModalRoomId] = useState<string | null>(null)
  const [selectedDelayReason, setSelectedDelayReason] = useState<string | null>(null)
  const [customDelayReason, setCustomDelayReason] = useState('')
  const [supportPopoverRoomId, setSupportPopoverRoomId] = useState<string | null>(null)
  const [handoverModalSchedule, setHandoverModalSchedule] = useState<Schedule | null>(null)
  const [confirmStage, setConfirmStage] = useState<{
    scheduleId: string
    stage: ProgressStage
  } | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const [highlightRoomId, setHighlightRoomId] = useState<string | null>(null)
  const roomCardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const scheduleId = searchParams.get('scheduleId')
    const roomId = searchParams.get('roomId')
    if (!scheduleId && !roomId) return

    let targetRoomId = roomId
    let targetSchedule: Schedule | null = null

    if (scheduleId) {
      targetSchedule = schedules.find((s) => s.id === scheduleId) || null
      if (targetSchedule) {
        targetRoomId = targetSchedule.roomId
      }
    }

    if (targetRoomId) {
      setHighlightRoomId(targetRoomId)
      requestAnimationFrame(() => {
        const el = roomCardRefs.current[targetRoomId!]
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
      const t = setTimeout(() => setHighlightRoomId(null), 3000)
      return () => clearTimeout(t)
    }

    if (targetSchedule && targetSchedule.progress === 'handover' && !targetSchedule.handoverCompletedAt) {
      setHandoverModalSchedule(targetSchedule)
    }
  }, [searchParams, schedules])

  function clearUrlParams() {
    if (searchParams.has('scheduleId') || searchParams.has('roomId')) {
      const next = new URLSearchParams(searchParams)
      next.delete('scheduleId')
      next.delete('roomId')
      next.delete('date')
      setSearchParams(next)
    }
  }

  const roomData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return rooms.map((room) => {
      const schedule = getScheduleForRoom(room.id)
      const doctor = schedule ? getDoctorById(schedule.doctorId) : null
      const project = schedule ? getProjectById(schedule.projectId) : null
      const assistants = schedule
        ? schedule.assistantIds.map((id) => getAssistantById(id)).filter(Boolean)
        : []
      const completedToday = schedules.filter(
        (s) => s.roomId === room.id && s.date === today && s.handoverCompletedAt
      ).sort((a, b) => (b.handoverCompletedAt ?? '').localeCompare(a.handoverCompletedAt ?? ''))
      return { room, schedule, doctor, project, assistants, completedToday }
    })
  }, [rooms, schedules, getScheduleForRoom, getDoctorById, getProjectById, getAssistantById])

  const idleAssistants = useStore((s) => s.assistants).filter((a) => a.status === 'idle')

  const currentDelaySchedule = delayModalRoomId
    ? getScheduleForRoom(delayModalRoomId)
    : null

  const currentSupportSchedule = supportPopoverRoomId
    ? getScheduleForRoom(supportPopoverRoomId)
    : null

  const currentSupportProject = currentSupportSchedule
    ? getProjectById(currentSupportSchedule.projectId)
    : null

  const eligibleAssistants = useMemo(() => {
    if (!currentSupportProject) return idleAssistants
    return idleAssistants.filter((a) =>
      a.qualifications.some((q) => currentSupportProject.requiredQualifications.includes(q))
    )
  }, [idleAssistants, currentSupportProject])

  function getStageIndex(progress: ProgressStage | undefined): number {
    if (!progress) return -1
    return PROGRESS_STAGES.indexOf(progress)
  }

  function handleAdvanceStage(scheduleId: string, stage: ProgressStage) {
    if (stage === 'handover') {
      updateScheduleProgress(scheduleId, stage)
      const sched = schedules.find((s) => s.id === scheduleId)
      if (sched) {
        setTimeout(() => {
          const updated = useStore.getState().schedules.find((s) => s.id === scheduleId)
          if (updated) setHandoverModalSchedule(updated)
        }, 0)
      }
    } else {
      setConfirmStage({ scheduleId, stage })
    }
  }

  function confirmAdvanceStage() {
    if (!confirmStage) return
    updateScheduleProgress(confirmStage.scheduleId, confirmStage.stage)
    setConfirmStage(null)
  }

  function handleSubmitDelay() {
    if (!currentDelaySchedule) return
    const reason = selectedDelayReason || customDelayReason.trim()
    if (!reason) return
    reportDelay(currentDelaySchedule.id, reason)
    setDelayModalRoomId(null)
    setSelectedDelayReason(null)
    setCustomDelayReason('')
  }

  function handleDispatch(assistantId: string) {
    if (!currentSupportSchedule) return
    dispatchSupport(currentSupportSchedule.id, assistantId)
    setSupportPopoverRoomId(null)
  }

  function handleToggleHandoverItem(item: HandoverItemKey, value?: boolean | string) {
    if (!handoverModalSchedule) return
    toggleHandoverItem(handoverModalSchedule.id, item, value)
    const updated = useStore.getState().schedules.find((s) => s.id === handoverModalSchedule.id)
    if (updated) setHandoverModalSchedule(updated)
  }

  function handleCompleteHandover() {
    if (!handoverModalSchedule) return
    const h = handoverModalSchedule.handover
    if (!h || !h.customer_departed || !h.consumables_collected || !h.photos_archived) return
    completeHandover(handoverModalSchedule.id)
    setHandoverModalSchedule(null)
    clearUrlParams()
  }

  function closeHandoverModal() {
    setHandoverModalSchedule(null)
    clearUrlParams()
  }

  const handoverCompleted = !!handoverModalSchedule?.handoverCompletedAt

  const handoverAllDone = handoverModalSchedule?.handover
    ? handoverModalSchedule.handover.customer_departed &&
      handoverModalSchedule.handover.consumables_collected &&
      handoverModalSchedule.handover.photos_archived
    : false

  return (
    <div className="min-h-screen bg-navy-950 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">术间看板</h1>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('zh-CN')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {roomData.map(({ room, schedule, doctor, project, assistants, completedToday }) => {
            const statusCfg = STATUS_CONFIG[room.status]
            const stageIdx = schedule ? getStageIndex(schedule.progress) : -1
            const badgeInfo = ROOM_TYPE_BADGE[room.type]
            const isHandover = schedule?.progress === 'handover' && !schedule.handoverCompletedAt

            const isHighlight = highlightRoomId === room.id

            return (
              <div
                key={room.id}
                ref={(el) => { roomCardRefs.current[room.id] = el }}
                className={cn(
                  'card card-hover border transition-all duration-300',
                  statusCfg.border,
                  isHighlight && 'ring-2 ring-coral-500 ring-offset-2 ring-offset-warm-50 scale-[1.02] shadow-xl z-10'
                )}
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-navy-900">{room.name}</span>
                    {badgeInfo && (
                      <span className={cn('badge', `badge-${badgeInfo.variant}`)}>
                        {badgeInfo.label}
                      </span>
                    )}
                  </div>
                  <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', statusCfg.bg, statusCfg.color)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
                    {statusCfg.label}
                  </div>
                </div>

                <div className="px-4 pt-3">
                  {schedule && doctor && project ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-navy-800">
                        <User className="h-3.5 w-3.5 text-coral-500" />
                        <span className="font-medium">{doctor.name}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-600">{project.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-navy-700">
                        <Scissors className="h-3.5 w-3.5 text-coral-400" />
                        <span>{schedule.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          {schedule.startTime} - {schedule.endTime}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-sm text-gray-400">当前空闲</div>
                  )}
                </div>

                {completedToday.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <div className="mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs font-medium text-navy-700">
                        今日已完成交接 {completedToday.length} 台
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {completedToday.slice(0, 2).map((s) => {
                        const doc = getDoctorById(s.doctorId)
                        const proj = getProjectById(s.projectId)
                        const time = s.handoverCompletedAt
                          ? new Date(s.handoverCompletedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                          : ''
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setHandoverModalSchedule(s)
                            }}
                            className="flex items-center justify-between rounded-md bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800 cursor-pointer hover:bg-emerald-100 transition-colors"
                          >
                            <span className="truncate">
                              {doc?.name ?? ''} · {proj?.name ?? ''}
                            </span>
                            <span className="shrink-0 text-emerald-600">{time}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    {PROGRESS_STAGES.map((stage, idx) => {
                      const isCompleted = idx < stageIdx
                      const isCurrent = idx === stageIdx
                      const isFuture = idx > stageIdx
                      const isHandoverStage = stage === 'handover' && isCurrent

                      return (
                        <div key={stage} className="flex items-center">
                          <button
                            type="button"
                            disabled={!schedule}
                            onClick={() => schedule && handleAdvanceStage(schedule.id, stage)}
                            className={cn(
                              'group relative flex flex-col items-center gap-1',
                              !schedule && 'cursor-default'
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all',
                                isCompleted && 'bg-emerald-500 text-white',
                                isCurrent && !isHandoverStage && 'bg-emerald-400 text-white animate-progress-pulse',
                                isHandoverStage && 'bg-cyan-400 text-white animate-progress-pulse',
                                isFuture && 'bg-gray-200 text-gray-400',
                                !schedule && 'bg-gray-100 text-gray-300'
                              )}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : isHandoverStage ? (
                                <FileCheck className="h-3.5 w-3.5" />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span
                              className={cn(
                                'whitespace-nowrap text-[10px]',
                                isCompleted && 'text-emerald-600',
                                isCurrent && !isHandoverStage && 'text-emerald-500 font-medium',
                                isHandoverStage && 'text-cyan-600 font-medium',
                                isFuture && 'text-gray-400',
                                !schedule && 'text-gray-300'
                              )}
                            >
                              {PROGRESS_LABELS[stage]}
                            </span>
                          </button>
                          {idx < PROGRESS_STAGES.length - 1 && (
                            <ChevronRight
                              className={cn(
                                'mx-0.5 h-3 w-3 flex-shrink-0',
                                idx < stageIdx ? 'text-emerald-400' : 'text-gray-300'
                              )}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {assistants.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-2.5">
                    <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                      <Users className="h-3 w-3" />
                      <span>协助人员</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assistants.map((ast) => (
                        <div key={ast.id} className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-100 text-[10px] font-medium text-navy-700">
                            {ast.name.slice(-1)}
                          </div>
                          <span className="text-xs text-gray-600">{ast.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {schedule && (
                  <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDelayModalRoomId(room.id)
                        setSelectedDelayReason(null)
                        setCustomDelayReason('')
                      }}
                      className="btn-danger flex flex-1 items-center justify-center gap-1"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      反馈延误
                    </button>
                    {isHandover ? (
                      <button
                        type="button"
                        onClick={() => setHandoverModalSchedule(schedule)}
                        className="btn-primary flex flex-1 items-center justify-center gap-1 bg-cyan-600 hover:bg-cyan-700"
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        交接清单
                      </button>
                    ) : (
                      <div className="relative flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            setSupportPopoverRoomId(
                              supportPopoverRoomId === room.id ? null : room.id
                            )
                          }
                          className="btn-secondary flex w-full items-center justify-center gap-1"
                        >
                          <Send className="h-3.5 w-3.5" />
                          调派支援
                        </button>
                        {supportPopoverRoomId === room.id && (
                          <div className="absolute bottom-full left-0 z-30 mb-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-medium text-navy-800">空闲协助人员</span>
                              <button
                                type="button"
                                onClick={() => setSupportPopoverRoomId(null)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {eligibleAssistants.length === 0 ? (
                              <p className="py-2 text-center text-xs text-gray-400">暂无符合条件的空闲人员</p>
                            ) : (
                              <ul className="space-y-1">
                                {eligibleAssistants.map((ast) => (
                                  <li key={ast.id}>
                                    <button
                                      type="button"
                                      onClick={() => handleDispatch(ast.id)}
                                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-emerald-50"
                                    >
                                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-100 text-xs font-medium text-navy-700">
                                        {ast.name.slice(-1)}
                                      </div>
                                      <div>
                                        <div className="text-xs font-medium text-navy-800">{ast.name}</div>
                                        <div className="text-[10px] text-gray-400">
                                          {ast.qualifications.map((q) => QUALIFICATION_LABELS[q]).join('、')}
                                        </div>
                                      </div>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {delayModalRoomId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-navy-900">反馈延误原因</h2>
              <button
                type="button"
                onClick={() => setDelayModalRoomId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {DELAY_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setSelectedDelayReason(reason === selectedDelayReason ? null : reason)
                    setCustomDelayReason('')
                  }}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition-colors',
                    selectedDelayReason === reason
                      ? 'border-coral-400 bg-coral-50 text-coral-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <textarea
                value={customDelayReason}
                onChange={(e) => {
                  setCustomDelayReason(e.target.value)
                  setSelectedDelayReason(null)
                }}
                placeholder="或输入自定义原因…"
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-navy-800 placeholder:text-gray-400 focus:border-coral-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDelayModalRoomId(null)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmitDelay}
                disabled={!selectedDelayReason && !customDelayReason.trim()}
                className="btn-danger flex items-center gap-1 disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" />
                提交延误
              </button>
            </div>
          </div>
        </div>
      )}

      {handoverModalSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className={cn('h-5 w-5', handoverCompleted ? 'text-emerald-600' : 'text-cyan-600')} />
                <h2 className="text-lg font-semibold text-navy-900">
                  {handoverCompleted ? '交接完成记录' : '术后交接清单'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeHandoverModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={cn('mb-4 rounded-lg border p-3 text-sm',
              handoverCompleted
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-cyan-50 border-cyan-200'
            )}>
              <div className={cn('font-medium', handoverCompleted ? 'text-emerald-800' : 'text-cyan-800')}>
                {handoverModalSchedule.customerName}
              </div>
              <div className={cn('text-xs mt-0.5', handoverCompleted ? 'text-emerald-600' : 'text-cyan-600')}>
                {getDoctorById(handoverModalSchedule.doctorId)?.name} ·{' '}
                {getProjectById(handoverModalSchedule.projectId)?.name} ·{' '}
                {handoverModalSchedule.startTime}-{handoverModalSchedule.endTime}
              </div>
              {handoverCompleted && handoverModalSchedule.handoverCompletedAt && (
                <div className="mt-2 pt-2 border-t border-emerald-200/60 text-xs text-emerald-700 space-y-0.5">
                  <div>完成时间：{new Date(handoverModalSchedule.handoverCompletedAt).toLocaleString('zh-CN')}</div>
                  <div>处理人：{handoverModalSchedule.handoverCompletedBy ?? '—'}</div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {(['customer_departed', 'consumables_collected', 'photos_archived'] as const).map((key) => {
                const checked = handoverModalSchedule.handover?.[key] ?? false
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={handoverCompleted}
                    onClick={() => handleToggleHandoverItem(key)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                      handoverCompleted && 'cursor-default',
                      checked
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-warm-200 hover:border-emerald-300'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all',
                        checked ? 'bg-emerald-500 text-white' : 'border-2 border-warm-300'
                      )}
                    >
                      {checked && <Check size={12} />}
                    </div>
                    <span className={cn('text-sm', checked ? 'text-emerald-700 font-medium' : 'text-navy-700')}>
                      {HANDOVER_ITEM_LABELS[key]}
                    </span>
                  </button>
                )
              })}

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">
                  {HANDOVER_ITEM_LABELS.review_note}
                </label>
                {handoverCompleted ? (
                  <div className="w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-navy-700 min-h-[72px] whitespace-pre-wrap">
                    {handoverModalSchedule.handover?.review_note || '暂无备注'}
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    value={handoverModalSchedule.handover?.review_note ?? ''}
                    onChange={(e) => handleToggleHandoverItem('review_note', e.target.value)}
                    placeholder="记录台次复盘重点：顾客特殊反应、操作细节、耗材消耗异常…"
                    className="w-full resize-none rounded-lg border border-warm-200 px-3 py-2 text-sm text-navy-800 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-between items-center">
              <span className={cn('text-xs', handoverAllDone ? 'text-emerald-600' : 'text-gray-400')}>
                {handoverCompleted
                  ? '交接已完成，房间与人员已释放'
                  : handoverAllDone
                    ? '已完成全部交接项'
                    : '请完成所有必选项后再释放房间'}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeHandoverModal}
                  className="btn-secondary"
                >
                  {handoverCompleted ? '关闭' : '稍后处理'}
                </button>
                {!handoverCompleted && (
                  <button
                    type="button"
                    onClick={handleCompleteHandover}
                    disabled={!handoverAllDone}
                    className={cn(
                      'btn-primary flex items-center gap-1',
                      !handoverAllDone && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    完成交接
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-semibold text-navy-900">确认推进阶段</h3>
            <p className="mb-5 text-sm text-gray-600">
              确认将进度推进至
              <span className="mx-1 font-medium text-emerald-600">
                {PROGRESS_LABELS[confirmStage.stage]}
              </span>
              ？
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmStage(null)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmAdvanceStage}
                className="btn-primary"
              >
                确认推进
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
