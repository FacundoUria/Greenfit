import { test, expect } from '@playwright/test'
import { mockSupabase } from './support/supabaseMock.js'
import { tablasBase, DISCIPLINA_CROSSFIT, DISCIPLINA_BOXEO, DISCIPLINA_APARATOS } from './support/fixtures.js'

// Rediseño visual de la landing (Stitch): todo lo que era real y funcionaba
// antes -- links, contenido dinámico desde Supabase, carrusel, formulario de
// WhatsApp -- tiene que seguir funcionando igual. Este spec cubre lo NUEVO
// del rediseño (la suite de landing-horarios.spec.js cubre "Elegí tu ritmo").

const WA = 'https://wa.me/5492617139662'
const MSG_PLANES = 'Hola GreenFit, quiero conocer los planes y probar una clase'

const DISCIPLINA_KICKSTRIKE = { id: 'disc-kickstrike', name: 'Kickstrike', kind: 'credits', is_active: true }

function tablasReales() {
  const tablas = tablasBase()
  tablas.disciplines = [DISCIPLINA_APARATOS, DISCIPLINA_BOXEO, DISCIPLINA_CROSSFIT, DISCIPLINA_KICKSTRIKE]
  tablas.classes = [
    { discipline_id: DISCIPLINA_BOXEO.id, days_of_week: [1, 3, 5], start_time: '17:00:00', end_time: '18:00:00' },
    { discipline_id: DISCIPLINA_KICKSTRIKE.id, days_of_week: [1, 2, 4, 5], start_time: '20:00:00', end_time: '21:00:00' },
    { discipline_id: DISCIPLINA_CROSSFIT.id, days_of_week: [1, 2, 3, 4, 5], start_time: '19:00:00', end_time: '20:00:00' },
    { discipline_id: DISCIPLINA_CROSSFIT.id, days_of_week: [1, 2, 3, 4, 5], start_time: '21:00:00', end_time: '22:00:00' },
    { discipline_id: DISCIPLINA_CROSSFIT.id, days_of_week: [6], start_time: '11:00:00', end_time: '12:00:00' },
  ]
  return tablas
}

test.describe('Landing -- links del header y del footer', () => {
  test('Instagram, WhatsApp, App Alumnos y Acceso Staff apuntan a los destinos reales', async ({ page }) => {
    await mockSupabase(page, { tables: tablasBase() })
    await page.goto('/')
    const header = page.locator('header')

    await expect(header.getByRole('link', { name: 'Instagram GreenFit' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/green_fitargentina/',
    )
    await expect(header.getByRole('link', { name: 'WhatsApp GreenFit' })).toHaveAttribute('href', WA)

    const app = header.getByRole('link', { name: 'Abrir app de alumnos GreenFit' })
    await expect(app).toHaveAttribute('href', 'https://greenfitapp.netlify.app/')
    await expect(app).toHaveAttribute('target', '_blank')

    const staff = header.getByRole('link', { name: 'Acceso Staff - Panel de Control' })
    await expect(staff).toHaveAttribute('href', 'https://greenfitadmin.netlify.app/login')
    await expect(staff).toHaveAttribute('target', '_blank')
  })

  test('el footer: WhatsApp Directo con el número real y Panel de Administración con destino real', async ({ page }) => {
    await mockSupabase(page, { tables: tablasBase() })
    await page.goto('/')
    const footer = page.locator('footer')

    await expect(footer.getByRole('link', { name: 'WhatsApp Directo' })).toHaveAttribute(
      'href',
      `${WA}?text=${encodeURIComponent(MSG_PLANES)}`,
    )
    await expect(footer.getByRole('link', { name: 'Panel de Administración' })).toHaveAttribute(
      'href',
      'https://greenfitadmin.netlify.app/login',
    )
    // horario real del gimnasio (el diseño original traía 07-22 / 09-14, inventado)
    await expect(footer.getByText('Lunes a Viernes 08:00 a 12:00 y 15:00 a 22:00 | Sábados 10:00 a 13:00')).toBeVisible()
  })

  test('sin links muertos (href="#"), sin placeholders de Google y sin el número de relleno', async ({ page }) => {
    await mockSupabase(page, { tables: tablasReales() })
    await page.goto('/')
    await expect(page.locator('#scheduleList .reveal')).toHaveCount(4)

    await expect(page.locator('a[href="#"]')).toHaveCount(0)

    const html = await page.content()
    expect(html).not.toContain('lh3.googleusercontent.com')
    expect(html).not.toContain('5492610000000')
    expect(html).not.toContain('cdn.tailwindcss.com')
  })

  test('todos los links internos (#...) apuntan a un ancla que existe, incluidas las históricas #clases y #contacto', async ({
    page,
  }) => {
    await mockSupabase(page, { tables: tablasBase() })
    await page.goto('/')

    const destinos = await page.$$eval('a[href^="#"]', (as) => [...new Set(as.map((a) => a.getAttribute('href').slice(1)))])
    expect(destinos.length).toBeGreaterThan(0)
    for (const id of [...destinos, 'clases', 'contacto']) {
      await expect(page.locator(`[id="${id}"]`), `ancla #${id}`).toHaveCount(1)
    }
  })
})

test.describe('Landing -- WhatsApp con mensajes prearmados', () => {
  test('cada botón "Anotarme" y el del hero llevan su mensaje prearmado con el número real', async ({ page }) => {
    await mockSupabase(page, { tables: tablasReales() })
    await page.goto('/')
    await expect(page.locator('#scheduleList .reveal')).toHaveCount(4)

    const fila = (nombre) => page.locator('#scheduleList .reveal', { has: page.getByRole('heading', { name: nombre }) })
    const esperado = {
      Aparatos: 'Quiero info para anotarme en Aparatos',
      Boxeo: 'Quiero info para clase de Boxeo',
      Crossfit: 'Quiero sumarme a CrossFit',
      Kickstrike: 'Quiero info de KickStrike',
    }
    for (const [nombre, mensaje] of Object.entries(esperado)) {
      await expect(fila(nombre).getByRole('link', { name: 'Anotarme' })).toHaveAttribute(
        'href',
        `${WA}?text=${encodeURIComponent(mensaje)}`,
      )
    }

    await expect(page.getByRole('link', { name: 'ESCRIBINOS POR WHATSAPP', exact: true })).toHaveAttribute(
      'href',
      `${WA}?text=${encodeURIComponent(MSG_PLANES)}`,
    )
  })

  test('si el número se cambia en Configuración (Admin), TODOS los links lo usan y conservan su mensaje', async ({ page }) => {
    const tablas = tablasReales()
    tablas.configuracion[0].whatsapp_numero = '5491100000000'
    await mockSupabase(page, { tables: tablas })
    await page.goto('/')
    await expect(page.locator('#scheduleList .reveal')).toHaveCount(4)

    await expect(page.getByRole('link', { name: 'WhatsApp GreenFit' })).toHaveAttribute('href', 'https://wa.me/5491100000000')
    await expect(page.getByRole('link', { name: 'ESCRIBINOS POR WHATSAPP', exact: true })).toHaveAttribute(
      'href',
      `https://wa.me/5491100000000?text=${encodeURIComponent(MSG_PLANES)}`,
    )
    const anotarBoxeo = page
      .locator('#scheduleList .reveal', { has: page.getByRole('heading', { name: 'Boxeo' }) })
      .getByRole('link', { name: 'Anotarme' })
    await expect(anotarBoxeo).toHaveAttribute(
      'href',
      `https://wa.me/5491100000000?text=${encodeURIComponent('Quiero info para clase de Boxeo')}`,
    )
    await expect(page.locator('[data-wa-text]')).toHaveText('+5491100000000')
  })
})

test.describe('Landing -- formulario de contacto por WhatsApp', () => {
  async function abrirLandingConWindowOpenEspiado(page, tablas) {
    await page.addInitScript(() => {
      window.__abiertas = []
      window.open = (...args) => {
        window.__abiertas.push(args)
        return null
      }
    })
    await mockSupabase(page, { tables: tablas })
    await page.goto('/')
    await expect(page.locator('#scheduleList .reveal').first()).toBeVisible()
  }
  const abiertas = (page) => page.evaluate(() => window.__abiertas)

  test('arma el mensaje con nombre, disciplina y mensaje, y abre WhatsApp con el número real', async ({ page }) => {
    await abrirLandingConWindowOpenEspiado(page, tablasReales())

    await page.getByLabel('Tu Nombre y Apellido').fill('Lucas Gómez')
    await page.getByLabel('Disciplina que te interesa').selectOption('Boxeo')
    await page.getByLabel('Mensaje (opcional)').fill('¿Hay clase de prueba?')
    await page.getByRole('button', { name: 'ENVIAR MENSAJE POR WHATSAPP' }).click()

    const llamadas = await abiertas(page)
    expect(llamadas).toHaveLength(1)
    const [url, destino] = llamadas[0]
    expect(destino).toBe('_blank')
    expect(url.startsWith(`${WA}?text=`)).toBe(true)
    expect(decodeURIComponent(url.split('?text=')[1])).toBe(
      '¡Hola GreenFit! Soy Lucas Gómez. Vi la página web y me interesa Boxeo. ¿Hay clase de prueba?',
    )
  })

  test('"Consulta General" sin mensaje extra: texto natural, sin saludo duplicado ni "undefined"', async ({ page }) => {
    await abrirLandingConWindowOpenEspiado(page, tablasReales())

    await page.getByLabel('Tu Nombre y Apellido').fill('Ana Pérez')
    await page.getByRole('button', { name: 'ENVIAR MENSAJE POR WHATSAPP' }).click()

    const [[url]] = await abiertas(page)
    expect(decodeURIComponent(url.split('?text=')[1])).toBe(
      '¡Hola GreenFit! Soy Ana Pérez. Vi la página web y me gustaría consultar por los planes y horarios disponibles.',
    )
  })

  test('no abre WhatsApp si falta el nombre (campo requerido)', async ({ page }) => {
    await abrirLandingConWindowOpenEspiado(page, tablasReales())

    await page.getByRole('button', { name: 'ENVIAR MENSAJE POR WHATSAPP' }).click()
    expect(await abiertas(page)).toHaveLength(0)
  })

  test('las opciones de disciplina salen del catálogo activo (una disciplina nueva aparece sola)', async ({ page }) => {
    const tablas = tablasReales()
    tablas.disciplines.push({ id: 'disc-danza', name: 'Danza', kind: 'credits', is_active: true })
    await abrirLandingConWindowOpenEspiado(page, tablas)

    const opciones = await page.locator('#client-discipline option').allTextContents()
    // El orden lo pone `.order('name')` en la base real -- el mock no ordena,
    // así que acá solo importa cuál es la primera y qué conjunto hay.
    expect(opciones[0]).toBe('Consulta General de Planes')
    expect(opciones.slice(1).sort()).toEqual(['Aparatos', 'Boxeo', 'CrossFit', 'Danza', 'Kickstrike'])
  })
})

test.describe('Landing -- contenido dinámico con el diseño nuevo', () => {
  test('horarios reales de cada disciplina', async ({ page }) => {
    await mockSupabase(page, { tables: tablasReales() })
    await page.goto('/')
    const lista = page.locator('#scheduleList')

    await expect(lista.getByText('Lunes a Viernes — 08:00 a 12:00 hs | 15:00 a 22:00 hs')).toBeVisible()
    await expect(lista.getByText('Sábados — 10:00 a 13:00 hs')).toBeVisible()
    await expect(lista.getByText('Lun · Mié · Vie — 17:00 a 18:00 hs')).toBeVisible()
    await expect(lista.getByText('Lun · Mar · Jue · Vie — 20:00 a 21:00 hs')).toBeVisible()
    await expect(lista.getByText('Lun a Vie — 19:00 a 20:00 hs')).toBeVisible()
    await expect(lista.getByText('Lun a Vie — 21:00 a 22:00 hs')).toBeVisible()
    await expect(lista.getByText('Sáb — 11:00 a 12:00 hs')).toBeVisible()
  })

  test('"Todo bajo un mismo techo" solo lista disciplinas activas, con sus días; el contador acompaña', async ({ page }) => {
    const tablas = tablasReales()
    tablas.disciplines = tablas.disciplines.map((d) => (d.id === DISCIPLINA_KICKSTRIKE.id ? { ...d, is_active: false } : d))
    await mockSupabase(page, { tables: tablas })
    await page.goto('/')

    const grilla = page.locator('#disciplineGrid')
    await expect(grilla.getByRole('heading', { name: 'Boxeo' })).toBeVisible()
    await expect(grilla.getByRole('heading', { name: 'Kickstrike' })).toHaveCount(0)
    await expect(grilla.getByText('Lun · Mié · Vie')).toBeVisible()
    await expect(page.locator('#disciplineCount')).toHaveText('3')
    // ...pero "Elegí tu ritmo" sigue mostrando TODO el catálogo
    await expect(page.locator('#scheduleList').getByRole('heading', { name: 'Kickstrike' })).toBeVisible()
  })

  test('sin disciplinas cargadas: mensajes de catálogo vacío, sin romper el layout', async ({ page }) => {
    const tablas = tablasBase()
    tablas.disciplines = []
    tablas.classes = []
    await mockSupabase(page, { tables: tablas })
    await page.goto('/')

    await expect(page.getByText('Estamos actualizando nuestro catálogo de disciplinas.')).toBeVisible()
    await expect(page.getByText('Todavía no hay horarios cargados.')).toBeVisible()
  })

  test('el banner de anuncios (Admin) sigue apareciendo por encima del header, sin quedar tapado', async ({ page }) => {
    const tablas = tablasBase()
    tablas.configuracion[0] = {
      ...tablas.configuracion[0],
      banner_activo: true,
      banner_mensaje: 'Inscripciones abiertas',
      banner_link_text: 'Más info',
      banner_link_url: 'https://example.com/promo',
    }
    await mockSupabase(page, { tables: tablas })
    await page.goto('/')

    const banner = page.locator('#announceBanner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('Inscripciones abiertas')
    await expect(banner.getByRole('link', { name: 'Más info' })).toHaveAttribute('href', 'https://example.com/promo')

    const cajaBanner = await banner.boundingBox()
    const cajaHeader = await page.locator('header').boundingBox()
    expect(cajaBanner.y + cajaBanner.height).toBeLessThanOrEqual(cajaHeader.y + 1)
  })

  test('sin banner activo el banner queda oculto', async ({ page }) => {
    await mockSupabase(page, { tables: tablasBase() })
    await page.goto('/')
    await expect(page.locator('#announceBanner')).toBeHidden()
  })

  test('Instagram configurado en el Admin se refleja en header, ubicación y footer', async ({ page }) => {
    const tablas = tablasBase()
    tablas.configuracion[0].instagram_usuario = 'otro_usuario'
    await mockSupabase(page, { tables: tablas })
    await page.goto('/')

    await expect(page.locator('[data-ig-link]').first()).toHaveAttribute('href', 'https://www.instagram.com/otro_usuario/')
    for (const el of await page.locator('[data-ig-link]').all()) {
      await expect(el).toHaveAttribute('href', 'https://www.instagram.com/otro_usuario/')
    }
    await expect(page.locator('[data-ig-text]').first()).toHaveText('@otro_usuario')
  })
})

test.describe('Landing -- galería y mapa', () => {
  test('el carrusel real conserva sus 9 elementos (5 fotos y 4 videos con controles) y los botones lo desplazan', async ({
    page,
  }) => {
    await mockSupabase(page, { tables: tablasBase() })
    await page.goto('/')

    const items = page.locator('#gTrack .g-item')
    await expect(items).toHaveCount(9)
    await expect(page.locator('#gTrack video[controls]')).toHaveCount(4)
    await expect(page.locator('#gTrack img')).toHaveCount(5)

    const track = page.locator('#gTrack')
    expect(await track.evaluate((el) => el.scrollLeft)).toBe(0)
    await page.locator('#gallery-next').click()
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
    await page.locator('#gallery-prev').click()
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBe(0)
  })

  test('todas las imágenes y videos de la galería existen (ninguno roto) y el mapa interactivo sigue ahí', async ({ page }) => {
    await mockSupabase(page, { tables: tablasBase() })
    const rotos = []
    page.on('response', (r) => {
      const url = r.url()
      if (/\/(img|video)\//.test(url) && r.status() >= 400) rotos.push(`${r.status()} ${url}`)
    })
    await page.goto('/')
    await page.locator('#gTrack video').first().scrollIntoViewIfNeeded()
    await page.waitForLoadState('networkidle')
    expect(rotos).toEqual([])

    await expect(page.locator('iframe[src*="google.com/maps"]')).toHaveAttribute('src', /-32\.8673553,-68\.8268646/)
    await expect(page.getByRole('link', { name: 'Abrir en Google Maps' })).toHaveAttribute(
      'href',
      'https://maps.google.com/?q=Videla+Castillo+3131+Mendoza+Argentina',
    )
  })
})

test.describe('Landing -- mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('en mobile siguen visibles el acceso a la App de alumnos y al Staff (el diseño original los ocultaba)', async ({
    page,
  }) => {
    await mockSupabase(page, { tables: tablasBase() })
    await page.goto('/')
    const header = page.locator('header')

    await expect(header.getByRole('link', { name: 'Abrir app de alumnos GreenFit' })).toBeVisible()
    await expect(header.getByRole('link', { name: 'Acceso Staff - Panel de Control' })).toBeVisible()
  })

  test('sin scroll horizontal de página', async ({ page }) => {
    await mockSupabase(page, { tables: tablasReales() })
    await page.goto('/')
    await expect(page.locator('#scheduleList .reveal')).toHaveCount(4)

    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(desborde).toBeLessThanOrEqual(0)
  })
})
