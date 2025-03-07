# Plán refaktoringu monorepo aplikace podle Atomic Design

## 1. Analýza současného stavu

### Identifikované problémy

1. **Monolitické komponenty**
   - BusinessTable.tsx je příliš velká komponenta (přes 500 řádků)
   - EditBusinessForm.tsx obsahuje mnoho logiky a UI prvků
   - Chybí jasná hierarchie komponent

2. **Nekonzistentní struktura souborů**
   - Některé komponenty jsou v /components, jiné v /components/ui
   - Chybí organizace podle Atomic Design principů

3. **Duplicitní kód**
   - Opakující se vzory pro formuláře a tabulky
   - Podobná logika pro práci s daty v různých komponentách

4. **Nedostatečná typová bezpečnost**
   - Nekonzistentní používání typů
   - Chybí sdílené typy mezi klientem a serverem

5. **Chybějící dokumentace komponent**
   - Komponenty nemají dokumentaci ani příklady použití

## 2. Navrhovaná struktura podle Atomic Design

```
apps/client/src/
├── components/
│   ├── atoms/           # Základní stavební bloky
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Typography/
│   │   └── ...
│   ├── molecules/       # Jednoduché skupiny atomů
│   │   ├── FormField/
│   │   ├── SearchBar/
│   │   ├── FilterItem/
│   │   ├── TableHeader/
│   │   ├── TableRow/
│   │   └── ...
│   ├── organisms/       # Komplexní UI sekce
│   │   ├── BusinessForm/
│   │   ├── BusinessTable/
│   │   ├── FilterPanel/
│   │   ├── Pagination/
│   │   └── ...
│   ├── templates/       # Rozložení stránek
│   │   ├── DashboardTemplate/
│   │   ├── FormTemplate/
│   │   └── ...
│   └── pages/           # Konkrétní instance šablon
│       ├── BusinessListPage/
│       ├── BusinessEditPage/
│       └── ...
├── hooks/               # Custom React hooks
│   ├── api/             # API hooks (TRPC)
│   │   ├── useBusinesses.ts
│   │   ├── useCategories.ts
│   │   └── ...
│   ├── ui/              # UI hooks
│   │   ├── useFilters.ts
│   │   ├── useDebounce.ts
│   │   └── ...
│   └── ...
├── types/               # Sdílené typy
│   ├── api/             # API typy
│   ├── ui/              # UI typy
│   └── ...
├── utils/               # Pomocné funkce
│   ├── formatting.ts
│   ├── validation.ts
│   └── ...
└── contexts/            # React kontexty
    ├── FilterContext.tsx
    ├── AuthContext.tsx
    └── ...
```

## 3. Plán refaktoringu

### Fáze 1: Vytvoření atomických komponent

1. **Atoms**
   - Refaktorovat existující UI komponenty do atomů
   - Vytvořit nové atomy pro chybějící prvky
   - Implementovat typovou bezpečnost a dokumentaci

2. **Molecules**
   - Vytvořit molekuly z opakujících se vzorů
   - Extrahovat logiku z větších komponent

### Fáze 2: Refaktoring BusinessTable

1. Rozdělit BusinessTable na menší komponenty:
   - TableFilters (organism)
   - BusinessTableHeader (molecule)
   - BusinessTableRow (molecule)
   - BusinessTablePagination (molecule)
   - BulkActions (molecule)

2. Extrahovat logiku do hooks:
   - useTableSorting
   - useTableSelection
   - useTablePagination

### Fáze 3: Refaktoring EditBusinessForm

1. Rozdělit EditBusinessForm na menší komponenty:
   - BusinessBasicInfo (organism)
   - BusinessContactInfo (organism)
   - BusinessCategorization (organism)
   - BusinessMetadata (organism)

2. Extrahovat logiku do hooks:
   - useBusinessForm
   - useFormValidation

### Fáze 4: Vytvoření templates a pages

1. Vytvořit šablony pro různé typy stránek
2. Implementovat konkrétní stránky pomocí šablon

### Fáze 5: Refaktoring API a typů

1. Standardizovat typy mezi klientem a serverem
2. Vytvořit sdílený balíček pro typy
3. Refaktorovat API hooks pro lepší znovupoužitelnost

### Fáze 6: Dokumentace a testy

1. Přidat dokumentaci ke všem komponentám
2. Implementovat unit testy pro klíčové komponenty
3. Vytvořit příklady použití komponent

## 4. Příklady refaktoringu

### Příklad: BusinessTable -> Atomic Design

**Před:**
```tsx
// Monolitická komponenta s více než 500 řádky kódu
export function BusinessTable() {
  // Mnoho stavů, efektů a funkcí
  // ...
  
  return (
    <div>
      {/* Filtry */}
      {/* Tabulka */}
      {/* Stránkování */}
      {/* Modální okna */}
    </div>
  );
}
```

**Po:**
```tsx
// pages/BusinessListPage/BusinessListPage.tsx
export function BusinessListPage() {
  return (
    <DashboardTemplate>
      <BusinessTableContainer />
    </DashboardTemplate>
  );
}

// organisms/BusinessTable/BusinessTableContainer.tsx
export function BusinessTableContainer() {
  const tableState = useBusinessTableState();
  
  return (
    <div>
      <FilterPanel {...tableState.filters} />
      <BulkActionsPanel {...tableState.selection} />
      <BusinessTable 
        data={tableState.data}
        sorting={tableState.sorting}
        onSort={tableState.handleSort}
      />
      <TablePagination {...tableState.pagination} />
      
      {/* Modální okna */}
      <EditBusinessModal />
      <DeleteConfirmModal />
    </div>
  );
}

// organisms/BusinessTable/BusinessTable.tsx
export function BusinessTable({ data, sorting, onSort }) {
  return (
    <Table>
      <BusinessTableHeader sorting={sorting} onSort={onSort} />
      <TableBody>
        {data.map(business => (
          <BusinessTableRow key={business.id} business={business} />
        ))}
      </TableBody>
    </Table>
  );
}
```

### Příklad: EditBusinessForm -> Atomic Design

**Před:**
```tsx
// Monolitická komponenta formuláře
export function EditBusinessForm({ business, onSave, onCancel }) {
  // Formulářová logika, validace, stavy
  // ...
  
  return (
    <form>
      {/* Mnoho polí a sekcí */}
    </form>
  );
}
```

**Po:**
```tsx
// organisms/BusinessForm/BusinessFormContainer.tsx
export function BusinessFormContainer({ business, onSave, onCancel }) {
  const form = useBusinessForm(business);
  
  return (
    <BusinessForm 
      form={form}
      onSubmit={() => onSave(form.getValues())}
      onCancel={onCancel}
    />
  );
}

// organisms/BusinessForm/BusinessForm.tsx
export function BusinessForm({ form, onSubmit, onCancel }) {
  return (
    <Form onSubmit={form.handleSubmit(onSubmit)}>
      <BusinessBasicInfo form={form} />
      <BusinessContactInfo form={form} />
      <BusinessCategorization form={form} />
      <BusinessMetadata form={form} />
      
      <FormActions onCancel={onCancel} />
    </Form>
  );
}

// molecules/BusinessBasicInfo/BusinessBasicInfo.tsx
export function BusinessBasicInfo({ form }) {
  return (
    <FormSection title="Základní informace">
      <FormField
        label="Název"
        error={form.errors.name}
        {...form.register('name')}
      />
      <FormField
        label="Adresa"
        error={form.errors.address}
        {...form.register('address')}
      />
    </FormSection>
  );
}
```

## 5. Výhody refaktoringu

1. **Lepší udržitelnost kódu**
   - Menší komponenty jsou snáze pochopitelné a testovatelné
   - Jasná hierarchie a zodpovědnosti komponent

2. **Znovupoužitelnost**
   - Atomické komponenty lze použít v různých částech aplikace
   - Sdílená logika v hooks a utils

3. **Výkon**
   - Menší komponenty umožňují lepší optimalizaci
   - Efektivnější renderování a memoizace

4. **Škálovatelnost**
   - Snadnější přidávání nových funkcí
   - Konzistentní struktura pro nové vývojáře

5. **Typová bezpečnost**
   - Lepší kontrola typů mezi klientem a serverem
   - Méně runtime chyb

## 6. Další kroky

1. Implementovat CI/CD pipeline pro kontrolu typů a testů
2. Vytvořit dokumentaci komponent pomocí Storybook
3. Optimalizovat bundle size pomocí code-splitting
4. Implementovat lazy loading pro velké komponenty
