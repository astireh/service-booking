import { useState, useEffect } from 'react'
import { Card } from 'primereact/card'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Tag } from 'primereact/tag'
import { api, formatDateTime } from '../api.js'

export default function MyBookingsPage({ notify }) {
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    load()
  }, [])

  function load() {
    api('GET', '/my/bookings').then(setBookings).catch((e) => notify('error', e.message))
  }

  async function cancel(id) {
    try {
      await api('DELETE', '/bookings/' + id)
      notify('info', 'Запись отменена')
      load()
    } catch (e) {
      notify('error', e.message)
    }
  }

  function statusTemplate(row) {
    return row.status === 'active'
      ? <Tag value="Активна" severity="success" />
      : <Tag value="Отменена" severity="danger" />
  }

  function actionTemplate(row) {
    if (row.status !== 'active') return null
    return <Button label="Отменить" icon="pi pi-times" severity="danger" text onClick={() => cancel(row.id)} />
  }

  return (
    <Card title="Мои записи" subTitle="Ваши активные и прошлые записи">
      <DataTable value={bookings} emptyMessage="Записей пока нет" stripedRows>
        <Column header="Дата и время" body={(row) => formatDateTime(row.start_time)} />
        <Column field="service" header="Услуга" />
        <Column field="specialist" header="Специалист" />
        <Column field="price" header="Цена, ₽" />
        <Column header="Статус" body={statusTemplate} />
        <Column body={actionTemplate} />
      </DataTable>
    </Card>
  )
}
