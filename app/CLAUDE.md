# CLAUDE.md — Финансовое приложение

## Обзор проекта

Локальное веб-приложение для личного учёта активов, транзакций, деклараций и налогов.
Работает только локально / на личном VPS. Все данные хранятся локально в SQLite.

**Домен:** adilkhanfinance-arsenal.kz  
**Пользователь:** 7madcon@gmail.com

---

## Стек технологий

- **Framework:** Next.js 14 (App Router)
- **БД:** SQLite через better-sqlite3 (синхронный API, WAL mode)
- **Auth:** bcryptjs (rounds=12) + jsonwebtoken (30 дней), токен в localStorage
- **CSS:** Tailwind CSS 3 с кастомными классами (.card, .btn-primary, .input, .label, .badge-*)
- **Графики:** Recharts (PieChart, BarChart, ResponsiveContainer)
- **Excel:** XLSX library (импорт/экспорт)
- **Файлы:** FormData → /api/files → папка finance/uploads/

---

## Структура папок

```
finance/
├── app/                   # Next.js приложение
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/       # API routes (server-side)
│   │   │   │   ├── assets/
│   │   │   │   ├── transactions/
│   │   │   │   ├── declarations/
│   │   │   │   ├── taxes/
│   │   │   │   ├── balance/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── warnings/
│   │   │   │   ├── files/
│   │   │   │   ├── exchange-rate/   # Курсы валют (кэш 1 час)
│   │   │   │   ├── auth/login
│   │   │   │   ├── auth/register
│   │   │   │   ├── backup/
│   │   │   │   ├── import/
│   │   │   │   └── export/
│   │   │   ├── assets/page.tsx
│   │   │   ├── transactions/page.tsx
│   │   │   ├── balance/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── declarations/page.tsx
│   │   │   ├── taxes/page.tsx
│   │   │   ├── warnings/page.tsx
│   │   │   ├── import/page.tsx
│   │   │   └── login/page.tsx
│   │   ├── components/
│   │   │   ├── AppLayout.tsx      # Sidebar + bottom nav
│   │   │   ├── DateFilter.tsx     # Фильтр: год/месяц/дата/диапазон
│   │   │   ├── NumInput.tsx       # Форматирование чисел с пробелами
│   │   │   └── useApi.ts          # apiFetch с Bearer токеном
│   │   └── lib/
│   │       ├── db.ts              # SQLite инициализация + миграции
│   │       ├── auth.ts            # signToken / verifyToken / getUserFromRequest
│   │       └── format.ts          # formatKZT, CATEGORY_EMOJI, CURRENCIES
├── data/
│   ├── finance.db                 # Основная БД
│   └── finance_backup_*.db        # Автобэкапы
└── uploads/                       # Загруженные файлы (документы)
```

---

## База данных — таблицы

### users
| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| email | TEXT UNIQUE | |
| password_hash | TEXT | bcrypt rounds=12 |
| created_at | TEXT | |

### assets
| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK | |
| name | TEXT | Название актива |
| category | TEXT | Категория (см. ниже) |
| country | TEXT | Страна |
| city | TEXT | Город |
| amount_kzt | REAL | Стоимость в тенге |
| cash_amount | REAL | Наличная часть |
| noncash_amount | REAL | Безналичная часть |
| purchase_date | TEXT | Дата покупки |
| declaration_year | INTEGER | Год декларации |
| source_type | TEXT | наличные/безналичные/смешанный |
| is_foreign | INTEGER | 0/1 — зарубежный |
| needs_declaration | INTEGER | 0/1 |
| is_declared | INTEGER | 0/1 |
| status | TEXT | активный / продан |
| sold_date | TEXT | Дата продажи |
| sold_amount | REAL | Сумма продажи |
| profit_loss | REAL | Прибыль/убыток |
| extra_data | TEXT | JSON (тикер, ISIN, брокер и т.д.) |
| currency | TEXT | KZT/USD/EUR/AED/TRY |
| original_amount | REAL | Сумма в оригинальной валюте |
| exchange_rate | REAL | Курс на момент сделки |

### transactions
| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK | |
| asset_id | INTEGER FK | nullable |
| date | TEXT | |
| year | INTEGER | |
| type | TEXT | Тип (см. ниже) |
| amount_kzt | REAL | |
| cash_amount | REAL | |
| noncash_amount | REAL | |
| payment_method | TEXT | наличные/безналичные/смешанный |
| description | TEXT | |
| comment | TEXT | |
| currency | TEXT | |
| original_amount | REAL | |
| exchange_rate | REAL | |

### declarations
| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK | |
| year | INTEGER | |
| status | TEXT | не подана/нужно проверить/подана/принята/отклонена |
| comment | TEXT | Детали (авто-заполняется при продаже зарубежного актива) |
| deadline | TEXT | Срок подачи |
| submitted_at | TEXT | Дата подачи |

### taxes
| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK | |
| asset_id | INTEGER FK | nullable |
| year | INTEGER | |
| description | TEXT | |
| buy_amount | REAL | |
| sell_amount | REAL | |
| profit | REAL | |
| tax_amount | REAL | profit * tax_rate / 100 |
| tax_rate | REAL | По умолчанию 10% |
| status | TEXT | нужно оплатить/оплачено/нужно проверить |

### files
| Поле | Тип | Описание |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK | |
| related_type | TEXT | asset / transaction / declaration |
| related_id | INTEGER | ID связанной записи |
| file_name | TEXT | Оригинальное имя |
| original_name | TEXT | Оригинальное имя (дубль, для совместимости) |
| file_path | TEXT | Имя файла в папке uploads/ |
| file_type | TEXT | MIME тип |

---

## Категории активов

```
недвижимость → 🏠
автомобиль → 🚗
доля в бизнесе → 💼
банковский счет → 🏦
ценные бумаги → 📈
криптовалюта → 🪙
наличные → 💵
дивиденды → 💰
займ выданный → 🤝
другое → 📦
```

**Упрощённая форма** для категорий `наличные` и `банковский счет` — только сумма, год, комментарий (название создаётся автоматически).

---

## Типы транзакций

| Тип | Влияние на баланс |
|---|---|
| доход | + |
| расход | − |
| покупка актива | − (создаёт актив автоматически) |
| продажа актива | + (обновляет статус актива, создаёт налог и декларацию) |
| займ выдача | − |
| займ возврат | + |
| дивиденды | + (доход; поле "Компания") |

---

## Ключевая бизнес-логика

### Автоматические цепочки при продаже актива
1. Статус актива → `продан`, записываются `sold_date`, `sold_amount`, `profit_loss`
2. Если прибыль > 0 **и** владел активом < 365 дней → создаётся запись в `taxes` (10%)
3. Если актив зарубежный → создаётся / обновляется запись в `declarations`

### Правило 1 года (налоговая льгота)
Если `sold_date - purchase_date >= 365 дней` → налог **не начисляется**.

### Оплата налога
При нажатии "Отметить оплаченным" → модал спрашивает способ (наличные/безнал) → автоматически создаётся транзакция типа `расход` на сумму налога.

### Валюты
Поддерживаемые: KZT, USD, EUR, AED, TRY.  
Курс загружается с `api.exchangerate-api.com` (бесплатный, без ключа), кэш 1 час.  
Fallback при недоступности: USD=450, EUR=490, AED=122, TRY=13.  
Хранится: `original_amount` (в исходной валюте) + `exchange_rate` + `amount_kzt` (пересчитанный).

### Миграции БД
`runMigrations()` в `db.ts` проверяет через `PRAGMA table_info()` наличие колонок перед ALTER TABLE — данные не теряются.

---

## API маршруты

| Метод | URL | Описание |
|---|---|---|
| GET/POST | /api/assets | Список активов (фильтры: year, month, date_from, date_to, category, status, search) |
| GET/PUT/DELETE | /api/assets/[id] | Один актив |
| GET/POST | /api/transactions | Транзакции (те же фильтры + type) |
| GET/PUT/DELETE | /api/transactions/[id] | Одна транзакция |
| GET | /api/balance | Баланс по периодам |
| GET | /api/dashboard | Сводка для главной страницы |
| GET/POST | /api/declarations | Декларации |
| GET/PUT/DELETE | /api/declarations/[id] | Одна декларация |
| GET/POST | /api/taxes | Налоги |
| GET/PUT/DELETE | /api/taxes/[id] | Один налог (PUT с `{status}` — частичное обновление) |
| GET | /api/warnings | Предупреждения |
| GET/POST | /api/files | Файлы (multipart/form-data) |
| GET/DELETE | /api/files/[id] | Скачать / удалить файл |
| GET | /api/exchange-rate | Курсы валют (кэш 1ч) |
| GET | /api/backup | Скачать резервную копию БД |
| POST | /api/import | Импорт из Excel |
| GET | /api/export | Экспорт в Excel |

---

## Компоненты

### DateFilter
```tsx
import DateFilter, { EMPTY_FILTER, DateFilterValue, buildParams } from '@/components/DateFilter';

const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_FILTER);
const params = buildParams(dateFilter); // → URLSearchParams
```
Режимы: год / месяц / конкретная дата / диапазон дат.

### NumInput
Форматирует число с пробелами при вводе (50 000 000).  
`value` — строка с числом, `onChange` — возвращает строку с числом.

### apiFetch
```ts
import { apiFetch, getToken } from '@/components/useApi';
// Автоматически добавляет Authorization: Bearer <token>
```

---

## Запуск

```bash
# Разработка
cd finance/app
npm install
npm run dev
# → http://localhost:3000

# Продакшн
npm run build
npm start

# PM2 (сервер)
pm2 start ecosystem.config.js
pm2 startup && pm2 save
```

## Сервер (VPS)

- **Nginx:** проксирует запросы на localhost:3000
- **PM2:** держит процесс живым, автозапуск после перезагрузки
- **SSL:** Let's Encrypt через certbot

### Сброс пароля
```bash
cd finance/app
node -e "
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const db = new Database('../data/finance.db');
const hash = bcrypt.hashSync('НовыйПароль', 12);
db.prepare('UPDATE users SET password_hash=? WHERE email=?').run(hash, '7madcon@gmail.com');
db.close();
"
```

---

## Важные правила

- **Никаких облачных сервисов** для хранения данных
- **Перед изменением схемы БД** — использовать миграции через PRAGMA, не пересоздавать таблицы
- **Бэкап** перед крупными изменениями: кнопка в шапке или `/api/backup`
- **Валюта** — всё хранится в KZT (`amount_kzt`), иностранные суммы дополнительно в `original_amount`
- **Налог** — всегда 10% от прибыли, льгота при владении 1+ год
