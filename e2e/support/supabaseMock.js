// Esta landing es HTML estático puro (sin build, sin variables de entorno):
// el cliente de Supabase vive en un <script type="module"> con la URL/
// anon-key del proyecto REAL hardcodeadas -- no hay ningún ".env.e2e" que
// swapear como en los otros dos repos del ecosistema (greenfit-app,
// PAGINA SUPABASE). La seguridad de "esta suite NUNCA toca producción"
// corre enteramente por intercepción de red: se registra un page.route()
// sobre el hostname REAL de Supabase ANTES de cualquier page.goto(), así
// que cualquier request de la página a ese host SIEMPRE cae acá adentro,
// nunca sale a internet -- y cualquier ruta no contemplada explícitamente
// tira 404 en vez de dejar pasar nada ("fail closed").
//
// Esta landing solo hace lecturas (nunca login, nunca inserts/updates) --
// el mock es deliberadamente más chico que el de los otros repos, sin
// soporte de auth/rpc/mutaciones que acá no hacen falta.
export const SUPABASE_HOST = 'pgigyscgsrowlfddfnbj.supabase.co'

// Filtrado real y básico estilo PostgREST (?columna=operador.valor) --
// mismo criterio (duplicado a propósito, sin paquete compartido entre
// repos) que greenfit-app/e2e/support/supabaseMock.ts y
// PAGINA SUPABASE/e2e/support/supabaseMock.js.
function aplicarFiltros(filas, searchParams) {
  let resultado = filas
  for (const [columna, valorCrudo] of searchParams.entries()) {
    if (['select', 'order', 'limit', 'offset'].includes(columna)) continue
    const separador = valorCrudo.indexOf('.')
    if (separador === -1) continue
    const operador = valorCrudo.slice(0, separador)
    const valor = valorCrudo.slice(separador + 1)

    if (operador === 'eq') {
      resultado = resultado.filter((fila) => String(fila[columna]) === valor)
    } else if (operador === 'in') {
      const valores = valor
        .replace(/^\(|\)$/g, '')
        .split(',')
        .map((v) => v.replace(/^"|"$/g, ''))
      resultado = resultado.filter((fila) => valores.includes(String(fila[columna])))
    }
  }
  return resultado
}

async function responderJson(route, status, body) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

export async function mockSupabase(page, { tables = {} } = {}) {
  await page.route(
    (url) => url.hostname === SUPABASE_HOST,
    async (route) => {
      const request = route.request()
      const reqUrl = new URL(request.url())
      const pathname = reqUrl.pathname

      if (!pathname.startsWith('/rest/v1/')) {
        await responderJson(route, 404, { message: `[e2e mock] sin fixture para ${pathname}` })
        return
      }

      const table = pathname.replace('/rest/v1/', '')
      const filas = aplicarFiltros(tables[table] ?? [], reqUrl.searchParams)
      const acceptHeader = request.headers()['accept'] ?? ''
      const esperaUnaSola = acceptHeader.includes('vnd.pgrst.object')
      const body = esperaUnaSola ? (filas[0] ?? null) : filas
      await responderJson(route, 200, body)
    }
  )
}
