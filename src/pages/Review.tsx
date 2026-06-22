import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Calendar,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  Clock,
  Activity,
  Sunrise,
  User,
  LayoutGrid,
  Stethoscope,
  FileCheck,
  Check,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import { ROOM_TYPE_LABELS, PROGRESS_LABELS, HANDOVER_ITEM_LABELS } from '@/types'

const CHART_COLORS = ['#3b5998', '#ff6b6b', '#10b981', '#f59e0b']

type ViewTab = 'stats' | 'morning'

export default function Review() {
  const schedules = useStore((s) => s.schedules)
  const doctors = useStore((s) => s.doctors)
  const assistants = useStore((s) => s.assistants)
  const projects = useStore((s) => s.projects)
  const rooms = useStore((s) => s.rooms)
  const getDoctorById = useStore((s) => s.getDoctorById)
  const getProjectById = useStore((s) => s.getProjectById)
  const getAssistantById = useStore((s) => s.getAssistantById)
  const getRoomById = useStore((s) => s.getRoomById)

  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [viewTab, setViewTab] = useState<ViewTab>('stats')

  const filtered = useMemo(
    () => schedules.filter((s) => s.date === selectedDate),
    [schedules, selectedDate]
  )

  const totalSchedules = filtered.length
  const overtimeCount = filtered.filter((s) => s.isOvertime).length
  const swappedCount = filtered.filter((s) => s.isSwapped).length
  const anomalyCount = filtered.reduce(
    (acc, s) => acc + (s.anomalyNotes?.length ?? 0),
    0
  )

  const assistantChartData = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((s) => {
      s.assistantIds?.forEach((id) => {
        map.set(id, (map.get(id) ?? 0) + 1)
      })
    })
    return Array.from(map.entries()).map(([id, count]) => ({
      name: getAssistantById?.(id)?.name ?? id,
      count,
    }))
  }, [filtered, getAssistantById])

  const doctorChartData = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((s) => {
      map.set(s.doctorId, (map.get(s.doctorId) ?? 0) + 1)
    })
    return Array.from(map.entries()).map(([id, count]) => ({
      name: getDoctorById?.(id)?.name ?? id,
      count,
    }))
  }, [filtered, getDoctorById])

  const projectChartData = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((s) => {
      map.set(s.projectId, (map.get(s.projectId) ?? 0) + 1)
    })
    return Array.from(map.entries()).map(([id, count]) => ({
      name: getProjectById?.(id)?.name ?? id,
      count,
    }))
  }, [filtered, getProjectById])

  const anomalyPieData = useMemo(() => {
    const counts = { 延误: 0, '耗材不足': 0, '临时换台': 0, 其他: 0 }
    filtered.forEach((s) => {
      if (s.isOvertime) counts['延误']++
      if (s.anomalyNotes?.some((n) => n.includes('耗材'))) counts['耗材不足']++
      if (s.isSwapped) counts['临时换台']++
      const labeled =
        (s.isOvertime ? 1 : 0) +
        (s.anomalyNotes?.some((n) => n.includes('耗材')) ? 1 : 0) +
        (s.isSwapped ? 1 : 0)
      const totalAnomalies =
        (s.anomalyNotes?.length ?? 0) + (s.isOvertime ? 1 : 0) + (s.isSwapped ? 1 : 0)
      if (totalAnomalies > labeled) counts['其他'] += totalAnomalies - labeled
    })
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
  }, [filtered])

  const overtimeSchedules = useMemo(
    () => filtered.filter((s) => s.isOvertime),
    [filtered]
  )

  const swappedSchedules = useMemo(
    () => filtered.filter((s) => s.isSwapped),
    [filtered]
  )

  const allAnomalyNotes = useMemo(
    () =>
      filtered
        .filter((s) => s.anomalyNotes && s.anomalyNotes.length > 0)
        .flatMap((s) =>
          s.anomalyNotes.map((note) => ({
            scheduleId: s.id,
            customerName: s.customerName,
            doctorName: getDoctorById?.(s.doctorId)?.name ?? s.doctorId,
            projectName: getProjectById?.(s.projectId)?.name ?? s.projectId,
            note,
          }))
        ),
    [filtered, getDoctorById, getProjectById]
  )

  const morningProjectSummary = useMemo(() => {
    const map = new Map<string, { name: string; count: number; anomalies: string[] }>()
    filtered.forEach((s) => {
      const project = getProjectById(s.projectId)
      const name = project?.name ?? s.projectId
      const existing = map.get(s.projectId)
      const scheduleAnomalies: string[] = []
      if (s.isOvertime) scheduleAnomalies.push('超时')
      if (s.isSwapped) scheduleAnomalies.push('临时换台')
      if (s.delayReason) scheduleAnomalies.push(s.delayReason)
      if (s.anomalyNotes?.length) scheduleAnomalies.push(...s.anomalyNotes)

      if (existing) {
        existing.count++
        existing.anomalies.push(...scheduleAnomalies)
      } else {
        map.set(s.projectId, { name, count: 1, anomalies: [...scheduleAnomalies] })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [filtered, getProjectById])

  const morningDoctorSummary = useMemo(() => {
    const map = new Map<string, { name: string; title: string; count: number; anomalies: string[] }>()
    filtered.forEach((s) => {
      const doctor = getDoctorById(s.doctorId)
      const name = doctor?.name ?? s.doctorId
      const existing = map.get(s.doctorId)
      const scheduleAnomalies: string[] = []
      if (s.isOvertime) scheduleAnomalies.push('超时')
      if (s.isSwapped) scheduleAnomalies.push('临时换台')
      if (s.delayReason) scheduleAnomalies.push(s.delayReason)

      if (existing) {
        existing.count++
        existing.anomalies.push(...scheduleAnomalies)
      } else {
        map.set(s.doctorId, { name, title: doctor?.title ?? '', count: 1, anomalies: [...scheduleAnomalies] })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [filtered, getDoctorById])

  const morningRoomSummary = useMemo(() => {
    const map = new Map<string, { name: string; type: string; count: number; schedules: { time: string; doctor: string; project: string; progress: string }[] }>()
    filtered.forEach((s) => {
      const room = getRoomById(s.roomId)
      const name = room?.name ?? s.roomId
      const type = room?.type ?? ''
      const existing = map.get(s.roomId)

      const entry = {
        time: `${s.startTime}-${s.endTime}`,
        doctor: getDoctorById(s.doctorId)?.name ?? s.doctorId,
        project: getProjectById(s.projectId)?.name ?? s.projectId,
        progress: PROGRESS_LABELS[s.progress],
      }

      if (existing) {
        existing.count++
        existing.schedules.push(entry)
      } else {
        map.set(s.roomId, { name, type, count: 1, schedules: [entry] })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [filtered, getRoomById, getDoctorById, getProjectById])

  const morningAnomalySummary = useMemo(() => {
    return filtered
      .filter((s) => s.isOvertime || s.isSwapped || (s.anomalyNotes?.length ?? 0) > 0 || s.delayReason)
      .map((s) => ({
        id: s.id,
        customerName: s.customerName,
        doctorName: getDoctorById(s.doctorId)?.name ?? s.doctorId,
        projectName: getProjectById(s.projectId)?.name ?? s.projectId,
        roomName: getRoomById(s.roomId)?.name ?? s.roomId,
        time: `${s.startTime}-${s.endTime}`,
        tags: [
          s.isOvertime ? '超时' : null,
          s.isSwapped ? '临时换台' : null,
          s.delayReason ?? null,
        ].filter(Boolean) as string[],
        notes: s.anomalyNotes ?? [],
      }))
  }, [filtered, getDoctorById, getProjectById, getRoomById])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-warm-200/60 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="section-title">跟台统计复盘</h1>
            <div className="flex items-center bg-warm-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewTab('stats')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                  viewTab === 'stats' ? 'bg-white text-navy-800 shadow-sm' : 'text-navy-400 hover:text-navy-600'
                )}
              >
                <Activity size={14} />
                统计分析
              </button>
              <button
                onClick={() => setViewTab('morning')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                  viewTab === 'morning' ? 'bg-white text-navy-800 shadow-sm' : 'text-navy-400 hover:text-navy-600'
                )}
              >
                <Sunrise size={14} />
                晨会看板
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-navy-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="btn-secondary rounded-md border px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      {viewTab === 'morning' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="stat-card card flex items-center gap-3 rounded-lg p-4">
              <div className="rounded-full bg-navy-100 p-2">
                <ClipboardList className="h-5 w-5 text-navy-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">今日台次</p>
                <p className="text-2xl font-bold text-navy-700">{totalSchedules}</p>
              </div>
            </div>
            <div className="stat-card card flex items-center gap-3 rounded-lg p-4">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="h-5 w-5 text-coral-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">异常台次</p>
                <p className="text-2xl font-bold text-coral-500">
                  {filtered.filter((s) => s.isOvertime || s.isSwapped || (s.anomalyNotes?.length ?? 0) > 0).length}
                </p>
              </div>
            </div>
            <div className="stat-card card flex items-center gap-3 rounded-lg p-4">
              <div className="rounded-full bg-emerald-100 p-2">
                <Stethoscope className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">出诊医生</p>
                <p className="text-2xl font-bold text-emerald-600">{morningDoctorSummary.length}</p>
              </div>
            </div>
            <div className="stat-card card flex items-center gap-3 rounded-lg p-4">
              <div className="rounded-full bg-amber-100 p-2">
                <LayoutGrid className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">启用房间</p>
                <p className="text-2xl font-bold text-amber-500">{morningRoomSummary.length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="card rounded-lg p-5">
              <h3 className="mb-4 text-sm font-semibold text-navy-700 flex items-center gap-2">
                <ClipboardList size={16} className="text-navy-500" />
                按项目汇总
              </h3>
              <div className="space-y-3">
                {morningProjectSummary.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-warm-50 border border-warm-200/60">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-800">{item.name}</p>
                      {item.anomalies.length > 0 && (
                        <p className="mt-1 text-[11px] text-coral-500 truncate">
                          {item.anomalies.slice(0, 3).join('、')}
                          {item.anomalies.length > 3 ? ` 等${item.anomalies.length}项` : ''}
                        </p>
                      )}
                    </div>
                    <span className="text-2xl font-bold text-navy-700 shrink-0 ml-3">{item.count}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-1">台</span>
                  </div>
                ))}
                {morningProjectSummary.length === 0 && (
                  <p className="text-center text-gray-400 py-4 text-sm">当日无排班</p>
                )}
              </div>
            </div>

            <div className="card rounded-lg p-5">
              <h3 className="mb-4 text-sm font-semibold text-navy-700 flex items-center gap-2">
                <User size={16} className="text-coral-500" />
                按医生汇总
              </h3>
              <div className="space-y-3">
                {morningDoctorSummary.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-warm-50 border border-warm-200/60">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-800">{item.name}</p>
                      {item.title && <p className="text-[11px] text-gray-400">{item.title}</p>}
                      {item.anomalies.length > 0 && (
                        <p className="mt-1 text-[11px] text-coral-500 truncate">
                          {item.anomalies.slice(0, 3).join('、')}
                        </p>
                      )}
                    </div>
                    <span className="text-2xl font-bold text-coral-500 shrink-0 ml-3">{item.count}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-1">台</span>
                  </div>
                ))}
                {morningDoctorSummary.length === 0 && (
                  <p className="text-center text-gray-400 py-4 text-sm">当日无排班</p>
                )}
              </div>
            </div>
          </div>

          <div className="card rounded-lg p-5">
            <h3 className="mb-4 text-sm font-semibold text-navy-700 flex items-center gap-2">
              <LayoutGrid size={16} className="text-emerald-500" />
              按房间汇总
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {morningRoomSummary.map((item) => (
                <div key={item.name} className="p-3 rounded-lg bg-warm-50 border border-warm-200/60">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold text-navy-800">{item.name}</span>
                      {item.type && (
                        <span className="ml-2 text-[10px] text-gray-400">
                          ({ROOM_TYPE_LABELS[item.type as keyof typeof ROOM_TYPE_LABELS] ?? item.type})
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-bold text-emerald-600">{item.count}<span className="text-xs text-gray-400 ml-0.5">台</span></span>
                  </div>
                  <div className="space-y-1">
                    {item.schedules.map((sch, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                        <Clock size={10} className="text-gray-400 shrink-0" />
                        <span className="shrink-0">{sch.time}</span>
                        <span className="truncate">{sch.doctor} · {sch.project}</span>
                        <span className="text-[10px] text-navy-400 shrink-0">({sch.progress})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {morningRoomSummary.length === 0 && (
                <p className="col-span-2 text-center text-gray-400 py-4 text-sm">当日无房间使用</p>
              )}
            </div>
          </div>

          <div className="card rounded-lg p-5">
            <h3 className="mb-4 text-sm font-semibold text-navy-700 flex items-center gap-2">
              <FileCheck size={16} className="text-cyan-500" />
              术后交接情况
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-cyan-50 rounded-lg p-3 text-center">
                <p className="text-xs text-navy-500">交接中台次</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {filtered.filter((s) => s.progress === 'handover' && !s.handoverCompletedAt).length}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xs text-navy-500">已完成交接</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {filtered.filter((s) => s.handoverCompletedAt).length}
                </p>
              </div>
              <div className="bg-warm-100 rounded-lg p-3 text-center">
                <p className="text-xs text-navy-500">进行中</p>
                <p className="text-2xl font-bold text-navy-700">
                  {filtered.filter((s) => s.progress !== 'handover').length}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {filtered
                .filter((s) => s.progress === 'handover')
                .map((s) => {
                  const doctor = getDoctorById(s.doctorId)
                  const project = getProjectById(s.projectId)
                  const room = getRoomById(s.roomId)
                  const done = !!s.handoverCompletedAt
                  const h = s.handover
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        'p-3 rounded-lg border',
                        done ? 'bg-emerald-50 border-emerald-200' : 'bg-cyan-50 border-cyan-200'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-navy-800 truncate">
                            {doctor?.name} · {project?.name}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">
                            {room?.name} · {s.startTime}-{s.endTime}
                          </span>
                        </div>
                        {done ? (
                          <span className="badge rounded-full bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 flex items-center gap-1 shrink-0">
                            <CheckCircle2 size={10} />
                            已完成
                          </span>
                        ) : (
                          <span className="badge rounded-full bg-cyan-100 text-cyan-700 text-[10px] px-2 py-0.5 shrink-0">
                            交接中
                          </span>
                        )}
                      </div>
                      {h && (
                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div className={cn('flex items-center gap-1', h.customer_departed ? 'text-emerald-600' : 'text-gray-400')}>
                            {h.customer_departed ? <Check size={10} /> : <Circle size={10} />}
                            {HANDOVER_ITEM_LABELS.customer_departed}
                          </div>
                          <div className={cn('flex items-center gap-1', h.consumables_collected ? 'text-emerald-600' : 'text-gray-400')}>
                            {h.consumables_collected ? <Check size={10} /> : <Circle size={10} />}
                            {HANDOVER_ITEM_LABELS.consumables_collected}
                          </div>
                          <div className={cn('flex items-center gap-1', h.photos_archived ? 'text-emerald-600' : 'text-gray-400')}>
                            {h.photos_archived ? <Check size={10} /> : <Circle size={10} />}
                            {HANDOVER_ITEM_LABELS.photos_archived}
                          </div>
                        </div>
                      )}
                      {h?.review_note && (
                        <p className="mt-2 text-[10px] text-navy-500 bg-white/60 rounded px-2 py-1">
                          📝 {h.review_note}
                        </p>
                      )}
                      {done && s.handoverCompletedAt && (
                        <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[10px] text-emerald-700 flex items-center justify-between">
                          <span>
                            完成时间：{new Date(s.handoverCompletedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>处理人：{s.handoverCompletedBy ?? '—'}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              {filtered.filter((s) => s.progress === 'handover').length === 0 && (
                <p className="text-center text-gray-400 py-3 text-sm">当日暂无交接中台次</p>
              )}
            </div>
          </div>

          {morningAnomalySummary.length > 0 && (
            <div className="card rounded-lg p-5">
              <h3 className="mb-4 text-sm font-semibold text-navy-700 flex items-center gap-2">
                <AlertTriangle size={16} className="text-coral-500" />
                重点关注台次
              </h3>
              <div className="space-y-2">
                {morningAnomalySummary.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-coral-200 bg-coral-50/50"
                  >
                    <AlertTriangle size={14} className="text-coral-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-navy-800">{item.doctorName}</span>
                        <span className="text-sm text-gray-500">{item.projectName}</span>
                        <span className="text-xs text-gray-400">{item.roomName}</span>
                        <span className="text-xs text-gray-400">{item.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {item.tags.map((tag, idx) => (
                          <span key={idx} className="badge rounded-full bg-coral-100 text-coral-700 text-[10px] px-1.5 py-0">
                            {tag}
                          </span>
                        ))}
                      </div>
                      {item.notes.length > 0 && (
                        <p className="mt-1 text-[11px] text-coral-600">
                          {item.notes.join('；')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="stat-card card flex items-center gap-3 rounded-lg p-4">
              <div className="rounded-full bg-navy-100 p-2">
                <ClipboardList className="h-5 w-5 text-navy-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">总台次数</p>
                <p className="text-2xl font-bold text-navy-700">{totalSchedules}</p>
              </div>
            </div>
            <div className="stat-card card flex items-center gap-3 rounded-lg p-4">
              <div className="rounded-full bg-red-100 p-2">
                <Clock className="h-5 w-5 text-coral-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">超时台次</p>
                <p className="text-2xl font-bold text-coral-500">{overtimeCount}</p>
              </div>
            </div>
            <div className="stat-card card flex items-center gap-3 rounded-lg p-4">
              <div className="rounded-full bg-amber-100 p-2">
                <RefreshCw className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">临时换台</p>
                <p className="text-2xl font-bold text-amber-500">{swappedCount}</p>
              </div>
            </div>
            <div className="stat-card card flex items-center gap-3 rounded-lg p-4">
              <div className="rounded-full bg-emerald-100 p-2">
                <AlertTriangle className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">异常记录</p>
                <p className="text-2xl font-bold text-emerald-600">{anomalyCount}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="card rounded-lg p-4">
              <h3 className="mb-3 text-sm font-semibold text-navy-700 flex items-center gap-2">
                <Activity size={14} className="text-navy-500" />
                跟台量 - 助手
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={assistantChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b5998" name="跟台量" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card rounded-lg p-4">
              <h3 className="mb-3 text-sm font-semibold text-navy-700 flex items-center gap-2">
                <Activity size={14} className="text-coral-500" />
                跟台量 - 医生
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={doctorChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ff6b6b" name="跟台量" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card rounded-lg p-4">
              <h3 className="mb-3 text-sm font-semibold text-navy-700 flex items-center gap-2">
                <Activity size={14} className="text-emerald-500" />
                跟台量 - 项目
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={projectChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" name="台数" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card rounded-lg p-4">
            <h3 className="mb-3 text-sm font-semibold text-navy-700">
              异常分类占比
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={anomalyPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  dataKey="value"
                >
                  {anomalyPieData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card rounded-lg p-4">
            <h3 className="mb-3 text-sm font-semibold text-navy-700">
              超时台次详情
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="px-3 py-2">台次ID</th>
                    <th className="px-3 py-2">医生</th>
                    <th className="px-3 py-2">项目</th>
                    <th className="px-3 py-2">客户</th>
                    <th className="px-3 py-2">时间范围</th>
                    <th className="px-3 py-2">超时</th>
                    <th className="px-3 py-2">延误原因</th>
                  </tr>
                </thead>
                <tbody>
                  {overtimeSchedules.map((s) => (
                    <tr
                      key={s.id}
                      className={cn('border-b', s.isOvertime && 'bg-coral-50')}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{s.id}</td>
                      <td className="px-3 py-2">
                        {getDoctorById?.(s.doctorId)?.name ?? s.doctorId}
                      </td>
                      <td className="px-3 py-2">
                        {getProjectById?.(s.projectId)?.name ?? s.projectId}
                      </td>
                      <td className="px-3 py-2">{s.customerName}</td>
                      <td className="px-3 py-2">
                        {s.startTime} - {s.endTime}
                      </td>
                      <td className="px-3 py-2">
                        {s.isOvertime && (
                          <span className="badge rounded-full bg-coral-400 px-2 py-0.5 text-xs text-white">
                            超时
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-coral-600">
                        {s.delayReason ?? '-'}
                      </td>
                    </tr>
                  ))}
                  {overtimeSchedules.length === 0 && (
                    <tr>
                      <td
                        className="px-3 py-4 text-center text-gray-400"
                        colSpan={7}
                      >
                        当日无超时台次
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card rounded-lg p-4">
            <h3 className="mb-3 text-sm font-semibold text-navy-700">
              临时换台记录
            </h3>
            {swappedSchedules.length > 0 ? (
              <div className="space-y-2">
                {swappedSchedules.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-gray-500">
                        {s.id}
                      </span>
                      <span className="font-medium">
                        {getDoctorById?.(s.doctorId)?.name ?? s.doctorId}
                      </span>
                      <span className="text-gray-500">
                        {getProjectById?.(s.projectId)?.name ?? s.projectId}
                      </span>
                      <span className="text-gray-400">{s.customerName}</span>
                    </div>
                    <span className="badge rounded-full bg-amber-400 px-2 py-0.5 text-xs text-white">
                      临时换台
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400">当日无临时换台记录</p>
            )}
          </div>

          <div className="card rounded-lg p-4">
            <h3 className="mb-3 text-sm font-semibold text-navy-700">
              异常记录
            </h3>
            {allAnomalyNotes.length > 0 ? (
              <div className="space-y-2">
                {allAnomalyNotes.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{item.note}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        台次 {item.scheduleId} · {item.doctorName} · {item.projectName} · {item.customerName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400">当日无异常记录</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
