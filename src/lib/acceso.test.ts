import { describe, expect, it } from 'vitest'
import { CLAVE_PUERTA, comprobarClave, puertaDesbloqueada } from './acceso'

describe('clave de la puerta', () => {
  it('acepta la clave, también con espacios alrededor', () => {
    expect(comprobarClave(CLAVE_PUERTA)).toBe(true)
    expect(comprobarClave(`  ${CLAVE_PUERTA} `)).toBe(true)
  })

  it('rechaza claves incorrectas o vacías', () => {
    expect(comprobarClave('')).toBe(false)
    expect(comprobarClave(CLAVE_PUERTA.toUpperCase())).toBe(false)
    expect(comprobarClave('otra')).toBe(false)
  })

  it('sin sessionStorage la puerta empieza bloqueada', () => {
    expect(puertaDesbloqueada()).toBe(false)
  })
})
