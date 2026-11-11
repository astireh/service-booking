// Все запросы к серверу проходят через эту функцию
export async function api(method, url, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = 'Bearer ' + token
  }

  const response = await fetch('/api' + url, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined
  })

  const data = await response.json()
  if (response.status === 401 && token) {
    // токен недействителен: выходим и показываем экран входа
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.reload()
  }
  if (!response.ok) {
    // сервер присылает текст ошибки в поле detail
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Ошибка запроса')
  }
  return data
}

// Дата и время "2026-11-20T10:00" -> "20.11.2026 10:00"
export function formatDateTime(value) {
  const [d, t] = value.split('T')
  const [y, m, day] = d.split('-')
  return day + '.' + m + '.' + y + ' ' + t
}

// Объект Date -> "2026-11-20"
export function toIsoDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
}
