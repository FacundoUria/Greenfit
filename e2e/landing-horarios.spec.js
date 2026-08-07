import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/supabaseMock.js'
import { tablasBase, DISCIPLINA_BOXEO, DISCIPLINA_APARATOS } from './support/fixtures.js'

// Cubre el checklist de "Sincronización Landing vs. Admin": la sección
// "Elegí tu ritmo" tiene que mostrar TODO el catálogo de disciplinas, sin
// importar `is_active` -- antes, cualquiera sin filas en `classes` (ej.
// Aparatos, kind='membership', pase libre por diseño) quedaba oculta por
// completo en vez de aparecer con el texto de Pase Libre. También cubre que
// un horario recién editado desde el Admin (una fila nueva/distinta en
// `classes`) se refleje acá -- dado que esta landing y el Admin son dos
// apps separadas sin sesión compartida en los tests (cada una con su propio
// backend mockeado), el contrato se prueba así:
// PAGINA SUPABASE/e2e/disciplinas-horarios.spec.js ya prueba que el Admin
// escribe bien en `classes`; este spec prueba que la landing LEE y
// RENDERIZA bien esa misma tabla, con exactamente la forma que el Admin la
// deja.
//
// `is_active`/`show_in_agenda` son exclusivos del Admin y de la Agenda de
// RESERVAS de la PWA -- acá NUNCA se filtra por ninguno de los dos, ni se
// muestra ningún badge de estado ("Activa"): solo Ícono, Nombre, días en
// verde y horario. Únicamente una disciplina borrada de verdad de
// `disciplines` deja de listarse.
//
// LÍMITE IMPORTANTE de esta suite: el mock (supabaseMock.js) es una capa
// REST falsa en memoria -- devuelve exactamente lo que haya en la fixture,
// sin ningún Row Level Security real de por medio. El bug real reportado
// en producción (Aparatos con is_active=false invisible en la Landing
// pese a que este archivo YA NO filtra por is_active del lado del
// cliente) resultó ser una policy de RLS en `disciplines` que le escondía
// esas filas al rol anon ANTES de que la respuesta llegara al cliente --
// ESTOS tests prueban que el CÓDIGO de la Landing es is_active/
// show_in_agenda-agnóstico (ya lo era, y sigue siéndolo), pero NO pueden
// detectar ni prevenir un problema de RLS del lado de la base (ver
// supabase_migration_disciplines_select_publico.sql, en PAGINA SUPABASE,
// para el fix real de ESE problema -- ninguna prueba automatizada de este
// repo lo cubre, hace falta correr esa migración y confirmarlo contra la
// base real).
test.describe('Landing -- "Elegí tu ritmo"', () => {
  test('muestra las disciplinas con horarios reales Y Aparatos con el badge de Pase Libre (antes quedaba oculta), sin ningún badge de estado', async ({
    page,
  }) => {
    await mockSupabase(page, { tables: tablasBase() })
    await page.goto('/')

    // #scheduleList (no el resto de la página) -- "Todo bajo un mismo
    // techo" (discipline-grid) también lista los nombres de las
    // disciplinas, así que hay que escopear para no toparse con eso.
    const seccion = page.locator('#scheduleList')
    await expect(seccion.getByText('CrossFit', { exact: true })).toBeVisible()
    await expect(seccion.getByText('Lun · Mié · Vie — 18:00 a 19:00 hs')).toBeVisible()
    await expect(seccion.getByText('Boxeo', { exact: true })).toBeVisible()
    await expect(seccion.getByText('Mar · Jue — 20:00 a 21:00 hs')).toBeVisible()

    // El bug real: Aparatos (sin filas en `classes`) antes se omitía por
    // completo -- ahora aparece con el badge de Pase Libre.
    await expect(seccion.getByText('Aparatos', { exact: true })).toBeVisible()
    await expect(seccion.getByText('Pase Libre / Horario de Gimnasio')).toBeVisible()

    // El mensaje de "todavía no hay horarios" existe siempre en el DOM
    // (se alterna vía style.display, no se desmonta) -- toBeHidden(), no
    // toHaveCount(0), para chequear que de verdad está oculto.
    await expect(page.getByText('Todavía no hay horarios cargados.')).toBeHidden()

    // UI limpia: sin el badge "• Activa" al lado de ningún nombre.
    await expect(seccion.getByText('Activa', { exact: true })).toHaveCount(0)
  })

  // Antes, is_active=false ocultaba la disciplina de acá (mismo filtro que
  // usa el Admin/la PWA para vender/reservar) -- ahora esta página es
  // puramente informativa: is_active NO decide nada acá, solo importa que
  // la disciplina exista en el catálogo. Únicamente eliminarla de verdad de
  // `disciplines` la saca de esta lista.
  test('una disciplina con is_active=false sigue mostrándose igual (acá NO se filtra por is_active)', async ({ page }) => {
    const tablas = tablasBase()
    tablas.disciplines = tablas.disciplines.map((d) =>
      d.id === DISCIPLINA_APARATOS.id ? { ...d, is_active: false } : d,
    )

    await mockSupabase(page, { tables: tablas })
    await page.goto('/')

    const seccion = page.locator('#scheduleList')
    await expect(seccion.getByText('Aparatos', { exact: true })).toBeVisible()
    await expect(seccion.getByText('Pase Libre / Horario de Gimnasio')).toBeVisible()
  })

  // show_in_agenda=false es el switch nuevo de "Editar Disciplina" para
  // sacar a Aparatos de la Agenda de RESERVAS de la PWA -- no tiene que
  // afectar en nada a esta página informativa.
  test('una disciplina con show_in_agenda=false también sigue mostrándose igual (acá tampoco se filtra por show_in_agenda)', async ({
    page,
  }) => {
    const tablas = tablasBase()
    tablas.disciplines = tablas.disciplines.map((d) =>
      d.id === DISCIPLINA_APARATOS.id ? { ...d, show_in_agenda: false } : d,
    )

    await mockSupabase(page, { tables: tablas })
    await page.goto('/')

    const seccion = page.locator('#scheduleList')
    await expect(seccion.getByText('Aparatos', { exact: true })).toBeVisible()
    await expect(seccion.getByText('Pase Libre / Horario de Gimnasio')).toBeVisible()
  })

  // El escenario real reportado: Aparatos con LOS DOS flags apagados a la
  // vez (inactiva Y fuera de la Agenda) -- el caso más restrictivo posible
  // del lado del Admin, y aun así tiene que aparecer igual acá.
  test('una disciplina con is_active=false Y show_in_agenda=false (el caso más restrictivo) sigue apareciendo', async ({
    page,
  }) => {
    const tablas = tablasBase()
    tablas.disciplines = tablas.disciplines.map((d) =>
      d.id === DISCIPLINA_APARATOS.id ? { ...d, is_active: false, show_in_agenda: false } : d,
    )

    await mockSupabase(page, { tables: tablas })
    await page.goto('/')

    const seccion = page.locator('#scheduleList')
    await expect(seccion.getByText('Aparatos', { exact: true })).toBeVisible()
    await expect(seccion.getByText('Pase Libre / Horario de Gimnasio')).toBeVisible()
  })

  test('un horario editado desde el Admin (nueva franja en `classes`) se refleja acá', async ({ page }) => {
    const tablas = tablasBase()
    // Simula exactamente lo que deja el Admin al editar Boxeo desde
    // DisciplinaModal.jsx: cambia el turno de 20-21 a 07-08 y agrega un
    // sábado -- misma tabla `classes`, mismo shape de fila.
    tablas.classes = tablas.classes.filter((c) => c.discipline_id !== DISCIPLINA_BOXEO.id)
    tablas.classes.push({
      discipline_id: DISCIPLINA_BOXEO.id,
      days_of_week: [2, 4, 6],
      start_time: '07:00:00',
      end_time: '08:00:00',
    })

    await mockSupabase(page, { tables: tablas })
    await page.goto('/')

    const seccion = page.locator('#scheduleList')
    await expect(seccion.getByText('Mar · Jue · Sáb — 07:00 a 08:00 hs')).toBeVisible()
    await expect(seccion.getByText('20:00 a 21:00', { exact: false })).toHaveCount(0)
  })

  // Antes, "Editar Disciplina" en el Admin bloqueaba por completo la carga
  // de horarios para kind=membership (Aparatos) -- ahora se puede cargar un
  // horario real de gimnasio ahí (ver PAGINA SUPABASE/e2e/disciplinas-horarios.spec.js),
  // y esta landing tiene que mostrar ESE horario real en vez de caer siempre
  // al fallback de "Pase Libre / Horario de Gimnasio".
  test('Aparatos con un horario real cargado desde el Admin lo muestra en vez del fallback de Pase Libre', async ({
    page,
  }) => {
    const tablas = tablasBase()
    tablas.classes.push({
      discipline_id: DISCIPLINA_APARATOS.id,
      days_of_week: [1, 2, 3, 4, 5],
      start_time: '07:00:00',
      end_time: '22:00:00',
    })

    await mockSupabase(page, { tables: tablas })
    await page.goto('/')

    const seccion = page.locator('#scheduleList')
    await expect(seccion.getByText('Aparatos', { exact: true })).toBeVisible()
    await expect(seccion.getByText('Lun a Vie — 07:00 a 22:00 hs')).toBeVisible()
    await expect(seccion.getByText('Pase Libre / Horario de Gimnasio')).toHaveCount(0)
  })
})
