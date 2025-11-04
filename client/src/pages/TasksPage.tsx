import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuth } from '../lib/AuthContext'
import styles from './TasksPage.module.css'

type Task = {
  id: string
  title: string
  description?: string
  dueDate?: string
  done: boolean
  createdAt: string
}

async function fetchTasks(page: number, search: string, sort: string) {
  const res = await api.get('/tasks', { params: { page, pageSize: 10, search, sort } })
  return res.data as { items: Task[], total: number, page: number, pageSize: number }
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('createdAt:desc')
  const { user, logout } = useAuth()
  const [taskForm, setTaskForm] = useState({ title: '', description: '', dueDate: '' })
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<null | { title?: string; message: string; onConfirm: () => void }>(null)
  const [dark, setDark] = useState<boolean>(() => {
    try { return localStorage.getItem('theme') === 'dark' } catch { return false }
  })

  useEffect(() => {
    try {
      const root = document.documentElement
      if (dark) {
        root.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        root.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    } catch {}
  }, [dark])

  // background color picker (persisted)
  const [bgColor, setBgColor] = useState<string>(() => {
    try { return localStorage.getItem('bgColor') || '' } catch { return '' }
  })

  useEffect(() => {
    try {
      const root = document.documentElement
      if (bgColor) {
        root.style.setProperty('--background', bgColor)
        localStorage.setItem('bgColor', bgColor)
      } else {
        localStorage.removeItem('bgColor')
      }
    } catch {}
  }, [bgColor])

  const { data, isLoading, error, refetch } = useQuery<{
    items: Task[]
    total: number
    page: number
    pageSize: number
  }>({
    queryKey: ['tasks', page, search, sort],
    queryFn: () => fetchTasks(page, search, sort)
  })

  const createMutation = useMutation<any, Error, Partial<Task>>({
    mutationFn: async (payload) => {
      const res = await api.post('/tasks', payload)
      return res.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Created') }
  })

  const updateMutation = useMutation<
    any,
    Error,
    { id: string, payload: Partial<Task> }
  >({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put('/tasks/' + id, payload)
      return res.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); }
  })

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete('/tasks/' + id)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Deleted') }
  })

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskForm.title.trim()) return toast.error('Title is required')
    await createMutation.mutateAsync({
      title: taskForm.title,
      description: taskForm.description || undefined,
      dueDate: taskForm.dueDate || undefined
    })
    setTaskForm({ title: '', description: '', dueDate: '' })
  }

  return (
    <div className="container">
      <div className={styles.nav}>
        <div className={styles.nav_user}>
          <div className={styles.avatar}>
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className={styles.user_info}>
            <div className={styles.welcome}>Welcome back</div>
            <div className={styles.email}>{user?.email ?? 'Guest'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            aria-label="Toggle theme"
            onClick={() => setDark(d => !d)}
            className={styles.logout_btn}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {dark ? '🌙 Dark' : '☀️ Light'}
          </button>

          <button
            className={styles.logout_btn}
            onClick={() => setConfirm({
              title: 'Logout',
              message: 'Are you sure you want to logout?',
              onConfirm: () => logout()
            })}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      </div>

      <div className={styles.form_card}>
        <div className={styles.form_header}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <h2>Add new task</h2>
        </div>
        <form onSubmit={onCreate} className={styles.add_form}>
          <div className={styles.form_group}>
            <label>Title</label>
            <input
              className={styles.form_input}
              value={taskForm.title}
              onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Enter task title"
              required
            />
          </div>
          <div className={styles.form_group}>
            <label>Description (optional)</label>
            <textarea
              className={styles.form_input}
              value={taskForm.description}
              onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Add more details about the task"
              rows={3}
            />
          </div>
          <div className={styles.form_group}>
            <label>Due date (optional)</label>
            <input
              className={styles.form_input}
              type="datetime-local"
              value={taskForm.dueDate}
              onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
          <button
            className={styles.submit_btn}
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <svg className={styles.spinner} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Task
              </>
            )}
          </button>
        </form>
      </div>

      <div className={styles.filters}>
        <div className={styles.search_box}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filter_group}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className={styles.sort_select}
          >
            <option value="createdAt:desc">Newest first</option>
            <option value="createdAt:asc">Oldest first</option>
            <option value="title:asc">A-Z</option>
            <option value="title:desc">Z-A</option>
            <option value="dueDate:asc">Due date (earliest)</option>
            <option value="dueDate:desc">Due date (latest)</option>
          </select>
          <button
            className={styles.refresh}
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <polyline points="23 20 23 14 17 14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.state_message}>
          {/* ... spinner ... */}
          <div>Loading your tasks...</div>
        </div>
      ) : error ? (
        <div className={styles.state_message}>
          {/* ... error icon ... */}
          <div>Error loading tasks</div>
          <button onClick={() => refetch()}>Try again</button>
        </div>
      ) : !data?.items?.length ? (
        <div className={styles.state_message}>
          {/* ... empty icon ... */}
          <div>No tasks found</div>
          <div className={styles.empty_message}>Try a different search or add your first task!</div>
        </div>
      ) : (
        <div className={styles.task_container}>
          {data.items.map(t => (
            <div key={t.id} className={`${styles.task_card} ${t.done ? styles.completed : ''}`}>
              <div className={styles.task_header}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={t.done}
                  onChange={e => updateMutation.mutate({
                    id: t.id,
                    payload: { done: e.target.checked }
                  })}
                  disabled={updateMutation.isPending}
                />
                <div className={styles.task_title}>{t.title}</div>
              </div>

              {t.description && (
                <div className={styles.task_desc}>{t.description}</div>
              )}

              <div className={styles.task_meta}>
                <span>Created: {new Date(t.createdAt).toLocaleString()}</span>
                {t.dueDate && (
                  <span className={new Date(t.dueDate) < new Date() ? styles.overdue : ''}>
                    Due: {new Date(t.dueDate).toLocaleString()}
                  </span>
                )}
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.edit}
                  onClick={() => {
                    setTaskForm({
                      title: t.title,
                      description: t.description || '',
                      dueDate: t.dueDate || ''
                    })
                    setEditingTask(t.id)
                  }}
                  disabled={updateMutation.isPending}
                >
                  Edit
                </button>
                <button
                  className={styles.delete}
                  onClick={() => setConfirm({
                    title: 'Delete task',
                    message: 'Are you sure you want to delete this task?',
                    onConfirm: () => deleteMutation.mutate(t.id)
                  })}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {confirm && (
        <div className={styles.modal_overlay} onClick={() => setConfirm(null)}>
          <div className={styles.modal_content} onClick={e => e.stopPropagation()}>
            <div className={styles.modal_header}>
              <h2>{confirm.title || 'Confirm'}</h2>
              <button className={styles.modal_close} onClick={() => setConfirm(null)}>✕</button>
            </div>
            <div className={styles.edit_form}>
              <div style={{ color: 'var(--text-secondary)' }}>{confirm.message}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button className={styles.cancel_btn} onClick={() => setConfirm(null)}>Cancel</button>
                <button className={styles.save_btn} onClick={() => { confirm.onConfirm(); setConfirm(null); }}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {data && data.total > data.pageSize && (
        <div className={styles.pagination}>
          <button
            onClick={() => setPage(p => Math.max(1, p-1))}
            disabled={page === 1}
          >
            ← Previous
          </button>
          <span>
            Page {data.page} of {Math.ceil(data.total / data.pageSize)}
          </span>
          <button
            onClick={() => setPage(p => p+1)}
            disabled={page * data.pageSize >= data.total}
          >
            Next →
          </button>
        </div>
      )}
      {editingTask && (
        <div className={styles.modal_overlay} onClick={() => setEditingTask(null)}>
          <div className={styles.modal_content} onClick={e => e.stopPropagation()}>
            <div className={styles.modal_header}>
              <h2>Edit task</h2>
              <button
                className={styles.modal_close}
                onClick={() => setEditingTask(null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form
              className={styles.edit_form}
              onSubmit={(e) => {
                e.preventDefault()
                if (!taskForm.title.trim() || !editingTask) return
                updateMutation.mutate({
                  id: editingTask,
                  payload: {
                    title: taskForm.title,
                    description: taskForm.description || undefined,
                    dueDate: taskForm.dueDate || undefined
                  }
                })
                setEditingTask(null)
                setTaskForm({ title: '', description: '', dueDate: '' })
              }}
            >
              <div className={styles.form_group}>
                <label>Title</label>
                <input
                  className={styles.form_input}
                  value={taskForm.title}
                  onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div className={styles.form_group}>
                <label>Description (optional)</label>
                <textarea
                  className={styles.form_input}
                  value={taskForm.description}
                  onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Add more details about the task"
                  rows={3}
                />
              </div>
              <div className={styles.form_group}>
                <label>Due date (optional)</label>
                <input
                  className={styles.form_input}
                  type="datetime-local"
                  value={taskForm.dueDate}
                  onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
              <div className={styles.modal_actions}>
                <button
                  type="button"
                  className={styles.cancel_btn}
                  onClick={() => setEditingTask(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.save_btn}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
