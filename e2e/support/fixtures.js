// Fixtures compartidas -- mismo criterio de nombres/ids que ya usan
// PAGINA SUPABASE/e2e/support/fixtures.js y greenfit-app/e2e/support/fixtures.ts
// (sin paquete compartido entre los tres repos, se duplica a propósito).
export const DISCIPLINA_CROSSFIT = { id: 'disc-crossfit', name: 'CrossFit', kind: 'credits', is_active: true }
export const DISCIPLINA_BOXEO = { id: 'disc-boxeo', name: 'Boxeo', kind: 'credits', is_active: true }
// Aparatos: kind='membership' -- acceso libre por diseño, SIN filas en
// `classes` (mismo criterio que el resto del ecosistema). Es la disciplina
// que antes quedaba oculta por completo en "Elegí tu ritmo".
export const DISCIPLINA_APARATOS = { id: 'disc-aparatos', name: 'Aparatos', kind: 'membership', is_active: true }

export function tablasBase() {
  return {
    configuracion: [
      {
        id: 1,
        banner_activo: false,
        banner_mensaje: null,
        banner_link_text: null,
        banner_link_url: null,
        whatsapp_numero: null,
        instagram_usuario: null,
      },
    ],
    disciplines: [DISCIPLINA_CROSSFIT, DISCIPLINA_BOXEO, DISCIPLINA_APARATOS],
    classes: [
      { discipline_id: DISCIPLINA_CROSSFIT.id, days_of_week: [1, 3, 5], start_time: '18:00:00', end_time: '19:00:00' },
      { discipline_id: DISCIPLINA_BOXEO.id, days_of_week: [2, 4], start_time: '20:00:00', end_time: '21:00:00' },
      // Aparatos: sin filas acá a propósito.
    ],
  }
}
