const assignment_status = {
  not_started: 0,
  barely_started: 20,
  in_progress: 40,
  mostly_learned: 60,
  almost_ready: 80,
  performance_ready: 100
}

export function getStatusPercentage(status) {
  return assignment_status[status] ?? 0
}

export function getStatusLabel(status) {
  switch (status) {
    case 'not_started': return 'Not Started'
    case 'barely_started': return 'Barely Started'
    case 'in_progress': return 'In Progress'
    case 'mostly_learned': return 'Mostly Learned'
    case 'almost_ready': return 'Almost Ready'
    case 'performance_ready': return 'Performance Ready'
    default: return 'Unknown'
  }
}

export function getAssignmentProgress(assignment) {
  if (!assignment?.status) return 0
  return getStatusPercentage(assignment.status)
}

export function getOverallProgress(assignments) {
  if (!assignments || assignments.length === 0) return 0
  const total = assignments.reduce((sum, a) => {
    return sum + getStatusPercentage(a.status)
  }, 0)
  return Math.round(total / assignments.length)
}

export function getSongProgress(song) {
  if (!song?.assignments || song.assignments.length === 0) return 0
  return getOverallProgress(song.assignments)
}

export function getProgressColor(percentage) {
  if (percentage >= 80) return '#28a745' // green
  if (percentage >= 60) return '#84cc16' // lime
  if (percentage >= 40) return '#eab308' // yellow
  if (percentage >= 20) return '#f97316' // orange
  return '#dc2626' // red
}