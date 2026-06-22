import { useState, useMemo } from 'react';
import { Filter, UserCheck, Stethoscope, Calendar, X, ChevronDown, ArrowRight } from 'lucide-react';
import { useStore } from '@/store';
import { QUALIFICATION_LABELS, ASSISTANT_STATUS_LABELS } from '@/types';
import type { Assistant, Qualification } from '@/types';
import { cn } from '@/lib/utils';

const QUALIFICATION_OPTIONS: { value: Qualification; label: string }[] = [
  { value: 'eye_nose', label: '眼鼻手术' },
  { value: 'laser', label: '光电' },
  { value: 'injection', label: '注射' },
  { value: 'anesthesia', label: '麻醉' },
];

const STATUS_OPTIONS = [
  { value: 'idle', label: '空闲' },
  { value: 'busy', label: '跟台中' },
  { value: 'break', label: '休息' },
  { value: 'leave', label: '请假' },
];

const DEPARTMENT_OPTIONS = [
  { value: '整形外科', label: '整形外科' },
  { value: '皮肤科', label: '皮肤科' },
  { value: '微创美容', label: '微创美容' },
  { value: '麻醉科', label: '麻醉科' },
];

const STATUS_STYLES: Record<Assistant['status'], { bg: string; text: string; dot: string }> = {
  idle: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  busy: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  break: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  leave: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const AVATAR_COLORS = [
  'bg-navy-600',
  'bg-coral-500',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-violet-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Staff() {
  const assistants = useStore((s) => s.assistants);
  const schedules = useStore((s) => s.schedules);
  const doctors = useStore((s) => s.doctors);
  const projects = useStore((s) => s.projects);
  const updateAssistantStatus = useStore((s) => s.updateAssistantStatus);
  const dispatchSupport = useStore((s) => s.dispatchSupport);
  const getDoctorById = useStore((s) => s.getDoctorById);
  const getProjectById = useStore((s) => s.getProjectById);

  const [qualFilter, setQualFilter] = useState<Qualification | ''>('');
  const [statusFilter, setStatusFilter] = useState<Assistant['status'] | ''>('');
  const [deptFilter, setDeptFilter] = useState('');
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);

  const filteredAssistants = useMemo(() => {
    return assistants.filter((a) => {
      if (qualFilter && !a.qualifications.includes(qualFilter)) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (deptFilter && a.department !== deptFilter) return false;
      return true;
    });
  }, [assistants, qualFilter, statusFilter, deptFilter]);

  const activeSchedules = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return schedules.filter((s) => s.date === today && s.progress !== 'handover')
  }, [schedules]);

  function handleCardClick(assistant: Assistant) {
    setSelectedAssistant(selectedAssistant?.id === assistant.id ? null : assistant);
  }

  function handleDispatch(scheduleId: string) {
    if (!selectedAssistant) return;
    dispatchSupport(scheduleId, selectedAssistant.id);
    updateAssistantStatus(selectedAssistant.id, 'busy');
    setSelectedAssistant(null);
  }

  const busyAssistantSchedule = useMemo(() => {
    if (!selectedAssistant || selectedAssistant.status !== 'busy') return null;
    const today = new Date().toISOString().split('T')[0]
    return schedules.find(
      (s) => s.date === today && s.progress !== 'handover' && s.assistantIds?.includes(selectedAssistant.id)
    )
  }, [selectedAssistant, schedules])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-3">
          <Stethoscope className="h-7 w-7 text-navy-700" />
          <h1 className="text-2xl font-bold text-navy-900">人员状态</h1>
        </div>

        <div className="card mb-6 flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="h-4 w-4" />
            <span>筛选</span>
          </div>

          <select
            className="select-field"
            value={qualFilter}
            onChange={(e) => setQualFilter(e.target.value as Qualification | '')}
          >
            <option value="">全部资质</option>
            {QUALIFICATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            className="select-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Assistant['status'] | '')}
          >
            <option value="">全部状态</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            className="select-field"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">全部科室</option>
            {DEPARTMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {(qualFilter || statusFilter || deptFilter) && (
            <button
              className="text-sm text-coral-600 hover:text-coral-700"
              onClick={() => {
                setQualFilter('');
                setStatusFilter('');
                setDeptFilter('');
              }}
            >
              清除筛选
            </button>
          )}

          <div className="ml-auto text-sm text-gray-400">
            共 {filteredAssistants.length} 人
          </div>
        </div>

        <div className="flex gap-6">
          <div className={cn('grid gap-4', selectedAssistant ? 'grid-cols-3 flex-1' : 'grid-cols-4 flex-1')}>
            {filteredAssistants.map((assistant) => {
              const style = STATUS_STYLES[assistant.status];
              const isSelected = selectedAssistant?.id === assistant.id;
              return (
                <div
                  key={assistant.id}
                  className={cn(
                    'card-hover cursor-pointer p-4 transition-all',
                    isSelected && 'ring-2 ring-navy-500 shadow-lg'
                  )}
                  onClick={() => handleCardClick(assistant)}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-full text-base font-bold text-white',
                          getAvatarColor(assistant.name)
                        )}
                      >
                        {assistant.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900">{assistant.name}</div>
                        <div className="text-xs text-gray-400">{assistant.department}</div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'badge inline-flex items-center gap-1.5',
                        style.bg,
                        style.text
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
                      {ASSISTANT_STATUS_LABELS[assistant.status]}
                    </span>
                  </div>

                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {assistant.qualifications.map((q) => (
                      <span key={q} className={cn('badge', `badge-${q}`)}>
                        {QUALIFICATION_LABELS[q]}
                      </span>
                    ))}
                  </div>

                  {assistant.status === 'busy' && (() => {
                    const sched = schedules.find(
                      (s) => s.date === new Date().toISOString().split('T')[0] && s.progress !== 'handover' && s.assistantIds?.includes(assistant.id)
                    );
                    if (!sched) return null;
                    const doctor = getDoctorById(sched.doctorId);
                    const project = getProjectById(sched.projectId);
                    return (
                      <div className="mt-2 rounded-md bg-coral-50 px-2.5 py-1.5 text-xs text-coral-700">
                        <span className="font-medium">当前：</span>
                        {doctor?.name} · {project?.name}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {selectedAssistant && (
            <div className="w-80 shrink-0">
              <div className="card sticky top-6 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-navy-900">
                    {selectedAssistant.status === 'idle' ? '调派支援' : '跟台详情'}
                  </h3>
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => setSelectedAssistant(null)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white',
                      getAvatarColor(selectedAssistant.name)
                    )}
                  >
                    {selectedAssistant.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-navy-900">{selectedAssistant.name}</div>
                    <div className="text-sm text-gray-500">{selectedAssistant.department}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedAssistant.qualifications.map((q) => (
                        <span key={q} className={cn('badge text-xs', `badge-${q}`)}>
                          {QUALIFICATION_LABELS[q]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedAssistant.status === 'idle' ? (
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-navy-700">
                      <Calendar className="h-4 w-4" />
                      <span>需要支援的排班</span>
                    </div>
                    {activeSchedules.length === 0 ? (
                      <div className="py-6 text-center text-sm text-gray-400">
                        当前无需支援
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeSchedules.map((sched) => {
                          const doctor = getDoctorById(sched.doctorId);
                          const project = getProjectById(sched.projectId);
                          return (
                            <div
                              key={sched.id}
                              className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:border-coral-200 hover:bg-coral-50"
                            >
                              <div>
                                <div className="text-sm font-medium text-navy-800">
                                  {doctor?.name}
                                </div>
                                <div className="text-xs text-gray-500">{project?.name}</div>
                              </div>
                              <button
                                className="btn-primary flex items-center gap-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDispatch(sched.id);
                                }}
                              >
                                调派
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {busyAssistantSchedule ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-coral-100 bg-coral-50 p-3">
                          <div className="text-xs font-medium text-coral-600">当前跟台</div>
                          <div className="mt-1 text-sm font-semibold text-navy-900">
                            {getDoctorById(busyAssistantSchedule.doctorId)?.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {getProjectById(busyAssistantSchedule.projectId)?.name}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-navy-500" />
                            <span>医生：{getDoctorById(busyAssistantSchedule.doctorId)?.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-navy-500" />
                            <span>项目：{getProjectById(busyAssistantSchedule.projectId)?.name}</span>
                          </div>
                        </div>
                        <button
                          className="btn-secondary w-full text-sm"
                          onClick={() => {
                            updateAssistantStatus(selectedAssistant.id, 'idle');
                            setSelectedAssistant(null);
                          }}
                        >
                          结束跟台
                        </button>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-sm text-gray-400">
                        暂无跟台信息
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {filteredAssistants.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <Stethoscope className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p>暂无匹配的人员</p>
          </div>
        )}
      </div>
    </div>
  );
}
