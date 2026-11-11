import { useState, useRef } from 'react'
import { Menubar } from 'primereact/menubar'
import { Button } from 'primereact/button'
import { Toast } from 'primereact/toast'
import { Avatar } from 'primereact/avatar'

import LoginPage from './pages/LoginPage.jsx'
import BookingPage from './pages/BookingPage.jsx'
import MyBookingsPage from './pages/MyBookingsPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

export default function App() {
  const savedUser = localStorage.getItem('user')
  const [user, setUser] = useState(savedUser ? JSON.parse(savedUser) : null)
  const [page, setPage] = useState('booking')
  const toast = useRef(null)

  // Показ всплывающих сообщений из любой страницы
  function notify(type, text) {
    toast.current.show({ severity: type, summary: text, life: 3000 })
  }

  function onLogin(data) {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    setPage(data.user.role === 'admin' ? 'admin' : 'booking')
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (user === null) {
    return (
      <div className="login-wrap">
        <Toast ref={toast} />
        <LoginPage onLogin={onLogin} notify={notify} />
      </div>
    )
  }

  // Пункт меню; открытая страница подсвечивается
  function menuItem(label, icon, name) {
    return {
      label: label,
      icon: icon,
      className: page === name ? 'menu-active' : '',
      command: () => setPage(name)
    }
  }

  const menu = [
    menuItem('Записаться', 'pi pi-calendar-plus', 'booking'),
    menuItem('Мои записи', 'pi pi-list', 'my')
  ]
  if (user.role === 'admin') {
    menu.push(menuItem('Админка', 'pi pi-cog', 'admin'))
  }

  const left = (
    <div className="logo">
      <i className="pi pi-calendar-clock"></i>
      <span>Запись на услуги</span>
    </div>
  )

  const right = (
    <div className="user-box">
      <Avatar label={user.name[0]} shape="circle" style={{ background: '#eef2ff', color: '#4f46e5' }} />
      <span className="user-name">{user.name}</span>
      <Button icon="pi pi-sign-out" text rounded onClick={logout} tooltip="Выйти" tooltipOptions={{ position: 'bottom' }} />
    </div>
  )

  return (
    <div className="page">
      <Toast ref={toast} />
      <Menubar className="header" model={menu} start={left} end={right} />
      <div className="content">
        {page === 'booking' && <BookingPage notify={notify} />}
        {page === 'my' && <MyBookingsPage notify={notify} />}
        {page === 'admin' && <AdminPage notify={notify} />}
      </div>
    </div>
  )
}
