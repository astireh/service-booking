import React from 'react'
import ReactDOM from 'react-dom/client'
import { PrimeReactProvider, addLocale, locale } from 'primereact/api'

import 'primereact/resources/themes/lara-light-indigo/theme.css'
import 'primeicons/primeicons.css'
import './style.css'

import App from './App.jsx'

// Русские названия месяцев и дней для календаря
addLocale('ru', {
  firstDayOfWeek: 1,
  dayNames: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
  dayNamesShort: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  dayNamesMin: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  monthNames: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  monthNamesShort: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  today: 'Сегодня',
  clear: 'Очистить'
})
locale('ru')

ReactDOM.createRoot(document.getElementById('root')).render(
  <PrimeReactProvider value={{ locale: 'ru' }}>
    <App />
  </PrimeReactProvider>
)
