# API pro správu firem

Toto API poskytuje přístup k databázi firem s možností filtrování, řazení a stránkování.

## Technologie

- Node.js
- Express
- Prisma ORM
- SQLite databáze

## Instalace

1. Naklonujte repozitář
2. Nainstalujte závislosti:
   ```
   npm install
   ```
3. Vytvořte databázi a spusťte migrace:
   ```
   npx prisma migrate dev
   ```
4. Naplňte databázi daty:
   ```
   npm run seed
   ```
5. Spusťte server:
   ```
   npm run dev
   ```

## API Endpointy

### Získání seznamu firem

```
GET /api/companies
```

#### Query parametry

- `page` - číslo stránky (výchozí: 1)
- `limit` - počet záznamů na stránku (výchozí: 10)
- `keyword` - klíčové slovo pro vyhledávání v názvu nebo adrese
- `category` - filtrování podle kategorie
- `hasWebsite` - filtrování podle existence webové stránky (true/false)
- `hasPhone` - filtrování podle existence telefonního čísla (true/false)
- `hasEmail` - filtrování podle existence emailu (true/false)
- `sortBy` - pole pro řazení (name, address, reviewsCount, scrapedAt)
- `sortDir` - směr řazení (asc/desc)

#### Příklad odpovědi

```json
{
  "data": [
    {
      "id": "666717",
      "name": "Taxi Karlovy vary",
      "address": "Nušlova 2295/55, 158 00  Praha, Stodůlky",
      "email": "w@garsia-usa.com",
      "phone": "+420 773 577 799",
      "website": "https://www.garsia-usa.com/cs/cz?utm_source=firmy.cz&utm_medium=ppd&utm_content=&utm_term=&utm_campaign=firmy.cz-666717",
      "link": "https://www.firmy.cz/detail/666717-taxi-karlovy-vary-praha-stodulky.html",
      "reviewsCount": 0,
      "scrapedAt": "2025-03-04T20:26:52.057Z",
      "categories": [
        {
          "id": 1,
          "name": "Taxi služby"
        },
        {
          "id": 2,
          "name": "Hotelová a letištní přeprava osob"
        }
      ]
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

### Získání detailu firmy

```
GET /api/companies/:id
```

#### Příklad odpovědi

```json
{
  "id": "666717",
  "name": "Taxi Karlovy vary",
  "address": "Nušlova 2295/55, 158 00  Praha, Stodůlky",
  "email": "w@garsia-usa.com",
  "phone": "+420 773 577 799",
  "website": "https://www.garsia-usa.com/cs/cz?utm_source=firmy.cz&utm_medium=ppd&utm_content=&utm_term=&utm_campaign=firmy.cz-666717",
  "link": "https://www.firmy.cz/detail/666717-taxi-karlovy-vary-praha-stodulky.html",
  "reviewsCount": 0,
  "scrapedAt": "2025-03-04T20:26:52.057Z",
  "categories": [
    {
      "id": 1,
      "name": "Taxi služby"
    },
    {
      "id": 2,
      "name": "Hotelová a letištní přeprava osob"
    }
  ]
}
```

### Získání seznamu kategorií

```
GET /api/categories
```

#### Příklad odpovědi

```json
[
  {
    "id": 1,
    "name": "Taxi služby"
  },
  {
    "id": 2,
    "name": "Hotelová a letištní přeprava osob"
  },
  {
    "id": 3,
    "name": "Výroba mléčných výrobků"
  }
]
```

## Příklady použití

### Filtrování podle klíčového slova

```
GET /api/companies?keyword=Karlovy
```

### Filtrování podle kategorie

```
GET /api/companies?category=Taxi
```

### Filtrování podle existence webové stránky

```
GET /api/companies?hasWebsite=true
```

### Řazení podle názvu sestupně

```
GET /api/companies?sortBy=name&sortDir=desc
```

### Kombinace filtrů

```
GET /api/companies?hasWebsite=true&keyword=Karlovy&sortBy=name&sortDir=asc
```

### Stránkování

```
GET /api/companies?page=1&limit=5
