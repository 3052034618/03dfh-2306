import { useState } from 'react'
import { ShieldCheck, AlertTriangle, PackageX, Package, FileText } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import { PROJECT_CATEGORY_LABELS } from '@/types'
import type { Consumable, ConsumableStatus } from '@/types'

const STATUS_LABELS: Record<ConsumableStatus, string> = {
  safe: '安全',
  warning: '预警',
  out_of_stock: '缺货',
}

const STATUS_BADGE: Record<ConsumableStatus, string> = {
  safe: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  out_of_stock: 'bg-coral-100 text-coral-600',
}

const STATUS_PROGRESS: Record<ConsumableStatus, string> = {
  safe: 'bg-emerald-500',
  warning: 'bg-amber-500',
  out_of_stock: 'bg-coral-400',
}

export default function Consumables() {
  const consumables = useStore((s) => s.consumables)
  const projects = useStore((s) => s.projects)
  const addConsumableRequest = useStore((s) => s.addConsumableRequest)
  const getProjectById = useStore((s) => s.getProjectById)

  const [modalConsumable, setModalConsumable] = useState<Consumable | null>(null)
  const [note, setNote] = useState('')

  const safeCount = consumables.filter((c) => c.status === 'safe').length
  const warningCount = consumables.filter((c) => c.status === 'warning').length
  const outOfStockCount = consumables.filter((c) => c.status === 'out_of_stock').length

  const handleSubmitRequest = () => {
    if (!modalConsumable || !note.trim()) return
    addConsumableRequest(modalConsumable.id, note.trim())
    setNote('')
    setModalConsumable(null)
  }

  const getConsumableById = (id: string) => consumables.find((c) => c.id === id)

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h2 className="section-title">耗材预警</h2>
        <p className="text-sm text-navy-400 mt-1">实时监控耗材库存状态，及时预警与补货</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ShieldCheck size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-navy-400">安全数量</p>
              <p className="text-2xl font-semibold text-emerald-600">{safeCount}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-navy-400">预警数量</p>
              <p className="text-2xl font-semibold text-amber-600">{warningCount}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-coral-100 flex items-center justify-center">
              <PackageX size={20} className="text-coral-500" />
            </div>
            <div>
              <p className="text-xs text-navy-400">缺货数量</p>
              <p className="text-2xl font-semibold text-coral-500">{outOfStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-200/60 flex items-center gap-2">
          <Package size={18} className="text-navy-600" />
          <h3 className="font-semibold text-navy-800">耗材库存列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200/60 bg-warm-50/50">
                <th className="text-left px-5 py-3 font-medium text-navy-500">名称</th>
                <th className="text-left px-5 py-3 font-medium text-navy-500">当前库存</th>
                <th className="text-left px-5 py-3 font-medium text-navy-500">预警阈值</th>
                <th className="text-left px-5 py-3 font-medium text-navy-500">单位</th>
                <th className="text-left px-5 py-3 font-medium text-navy-500">状态</th>
                <th className="text-right px-5 py-3 font-medium text-navy-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {consumables.map((c) => {
                const maxVal = Math.max(c.stock, c.threshold) * 1.2
                const pct = Math.min((c.stock / maxVal) * 100, 100)
                return (
                  <tr
                    key={c.id}
                    className={cn(
                      'border-b border-warm-200/40 transition-colors',
                      c.status === 'out_of_stock' && 'bg-coral-50/50'
                    )}
                  >
                    <td className="px-5 py-3 font-medium text-navy-800">{c.name}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <div className="flex-1 h-2 bg-warm-200 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', STATUS_PROGRESS[c.status])}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-navy-700 font-medium w-8 text-right">{c.stock}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-navy-500">{c.threshold}</td>
                    <td className="px-5 py-3 text-navy-500">{c.unit}</td>
                    <td className="px-5 py-3">
                      <span className={cn('badge', STATUS_BADGE[c.status])}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        className="btn-secondary text-xs px-3 py-1.5"
                        onClick={() => {
                          setModalConsumable(c)
                          setNote('')
                        }}
                      >
                        提报申请
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-200/60 flex items-center gap-2">
          <FileText size={18} className="text-navy-600" />
          <h3 className="font-semibold text-navy-800">项目耗材关联</h3>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          {projects.map((project) => {
            const projectConsumables = project.consumableIds
              .map((id) => getConsumableById(id))
              .filter(Boolean) as Consumable[]
            const hasInsufficient = projectConsumables.some(
              (c) => c.status === 'warning' || c.status === 'out_of_stock'
            )

            return (
              <div
                key={project.id}
                className={cn(
                  'rounded-xl border p-4 transition-all',
                  hasInsufficient
                    ? 'border-coral-300 bg-coral-50/40'
                    : 'border-warm-200/60 bg-white'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-navy-800">{project.name}</h4>
                    <span className={cn('badge badge-${project.category} text-[10px] mt-1', `badge-${project.category}`)}>
                      {PROJECT_CATEGORY_LABELS[project.category]}
                    </span>
                  </div>
                  {hasInsufficient && (
                    <span className="badge bg-coral-100 text-coral-600">
                      <AlertTriangle size={12} className="mr-1" />
                      耗材不足
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {projectConsumables.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="text-navy-600">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-navy-400">
                          {c.stock}/{c.threshold}{c.unit}
                        </span>
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            c.status === 'safe' && 'bg-emerald-500',
                            c.status === 'warning' && 'bg-amber-500',
                            c.status === 'out_of_stock' && 'bg-coral-400'
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modalConsumable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalConsumable(null)}>
          <div
            className="card p-6 w-full max-w-md animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="section-title text-lg mb-1">提报申请</h3>
            <p className="text-sm text-navy-400 mb-4">
              耗材：<span className="font-medium text-navy-700">{modalConsumable.name}</span>
              （当前库存 {modalConsumable.stock} {modalConsumable.unit}）
            </p>
            <label className="block text-sm font-medium text-navy-600 mb-1">备注</label>
            <input
              type="text"
              className="input-field mb-4"
              placeholder="请输入补货备注信息"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitRequest()}
            />
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setModalConsumable(null)}>
                取消
              </button>
              <button
                className="btn-primary"
                disabled={!note.trim()}
                onClick={handleSubmitRequest}
              >
                提交申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
