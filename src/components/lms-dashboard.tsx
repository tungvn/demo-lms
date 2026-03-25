'use client'

import { useEffect, useState, useTransition } from 'react'
import { CalendarDays, GraduationCap, RefreshCw, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const STORAGE_KEYS = {
  parents: 'demo-lms.parents',
  students: 'demo-lms.students',
  subscriptions: 'demo-lms.subscriptions',
  selectedParentId: 'demo-lms.selected-parent-id',
  selectedStudentId: 'demo-lms.selected-student-id',
}

const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

const DAY_LABELS: Record<(typeof WEEK_DAYS)[number], string> = {
  monday: 'Thu 2',
  tuesday: 'Thu 3',
  wednesday: 'Thu 4',
  thursday: 'Thu 5',
  friday: 'Thu 6',
  saturday: 'Thu 7',
  sunday: 'CN',
}

type GenderValue = 'MALE' | 'FEMALE'

type ParentRecord = {
  id: string
  name: string
  email: string
  phone: string
  createdAt?: string
  updatedAt?: string
}

type StudentRecord = {
  id: string
  parentId: string
  name: string
  dob?: string | null
  gender?: GenderValue | null
  currentGrade?: string | null
  createdAt?: string
  updatedAt?: string
}

type SubscriptionRecord = {
  id: string
  studentId: string
  packageName: string
  startDate: string
  endDate: string
  totalSessions: number
  usedSessions: number
}

type ClassRecord = {
  id: string
  name: string
  subject: string
  dayOfWeek: string
  timeSlot: string
  teacherName: string
  maxStudents: number
  _count?: {
    registrations: number
  }
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10)
}

function getDateAfter(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function parseApiError(payload: unknown) {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = payload.error
    if (typeof error === 'string' && error.trim()) {
      return error
    }
  }

  return 'Co loi xay ra. Vui long thu lai.'
}

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json()
    return parseApiError(payload)
  } catch {
    return 'Khong the doc phan hoi tu may chu.'
  }
}

function readStoredState<T>(key: string, fallback: T) {
  if (typeof window === 'undefined') {
    return fallback
  }

  const rawValue = window.localStorage.getItem(key)
  if (!rawValue) {
    return fallback
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return fallback
  }
}

function getTimeSlotStart(timeSlot: string) {
  const match = timeSlot.match(/^(\d{2}):(\d{2})/)
  if (!match) {
    return Number.MAX_SAFE_INTEGER
  }

  return Number(match[1]) * 60 + Number(match[2])
}

function isSubscriptionActive(subscription: SubscriptionRecord) {
  const today = getTodayValue()
  return (
    subscription.startDate.slice(0, 10) <= today &&
    subscription.endDate.slice(0, 10) >= today &&
    subscription.usedSessions < subscription.totalSessions
  )
}

function getClassesForCell(classes: ClassRecord[], day: string, timeSlot: string) {
  return classes.filter((classItem) => classItem.dayOfWeek === day && classItem.timeSlot === timeSlot)
}

export function LmsDashboard() {
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [parents, setParents] = useState<ParentRecord[]>([])
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([])
  const [selectedParentId, setSelectedParentId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [classesLoading, setClassesLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [submittingKey, setSubmittingKey] = useState<string | null>(null)

  const [parentForm, setParentForm] = useState({
    name: '',
    email: '',
    phone: '',
  })

  const [studentForm, setStudentForm] = useState({
    parentId: '',
    name: '',
    dob: '',
    gender: 'UNSPECIFIED',
    currentGrade: '',
  })

  const [subscriptionForm, setSubscriptionForm] = useState({
    studentId: '',
    packageName: '4 buoi / thang',
    startDate: getTodayValue(),
    endDate: getDateAfter(30),
    totalSessions: '4',
  })

  useEffect(() => {
    setParents(readStoredState<ParentRecord[]>(STORAGE_KEYS.parents, []))
    setStudents(readStoredState<StudentRecord[]>(STORAGE_KEYS.students, []))
    setSubscriptions(readStoredState<SubscriptionRecord[]>(STORAGE_KEYS.subscriptions, []))
    setSelectedParentId(readStoredState<string>(STORAGE_KEYS.selectedParentId, ''))
    setSelectedStudentId(readStoredState<string>(STORAGE_KEYS.selectedStudentId, ''))
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    void loadClasses(false)
  }, [])

  useEffect(() => {
    if (!parents.length) {
      if (selectedParentId) {
        setSelectedParentId('')
      }
      if (studentForm.parentId) {
        setStudentForm((current) => ({ ...current, parentId: '' }))
      }
      return
    }

    const hasSelectedParent = parents.some((parent) => parent.id === selectedParentId)
    const nextParentId = hasSelectedParent ? selectedParentId : parents[0].id

    if (nextParentId !== selectedParentId) {
      setSelectedParentId(nextParentId)
    }

    if (studentForm.parentId !== nextParentId) {
      setStudentForm((current) => ({ ...current, parentId: nextParentId }))
    }
  }, [parents, selectedParentId, studentForm.parentId])

  useEffect(() => {
    if (!students.length) {
      if (selectedStudentId) {
        setSelectedStudentId('')
      }
      if (subscriptionForm.studentId) {
        setSubscriptionForm((current) => ({ ...current, studentId: '' }))
      }
      return
    }

    const hasSelectedStudent = students.some((student) => student.id === selectedStudentId)
    const nextStudentId = hasSelectedStudent ? selectedStudentId : students[0].id

    if (nextStudentId !== selectedStudentId) {
      setSelectedStudentId(nextStudentId)
    }

    if (subscriptionForm.studentId !== nextStudentId) {
      setSubscriptionForm((current) => ({ ...current, studentId: nextStudentId }))
    }
  }, [selectedStudentId, students, subscriptionForm.studentId])

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STORAGE_KEYS.parents, JSON.stringify(parents))
    window.localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(students))
    window.localStorage.setItem(STORAGE_KEYS.subscriptions, JSON.stringify(subscriptions))
    window.localStorage.setItem(STORAGE_KEYS.selectedParentId, JSON.stringify(selectedParentId))
    window.localStorage.setItem(STORAGE_KEYS.selectedStudentId, JSON.stringify(selectedStudentId))
  }, [isHydrated, parents, selectedParentId, selectedStudentId, students, subscriptions])

  async function loadClasses(showToast: boolean) {
    setClassesLoading(true)

    try {
      const response = await fetch('/api/classes', { cache: 'no-store' })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      const payload = (await response.json()) as ClassRecord[]
      setClasses(payload)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Khong tai duoc danh sach lop.'
      if (showToast) {
        toast.error(message)
      }
    } finally {
      setClassesLoading(false)
    }
  }

  async function handleCreateParent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittingKey('parent')

    try {
      const response = await fetch('/api/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parentForm),
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      const parent = (await response.json()) as ParentRecord
      setParents((current) => [parent, ...current.filter((item) => item.id !== parent.id)])
      setSelectedParentId(parent.id)
      setParentForm({ name: '', email: '', phone: '' })
      toast.success('Da tao parent moi.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Khong tao duoc parent.')
    } finally {
      setSubmittingKey(null)
    }
  }

  async function handleCreateStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittingKey('student')

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: studentForm.parentId,
          name: studentForm.name,
          dob: studentForm.dob || undefined,
          gender: studentForm.gender === 'UNSPECIFIED' ? undefined : studentForm.gender,
          current_grade: studentForm.currentGrade || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      const student = (await response.json()) as StudentRecord
      setStudents((current) => [student, ...current.filter((item) => item.id !== student.id)])
      setSelectedStudentId(student.id)
      setSubscriptionForm((current) => ({ ...current, studentId: student.id }))
      setStudentForm((current) => ({
        ...current,
        name: '',
        dob: '',
        gender: 'UNSPECIFIED',
        currentGrade: '',
      }))
      toast.success('Da tao student moi.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Khong tao duoc student.')
    } finally {
      setSubmittingKey(null)
    }
  }

  async function handleCreateSubscription(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittingKey('subscription')

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: subscriptionForm.studentId,
          package_name: subscriptionForm.packageName,
          start_date: subscriptionForm.startDate,
          expiry_date: subscriptionForm.endDate,
          total_sessions: Number(subscriptionForm.totalSessions),
        }),
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      const subscription = (await response.json()) as SubscriptionRecord
      setSubscriptions((current) => [subscription, ...current.filter((item) => item.id !== subscription.id)])
      toast.success('Da tao subscription moi.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Khong tao duoc subscription.')
    } finally {
      setSubmittingKey(null)
    }
  }

  async function handleRegister(classId: string) {
    if (!selectedStudentId) {
      toast.error('Hay chon hoc sinh truoc khi dang ky.')
      return
    }

    setSubmittingKey(`register-${classId}`)

    try {
      const response = await fetch(`/api/classes/${classId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: selectedStudentId }),
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      const payload = (await response.json()) as {
        subscription?: {
          id: string
          used_sessions: number
        }
      }

      if (payload.subscription) {
        setSubscriptions((current) =>
          current.map((subscription) =>
            subscription.id === payload.subscription?.id
              ? { ...subscription, usedSessions: payload.subscription.used_sessions }
              : subscription,
          ),
        )
      }

      toast.success('Dang ky lop thanh cong.')
      startTransition(() => {
        void loadClasses(true)
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Dang ky lop that bai.')
    } finally {
      setSubmittingKey(null)
    }
  }

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null
  const selectedParent = parents.find((parent) => parent.id === selectedParentId) ?? null
  const selectedStudentSubscriptions = subscriptions.filter(
    (subscription) => subscription.studentId === selectedStudentId,
  )
  const activeSubscription = selectedStudentSubscriptions.find((subscription) =>
    isSubscriptionActive(subscription),
  )
  const timeSlots = [...new Set(classes.map((classItem) => classItem.timeSlot))].sort(
    (left, right) => getTimeSlotStart(left) - getTimeSlotStart(right),
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,245,1))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card/90 shadow-sm backdrop-blur">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8">
            <div className="space-y-4">
              <Badge variant="outline" className="bg-background/80 px-3 py-1 text-xs font-medium">
                Frontend MVP
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Quan ly parent, student va dang ky lop trong mot man hinh
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Giao dien nay goi truc tiep cac API hien co trong he thong de tao Parent, Student,
                  Subscription va dang ky hoc sinh vao lop hoc theo lich tuan.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Parents</div>
                <div className="mt-3 text-3xl font-semibold">{parents.length}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Students</div>
                <div className="mt-3 text-3xl font-semibold">{students.length}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Classes</div>
                <div className="mt-3 text-3xl font-semibold">{classes.length}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active Pack</div>
                <div className="mt-3 text-sm font-semibold text-foreground">
                  {activeSubscription
                    ? `${activeSubscription.totalSessions - activeSubscription.usedSessions} buoi con lai`
                    : 'Chua co'}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card className="border-border/70 bg-card/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="size-5 text-teal-700" />
                  Hoc sinh dang thao tac
                </CardTitle>
                <CardDescription>
                  Chon hoc sinh de dang ky lop. Neu server bao thieu subscription, tao goi hoc o tab
                  Subscription.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="selected-student">Student hien tai</Label>
                  <Select value={selectedStudentId || undefined} onValueChange={setSelectedStudentId}>
                    <SelectTrigger id="selected-student" className="w-full bg-background">
                      <SelectValue placeholder="Chon hoc sinh" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                  {selectedStudent ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-base font-semibold">{selectedStudent.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Parent: {parents.find((parent) => parent.id === selectedStudent.parentId)?.name ?? 'N/A'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudent.currentGrade ? (
                          <Badge variant="secondary">Khoi {selectedStudent.currentGrade}</Badge>
                        ) : null}
                        {selectedStudent.gender ? <Badge variant="outline">{selectedStudent.gender}</Badge> : null}
                        <Badge variant={activeSubscription ? 'secondary' : 'outline'}>
                          {activeSubscription
                            ? `${activeSubscription.totalSessions - activeSubscription.usedSessions} buoi kha dung`
                            : 'Chua co pack active'}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chua co hoc sinh nao trong bo nho cuc bo. Tao Parent va Student o ben duoi.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="size-5 text-teal-700" />
                  Tao du lieu tu UI
                </CardTitle>
                <CardDescription>
                  Du lieu tao tu cac form nay duoc luu local de tiep tuc thao tac sau khi refresh trang.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="parent" className="gap-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="parent">Parent</TabsTrigger>
                    <TabsTrigger value="student">Student</TabsTrigger>
                    <TabsTrigger value="subscription">Subscription</TabsTrigger>
                  </TabsList>

                  <TabsContent value="parent" className="space-y-4">
                    <form className="space-y-4" onSubmit={handleCreateParent}>
                      <div className="space-y-2">
                        <Label htmlFor="parent-name">Ten parent</Label>
                        <Input
                          id="parent-name"
                          value={parentForm.name}
                          onChange={(event) =>
                            setParentForm((current) => ({ ...current, name: event.target.value }))
                          }
                          placeholder="Nguyen Thi A"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parent-email">Email</Label>
                        <Input
                          id="parent-email"
                          type="email"
                          value={parentForm.email}
                          onChange={(event) =>
                            setParentForm((current) => ({ ...current, email: event.target.value }))
                          }
                          placeholder="parent@example.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parent-phone">So dien thoai</Label>
                        <Input
                          id="parent-phone"
                          value={parentForm.phone}
                          onChange={(event) =>
                            setParentForm((current) => ({ ...current, phone: event.target.value }))
                          }
                          placeholder="0901234567"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={submittingKey === 'parent'}>
                        {submittingKey === 'parent' ? 'Dang tao...' : 'Tao Parent'}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="student" className="space-y-4">
                    <form className="space-y-4" onSubmit={handleCreateStudent}>
                      <div className="space-y-2">
                        <Label htmlFor="student-parent">Gan vao parent</Label>
                        <Select
                          value={studentForm.parentId || undefined}
                          onValueChange={(value) => {
                            setSelectedParentId(value)
                            setStudentForm((current) => ({ ...current, parentId: value }))
                          }}
                          disabled={!parents.length}
                        >
                          <SelectTrigger id="student-parent" className="w-full bg-background">
                            <SelectValue placeholder="Chon parent" />
                          </SelectTrigger>
                          <SelectContent>
                            {parents.map((parent) => (
                              <SelectItem key={parent.id} value={parent.id}>
                                {parent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="student-name">Ten student</Label>
                        <Input
                          id="student-name"
                          value={studentForm.name}
                          onChange={(event) =>
                            setStudentForm((current) => ({ ...current, name: event.target.value }))
                          }
                          placeholder="Tran Van B"
                          required
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="student-dob">Ngay sinh</Label>
                          <Input
                            id="student-dob"
                            type="date"
                            value={studentForm.dob}
                            onChange={(event) =>
                              setStudentForm((current) => ({ ...current, dob: event.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="student-gender">Gioi tinh</Label>
                          <Select
                            value={studentForm.gender}
                            onValueChange={(value) =>
                              setStudentForm((current) => ({
                                ...current,
                                gender: value as typeof studentForm.gender,
                              }))
                            }
                          >
                            <SelectTrigger id="student-gender" className="w-full bg-background">
                              <SelectValue placeholder="Khong bat buoc" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UNSPECIFIED">Khong xac dinh</SelectItem>
                              <SelectItem value="MALE">MALE</SelectItem>
                              <SelectItem value="FEMALE">FEMALE</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="student-grade">Khoi hien tai</Label>
                        <Input
                          id="student-grade"
                          value={studentForm.currentGrade}
                          onChange={(event) =>
                            setStudentForm((current) => ({
                              ...current,
                              currentGrade: event.target.value,
                            }))
                          }
                          placeholder="VD: 3"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={submittingKey === 'student' || !parents.length}
                      >
                        {submittingKey === 'student' ? 'Dang tao...' : 'Tao Student'}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="subscription" className="space-y-4">
                    <form className="space-y-4" onSubmit={handleCreateSubscription}>
                      <div className="space-y-2">
                        <Label htmlFor="subscription-student">Hoc sinh ap dung</Label>
                        <Select
                          value={subscriptionForm.studentId || undefined}
                          onValueChange={(value) => {
                            setSelectedStudentId(value)
                            setSubscriptionForm((current) => ({ ...current, studentId: value }))
                          }}
                          disabled={!students.length}
                        >
                          <SelectTrigger id="subscription-student" className="w-full bg-background">
                            <SelectValue placeholder="Chon student" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subscription-package">Ten goi hoc</Label>
                        <Input
                          id="subscription-package"
                          value={subscriptionForm.packageName}
                          onChange={(event) =>
                            setSubscriptionForm((current) => ({
                              ...current,
                              packageName: event.target.value,
                            }))
                          }
                          placeholder="4 buoi / thang"
                          required
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="subscription-start">Bat dau</Label>
                          <Input
                            id="subscription-start"
                            type="date"
                            value={subscriptionForm.startDate}
                            onChange={(event) =>
                              setSubscriptionForm((current) => ({
                                ...current,
                                startDate: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="subscription-end">Het han</Label>
                          <Input
                            id="subscription-end"
                            type="date"
                            value={subscriptionForm.endDate}
                            onChange={(event) =>
                              setSubscriptionForm((current) => ({
                                ...current,
                                endDate: event.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subscription-total">Tong so buoi</Label>
                        <Input
                          id="subscription-total"
                          type="number"
                          min={1}
                          value={subscriptionForm.totalSessions}
                          onChange={(event) =>
                            setSubscriptionForm((current) => ({
                              ...current,
                              totalSessions: event.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={submittingKey === 'subscription' || !students.length}
                      >
                        {submittingKey === 'subscription' ? 'Dang tao...' : 'Tao Subscription'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 bg-card/90">
            <CardHeader className="gap-4 border-b border-border/70 pb-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarDays className="size-5 text-teal-700" />
                    Thoi khoa bieu theo tuan
                  </CardTitle>
                  <CardDescription>
                    Bang 7 ngay, hien thi `time_slot`, giao vien va thong tin lop. Bam dang ky ngay tai
                    o lop hoc.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedParent ? <Badge variant="outline">Parent: {selectedParent.name}</Badge> : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      startTransition(() => {
                        void loadClasses(true)
                      })
                    }}
                    disabled={classesLoading || isPending}
                  >
                    <RefreshCw className={cn('size-4', (classesLoading || isPending) && 'animate-spin')} />
                    Tai lai
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {classesLoading ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
                  Dang tai danh sach lop...
                </div>
              ) : timeSlots.length ? (
                <Table className="min-w-245">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Time slot</TableHead>
                      {WEEK_DAYS.map((day) => (
                        <TableHead key={day} className="min-w-45">
                          {DAY_LABELS[day]}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeSlots.map((timeSlot) => (
                      <TableRow key={timeSlot}>
                        <TableCell className="align-top font-medium text-foreground/80">{timeSlot}</TableCell>
                        {WEEK_DAYS.map((day) => {
                          const classesInCell = getClassesForCell(classes, day, timeSlot)

                          return (
                            <TableCell key={`${day}-${timeSlot}`} className="align-top">
                              {classesInCell.length ? (
                                <div className="space-y-3">
                                  {classesInCell.map((classItem) => {
                                    const registeredCount = classItem._count?.registrations ?? 0
                                    const remainingSlots = Math.max(0, classItem.maxStudents - registeredCount)

                                    return (
                                      <div
                                        key={classItem.id}
                                        className="rounded-2xl border border-border/80 bg-background/80 p-3 shadow-xs"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="space-y-1">
                                            <div className="font-semibold leading-5">{classItem.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {classItem.subject}
                                            </div>
                                          </div>
                                          <Badge variant={remainingSlots > 0 ? 'secondary' : 'destructive'}>
                                            {remainingSlots}/{classItem.maxStudents}
                                          </Badge>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                          <GraduationCap className="size-3.5" />
                                          GV: {classItem.teacherName}
                                        </div>
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="mt-4 w-full"
                                          onClick={() => {
                                            void handleRegister(classItem.id)
                                          }}
                                          disabled={
                                            !selectedStudentId ||
                                            remainingSlots === 0 ||
                                            submittingKey === `register-${classItem.id}`
                                          }
                                        >
                                          {submittingKey === `register-${classItem.id}`
                                            ? 'Dang xu ly...'
                                            : 'Dang ky lop'}
                                        </Button>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
                                  Khong co lop
                                </div>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
                  Chua co lop nao de hien thi trong lich tuan.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}