import type { AllowedUser, Assignment, Subject, UsageStat } from '../types'

export const subjects: Subject[] = [
  { id: 'history', name: 'History', color: '#f3afc9' },
  { id: 'science', name: 'Science', color: '#a9dfe4' },
  { id: 'design', name: 'Design', color: '#f5d295' },
  { id: 'math', name: 'Math', color: '#ddc0f3' },
  { id: 'uncategorized', name: 'Uncategorized', color: '#d7dee7' },
]

export const assignments: Assignment[] = [
  {
    id: 'renaissance-essay',
    subjectId: 'history',
    title: 'Renaissance Art Essay',
    dueDate: '2026-04-03',
    submitted: false,
    isFavorite: false,
    linkLabel: 'Canvas',
    attachmentCount: 2,
    detail: 'Due: Apr 03 · Tomorrow',
  },
  {
    id: 'molecular-bio-lab',
    subjectId: 'science',
    title: 'Molecular Biology Lab',
    dueDate: '2026-04-05',
    submitted: true,
    isFavorite: true,
    linkLabel: 'Portal',
    attachmentCount: 0,
    detail: 'Due: Apr 05 · Friday',
  },
  {
    id: 'visual-identity',
    subjectId: 'design',
    title: 'Visual Identity Project',
    dueDate: '2026-04-10',
    submitted: false,
    isFavorite: false,
    linkLabel: 'Notion',
    attachmentCount: 1,
    detail: 'Due: Apr 10 · Next week',
  },
  {
    id: 'calculus-workbook',
    subjectId: 'math',
    title: 'Calculus II Workbook',
    dueDate: '2026-04-12',
    submitted: false,
    isFavorite: true,
    linkLabel: 'Drive',
    attachmentCount: 1,
    detail: 'Final prep',
  },
  {
    id: 'reading-log',
    subjectId: 'uncategorized',
    title: 'Random Reading Log',
    dueDate: '2026-04-18',
    submitted: false,
    isFavorite: false,
    attachmentCount: 1,
  },
]

export const personalUsage: UsageStat = {
  label: 'Storage',
  used: 68,
  total: 100,
}

export const projectUsage: UsageStat = {
  label: 'Group Total',
  used: 420,
  total: 1000,
}

export const allowedUsers: AllowedUser[] = [
  {
    id: '1',
    email: 'alex.smith@gmail.com',
    role: 'admin',
    active: true,
  },
  {
    id: '2',
    email: 'jamie.designer@gmail.com',
    role: 'member',
    active: true,
  },
]
