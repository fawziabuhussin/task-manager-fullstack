// client/src/pages/VerifyPage.tsx
import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { auth, devLinks } from '../lib/api'

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6)
})
type Form = z.infer<typeof schema>

export default function VerifyPage() {
  const nav = useNavigate()
  const loc = useLocation() as any
  const defaultEmail = loc?.state?.email || ''
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: defaultEmail } })

  const onSubmit = async (data: Form) => {
    try {
      await auth.verify(data.email, data.code)
      toast.success('Email verified — you can login now.')
      nav('/login', { state: { email: data.email } })
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Verification failed')
    }
  }

  const devMailbox = devLinks.mailbox()

  return (
    <div className="container">
      <div className="nav"><Link to="/signup">Signup</Link> <Link to="/login">Login</Link></div>
      <div className="card">
        <h1>Verify your email</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label>Email</label>
          <input type="email" {...register('email')} />
          {errors.email && <div className="badge">{errors.email.message}</div>}
          <label>Code</label>
          <input type="text" maxLength={6} {...register('code')} />
          {errors.code && <div className="badge">{errors.code.message}</div>}
          <div style={{ marginTop: 12 }}>
            <button disabled={isSubmitting}>Verify</button>
          </div>
        </form>
      </div>
      <p className="container">Check <a href={devMailbox} target="_blank" rel="noreferrer">Dev Mailbox</a> for your code.</p>
    </div>
  )
}
