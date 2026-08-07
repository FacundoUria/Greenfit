import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/supabaseMock.js'
import { tablasBase, DISCIPLINA_BOXEO, DISCIPLINA_APARATOS } from './support/fixtures.js'

// Cubre el checklist de "Sincronización Landing vs. Admin": la sección
// "Elegí tu ritmo" tiene que mostrar TODAS las disciplinas activas -- antes,
// cualquiera sin filas en `classes` (ej. Aparatos, kind='membership', pase
// libre por diseño) quedaba oculta por completo en vez de aparecer con un
// badge de Pase Libre. También cubre que un horario recién editado desde el
// Admin (una fila nueva/distinta en `classes`) se refleje acá -- dado que
// esta landing y el Admin son dos apps separadas sin sesión compartida en
// los tests (cada una con su propio backend mockeado), el contrato se
// prueba así: PAGINA SUPABASE/e2e/disciplinas-horarios.spec.js ya prueba
// que el Admin escribe bien en `classes`; este spec prueba que la landing
// LEE y RENDERIZA bien esa misma tabla, con exactamente la forma que el
// Admin la deja.
test.describe('Landing -- "Elegí tu ritmo"', () => {
  test('muestra las disciplinas con horarios reales Y Aparatos con el badge de Pase Libre (antes quedaba oculta)', async ({
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
