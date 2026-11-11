import { useState, useEffect } from 'react'
import { Card } from 'primereact/card'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { Calendar } from 'primereact/calendar'
import { Tag } from 'primereact/tag'
import { api, formatDateTime, toIsoDate } from '../api.js'

export default function AdminPage({ notify }) {
  const [bookings, setBookings] = useState([])
  const [specialists, setSpecialists] = useState([])
  const [specialistId, setSpecialistId] = useState(null)
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState(null)
  const [slots, setSlots] = useState([])

  useEffect(() => {
    loadBookings()
    api('GET', '/specialists').then(setSpecialists)
  }, [])

  useEffect(() => {
    loadSlots()
  }, [specialistId, date])

  function loadBookings() {
    api('GET', '/admin/bookings').then(setBookings).catch((e) => notify('error', e.message))
  }

  function loadSlots() {
    if (specialistId === null || date === null) return
    api('GET', '/slots?specialist_id=' + specialistId + '&date=' + toIsoDate(date)).then(setSlots)
  }

  async function addSlot() {
    if (specialistId === null || date === null || time === null) {
      notify('warn', 'Выберите специалиста, дату и время')
      return
    }
    const hh = String(time.getHours()).padStart(2, '0')
    const mm = String(time.getMinutes()).padStart(2, '0')
    try {
      await api('POST', '/admin/slots', { specialist_id: specialistId, start_time: toIsoDate(date) + 'T' + hh + ':' + mm })
      notify('success', 'Слот добавлен')
      loadSlots()
    } catch (e) {
      notify('error', e.message)
    }
  }

  async function deleteSlot(id) {
    try {
      await api('DELETE', '/admin/slots/' + id)
      notify('info', 'Слот удалён')
      loadSlots()
    } catch (e) {
      notify('error', e.message)
    }
  }

  async function cancelBooking(id) {
    try {
      await api('DELETE', '/bookings/' + id)
      notify('info', 'Запись отменена')
      loadBookings()
      loadSlots()
    } catch (e) {
      notify('error', e.message)
    }
  }

  const specialistOptions = specialists.map((s) => ({ label: s.name, value: s.id }))

  return (
    <>
      <Card title="Расписание специалиста" subTitle="Добавление и удаление слотов">
        <div className="form-grid">
          <div className="field">
            <label>Специалист</label>
            <Dropdown value={specialistId} options={specialistOptions} onChange={(e) => setSpecialistId(e.value)}
              placeholder="Выберите" />
          </div>
          <div className="field">
            <label>Дата</label>
            <Calendar value={date} onChange={(e) => setDate(e.value)} dateFormat="dd.mm.yy" showIcon />
          </div>
          <div className="field">
            <label>Время нового слота</label>
            <Calendar value={time} onChange={(e) => setTime(e.value)} timeOnly stepMinute={30} showIcon icon="pi pi-clock" placeholder="чч:мм" />
          </div>
          <div className="field">
            <Button label="Добавить слот" icon="pi pi-plus" onClick={addSlot} />
          </div>
        </div>

        {specialistId !== null && (
          <DataTable value={slots} emptyMessage="Слотов на эту дату нет" size="small" style={{ marginTop: 20 }}>
            <Column header="Время" body={(row) => row.start_time.split('T')[1]} />
            <Column header="Состояние" body={(row) => row.is_free
              ? <Tag value="Свободен" severity="success" />
              : <Tag value="Занят / прошёл" severity="warning" />} />
            <Column body={(row) => <Button icon="pi pi-trash" severity="danger" text onClick={() => deleteSlot(row.id)} />} />
          </DataTable>
        )}
      </Card>

      <Card title="Все записи" subTitle="Записи всех клиентов">
        <DataTable value={bookings} emptyMessage="Записей нет" paginator rows={10} stripedRows>
          <Column header="Дата и время" body={(row) => formatDateTime(row.start_time)} sortable sortField="start_time" />
          <Column field="client" header="Клиент" />
          <Column field="email" header="Email" />
          <Column field="service" header="Услуга" />
          <Column field="specialist" header="Специалист" />
          <Column header="Статус" body={(row) => row.status === 'active'
            ? <Tag value="Активна" severity="success" />
            : <Tag value="Отменена" severity="danger" />} />
          <Column body={(row) => row.status === 'active'
            ? <Button label="Отменить" severity="danger" text onClick={() => cancelBooking(row.id)} />
            : null} />
        </DataTable>
      </Card>
    </>
  )
}
