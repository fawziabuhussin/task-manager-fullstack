// src/pages/LoginPage.tsx
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})
type Form = z.infer<typeof schema>

export default function LoginPage() {
  const nav = useNavigate()
  const loc = useLocation() as any
  const defaultEmail = loc?.state?.email || ''
  const { login } = useAuth()
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: defaultEmail } })

  const onSubmit = async (data: Form) => {
    try {
      await login(data.email, data.password)
      toast.success('Logged in')
      nav('/tasks')
    } catch (e: any) {
      if (e?.code === 'UNVERIFIED') {
        toast.error('Email not verified — please enter the code we sent.')
        nav('/verify', { state: { email: data.email } })
        return
      }
      toast.error(e?.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="container">
      <div className="nav"><Link to="/signup">Signup</Link> <Link to="/tasks">Tasks</Link></div>
      <div className="card">
        <h1>Log in</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label>Email</label>
          <input type="email" {...register('email')} />
          {errors.email && <div className="badge">{errors.email.message}</div>}
          <label>Password</label>
          <input type="password" {...register('password')} />
          {errors.password && <div className="badge">{errors.password.message}</div>}
          <div style={{ marginTop: 12 }}>
            <button disabled={isSubmitting}>Login</button>
          </div>
        </form>
      </div>
      <p className="container">If you get a lockout message, wait 2 minutes.</p>
    </div>
  )
}
