// client/src/pages/SignupPage.tsx
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { auth, devLinks } from '../lib/api'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})
type Form = z.infer<typeof schema>

export default function SignupPage() {
  const nav = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: Form) => {
    try {
      await auth.signup(data.email, data.password)
      toast.success('Signup ok — check Dev Mailbox for the code.')
      nav('/verify', { state: { email: data.email } })
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Signup failed')
    }
  }

  const devMailbox = devLinks.mailbox()

  return (
    <div className="container">
      <div className="nav"><Link to="/login">Login</Link> <Link to="/tasks">Tasks</Link></div>
      <div className="card">
        <h1>Create your account</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label>Email</label>
          <input type="email" {...register('email')} />
          {errors.email && <div className="badge">{errors.email.message}</div>}
          <label>Password</label>
          <input type="password" {...register('password')} />
          {errors.password && <div className="badge">{errors.password.message}</div>}
          <div style={{ marginTop: 12 }}>
            <button disabled={isSubmitting}>Sign up</button>
          </div>
        </form>
      </div>
      <p className="container">Dev Mailbox: <a href={devMailbox} target="_blank" rel="noreferrer">open</a></p>
    </div>
  )
}
