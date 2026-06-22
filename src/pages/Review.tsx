import { useState, useMemo } from 'react';
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
} from 'recharts';
import {
  Calendar,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useStore } from '@/store';
import { cn } from '@/lib/utils';

const CHART_COLORS = ['#3b5998', '#ff6b6b', '#10b981', '#f59e0b'];

export default function Review() {
  const schedules = useStore((s) => s.schedules);
  const doctors = useStore((s) => s.doctors);
  const assistants = useStore((s) => s.assistants);
  const projects = useStore((s) => s.projects);
  const getDoctorById = useStore((s) => s.getDoctorById);
  const getProjectById = useStore((s) => s.getProjectById);
  const getAssistantById = useStore((s) => s.getAssistantById);

  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  const filtered = useMemo(
    () => schedules.filter((s) => s.date === selectedDate),
    [schedules, selectedDate],
  );

  const totalSchedules = filtered.length;
  const overtimeCount = filtered.filter((s) => s.isOvertime).length;
  const swappedCount = filtered.filter((s) => s.isSwapped).length;
  const anomalyCount = filtered.reduce(
    (acc, s) => acc + (s.anomalyNotes?.length ?? 0),
    0,
  );

  const assistantChartData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      s.assistantIds?.forEach((id) => {
        map.set(id, (map.get(id) ?? 0) + 1);
      });
    });
    return Array.from(map.entries()).map(([id, count]) => ({
      name: getAssistantById?.(id)?.name ?? id,
      count,
    }));
  }, [filtered, getAssistantById]);

  const doctorChartData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      map.set(s.doctorId, (map.get(s.doctorId) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([id, count]) => ({
      name: getDoctorById?.(id)?.name ?? id,
      count,
    }));
  }, [filtered, getDoctorById]);

  const anomalyPieData = useMemo(() => {
    const counts = { 延误: 0, 耗材不足: 0, 临时换台: 0, 其他: 0 };
    filtered.forEach((s) => {
      if (s.isOvertime) counts['延误']++;
      if (s.anomalyNotes?.some((n) => n.includes('耗材'))) counts['耗材不足']++;
      if (s.isSwapped) counts['临时换台']++;
      const labeled =
        (s.isOvertime ? 1 : 0) +
        (s.anomalyNotes?.some((n) => n.includes('耗材')) ? 1 : 0) +
        (s.isSwapped ? 1 : 0);
      const totalAnomalies = (s.anomalyNotes?.length ?? 0) + (s.isOvertime ? 1 : 0) + (s.isSwapped ? 1 : 0);
      if (totalAnomalies > labeled) counts['其他'] += totalAnomalies - labeled;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const overtimeSchedules = useMemo(
    () => filtered.filter((s) => s.isOvertime),
    [filtered],
  );

  const swappedSchedules = useMemo(
    () => filtered.filter((s) => s.isSwapped),
    [filtered],
  );

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
          })),
        ),
    [filtered, getDoctorById, getProjectById],
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">跟台统计复盘</h1>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="card rounded-lg p-4">
          <h3 className="section-title mb-3 text-sm font-semibold text-navy-700">
            跟台量 - 助手
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={assistantChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b5998" name="跟台量" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card rounded-lg p-4">
          <h3 className="section-title mb-3 text-sm font-semibold text-navy-700">
            跟台量 - 医生
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={doctorChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#ff6b6b" name="跟台量" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card rounded-lg p-4">
        <h3 className="section-title mb-3 text-sm font-semibold text-navy-700">
          异常分类占比
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={anomalyPieData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
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
        <h3 className="section-title mb-3 text-sm font-semibold text-navy-700">
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
                  className={cn(
                    'border-b',
                    s.isOvertime && 'bg-coral-50',
                  )}
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
                  <td className="px-3 py-4 text-center text-gray-400" colSpan={7}>
                    当日无超时台次
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card rounded-lg p-4">
        <h3 className="section-title mb-3 text-sm font-semibold text-navy-700">
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
                  <span className="font-mono text-xs text-gray-500">{s.id}</span>
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
        <h3 className="section-title mb-3 text-sm font-semibold text-navy-700">
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
  );
}
