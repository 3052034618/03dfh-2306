import { useState, useMemo } from 'react'
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
} from 'lucide-react'
import type { ProgressStage, RoomStatus } from '@/types'
import {
  PROGRESS_LABELS,
  ROOM_STATUS_LABELS,
  ROOM_TYPE_LABELS,
  QUALIFICATION_LABELS,
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

  const [delayModalRoomId, setDelayModalRoomId] = useState<string | null>(null)
  const [selectedDelayReason, setSelectedDelayReason] = useState<string | null>(null)
  const [customDelayReason, setCustomDelayReason] = useState('')
  const [supportPopoverRoomId, setSupportPopoverRoomId] = useState<string | null>(null)
  const [confirmStage, setConfirmStage] = useState<{
    scheduleId: string
    stage: ProgressStage
  } | null>(null)

  const roomData = useMemo(() => {
    return rooms.map((room) => {
      const schedule = getScheduleForRoom(room.id)
      const doctor = schedule ? getDoctorById(schedule.doctorId) : null
      const project = schedule ? getProjectById(schedule.projectId) : null
      const assistants = schedule
        ? schedule.assistantIds.map((id) => getAssistantById(id)).filter(Boolean)
        : []
      return { room, schedule, doctor, project, assistants }
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
    setConfirmStage({ scheduleId, stage })
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
          {roomData.map(({ room, schedule, doctor, project, assistants }) => {
            const statusCfg = STATUS_CONFIG[room.status]
            const stageIdx = schedule ? getStageIndex(schedule.progress) : -1
            const badgeInfo = ROOM_TYPE_BADGE[room.type]

            return (
              <div key={room.id} className={cn('card card-hover border', statusCfg.border)}>
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

                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    {PROGRESS_STAGES.map((stage, idx) => {
                      const isCompleted = idx < stageIdx
                      const isCurrent = idx === stageIdx
                      const isFuture = idx > stageIdx

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
                                isCurrent && 'bg-emerald-400 text-white animate-progress-pulse',
                                isFuture && 'bg-gray-200 text-gray-400',
                                !schedule && 'bg-gray-100 text-gray-300'
                              )}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span
                              className={cn(
                                'whitespace-nowrap text-[10px]',
                                isCompleted && 'text-emerald-600',
                                isCurrent && 'text-emerald-500 font-medium',
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
