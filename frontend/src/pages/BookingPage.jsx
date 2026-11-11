import { useState, useEffect } from 'react'
import { Card } from 'primereact/card'
import { Dropdown } from 'primereact/dropdown'
import { Calendar } from 'primereact/calendar'
import { Button } from 'primereact/button'
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog'
import { api, toIsoDate, formatDateTime } from '../api.js'

export default function BookingPage({ notify }) {
  const [services, setServices] = useState([])
  const [specialists, setSpecialists] = useState([])
  const [slots, setSlots] = useState([])
  const [serviceId, setServiceId] = useState(null)
  const [specialistId, setSpecialistId] = useState(null)
  const [date, setDate] = useState(new Date())

  // Загрузка услуг при открытии страницы
  useEffect(() => {
    api('GET', '/services').then(setServices).catch((e) => notify('error', e.message))
  }, [])

  // При выборе услуги загружаем её специалистов
  useEffect(() => {
    setSpecialistId(null)
    setSlots([])
    if (serviceId !== null) {
      api('GET', '/specialists?service_id=' + serviceId).then(setSpecialists)
    }
  }, [serviceId])

  // При выборе специалиста или даты загружаем слоты
  useEffect(() => {
    loadSlots()
  }, [specialistId, date])

  function loadSlots() {
    if (specialistId === null || date === null) {
      setSlots([])
      return
    }
    api('GET', '/slots?specialist_id=' + specialistId + '&date=' + toIsoDate(date))
      .then(setSlots)
      .catch((e) => notify('error', e.message))
  }

  function askBook(slot) {
    const service = services.find((s) => s.id === serviceId)
    confirmDialog({
      header: 'Подтверждение записи',
      message: service.name + ', ' + formatDateTime(slot.start_time) + ', ' + service.price + ' ₽. Записаться?',
      acceptLabel: 'Да',
      rejectLabel: 'Нет',
      accept: () => book(slot)
    })
  }

  async function book(slot) {
    try {
      await api('POST', '/bookings', { slot_id: slot.id })
      notify('success', 'Вы записаны на ' + formatDateTime(slot.start_time))
    } catch (e) {
      notify('error', e.message)
    }
    loadSlots()   // обновляем сетку: слот стал занят
  }

  const serviceOptions = services.map((s) => ({
    label: s.name + ' — ' + s.price + ' ₽ (' + s.duration_min + ' мин)',
    value: s.id
  }))
  const specialistOptions = specialists.map((s) => ({ label: s.name, value: s.id }))

  return (
    <Card title="Запись на услугу" subTitle="Выберите услугу, специалиста и удобное время">
      <ConfirmDialog />
      <div className="form-grid">
        <div className="field">
          <label>Услуга</label>
          <Dropdown value={serviceId} options={serviceOptions} onChange={(e) => setServiceId(e.value)}
            placeholder="Выберите услугу" />
        </div>
        <div className="field">
          <label>Специалист</label>
          <Dropdown value={specialistId} options={specialistOptions} onChange={(e) => setSpecialistId(e.value)}
            placeholder="Выберите специалиста" disabled={serviceId === null} />
        </div>
        <div className="field">
          <label>Дата</label>
          <Calendar value={date} onChange={(e) => setDate(e.value)} minDate={new Date()} dateFormat="dd.mm.yy" showIcon />
        </div>
      </div>

      {specialistId === null && (
        <div className="empty">
          <i className="pi pi-clock"></i>
          Выберите услугу и специалиста, чтобы увидеть свободное время
        </div>
      )}

      {specialistId !== null && date !== null && (
        <>
          <div className="section-title">
            <b>Время на {toIsoDate(date).split('-').reverse().join('.')}</b>
            <div className="legend">
              <span><span className="dot free"></span>свободно</span>
              <span><span className="dot busy"></span>занято</span>
              <Button icon="pi pi-refresh" text rounded onClick={loadSlots} tooltip="Обновить" />
            </div>
          </div>
          {slots.length === 0 && <div className="empty">На эту дату нет слотов</div>}
          <div className="slots">
            {slots.map((slot) => (
              <Button key={slot.id}
                label={slot.start_time.split('T')[1]}
                severity={slot.is_free ? 'success' : 'secondary'}
                outlined={!slot.is_free}
                disabled={!slot.is_free}
                onClick={() => askBook(slot)} />
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
