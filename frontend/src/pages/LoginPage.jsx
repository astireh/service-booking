import { useState } from 'react'
import { Card } from 'primereact/card'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { Button } from 'primereact/button'
import { TabView, TabPanel } from 'primereact/tabview'
import { api } from '../api.js'

export default function LoginPage({ onLogin, notify }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  async function login() {
    try {
      const data = await api('POST', '/login', { email: email, password: password })
      onLogin(data)
    } catch (e) {
      notify('error', e.message)
    }
  }

  async function register() {
    if (name.trim() === '') {
      notify('warn', 'Введите имя')
      return
    }
    try {
      const data = await api('POST', '/register', { email: email, password: password, name: name })
      onLogin(data)
    } catch (e) {
      notify('error', e.message)
    }
  }

  return (
    <div className="login-box">
      <Card>
        <div className="login-head">
          <i className="pi pi-calendar-clock"></i>
          <h2>Запись на услуги</h2>
          <p className="hint">Выберите услугу и удобное время онлайн</p>
        </div>
        <TabView>
          <TabPanel header="Вход">
            <div className="login-form">
              <div className="field">
                <label>Email</label>
                <InputText value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@mail.ru" />
              </div>
              <div className="field">
                <label>Пароль</label>
                <Password value={password} onChange={(e) => setPassword(e.target.value)} feedback={false} toggleMask inputStyle={{ width: '100%' }}
                  onKeyDown={(e) => { if (e.key === 'Enter') login() }} />
              </div>
              <div className="field">
                <Button label="Войти" icon="pi pi-sign-in" onClick={login} />
              </div>
              <p className="hint">Тестовые входы:<br />user@test.ru / user123 &nbsp;·&nbsp; admin@test.ru / admin123</p>
            </div>
          </TabPanel>
          <TabPanel header="Регистрация">
            <div className="login-form">
              <div className="field">
                <label>Имя</label>
                <InputText value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван" />
              </div>
              <div className="field">
                <label>Email</label>
                <InputText value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@mail.ru" />
              </div>
              <div className="field">
                <label>Пароль (не короче 6 символов)</label>
                <Password value={password} onChange={(e) => setPassword(e.target.value)} feedback={false} toggleMask inputStyle={{ width: '100%' }} />
              </div>
              <div className="field">
                <Button label="Зарегистрироваться" icon="pi pi-user-plus" onClick={register} />
              </div>
            </div>
          </TabPanel>
        </TabView>
      </Card>
    </div>
  )
}
