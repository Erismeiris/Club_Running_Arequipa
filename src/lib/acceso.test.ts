import { describe, expect, it } from 'vitest'
import { CLAVES, comprobarClave, zonaDesbloqueada } from './acceso'

describe('claves de acceso', () => {
  it('cada zona acepta su clave, también con espacios alrededor', () => {
    expect(comprobarClave('puerta', CLAVES.puerta)).toBe(true)
    expect(comprobarClave('organizador', ` ${CLAVES.organizador} `)).toBe(true)
  })

  it('la clave de organizador abre la puerta, pero la de puerta no abre el panel', () => {
    expect(comprobarClave('puerta', CLAVES.organizador)).toBe(true)
    expect(comprobarClave('organizador', CLAVES.puerta)).toBe(false)
  })

  it('rechaza claves incorrectas o vacías', () => {
    expect(comprobarClave('puerta', '')).toBe(false)
    expect(comprobarClave('puerta', CLAVES.puerta.toUpperCase())).toBe(false)
    expect(comprobarClave('organizador', 'otra')).toBe(false)
  })

  it('sin sessionStorage todo empieza bloqueado', () => {
    expect(zonaDesbloqueada('puerta')).toBe(false)
    expect(zonaDesbloqueada('organizador')).toBe(false)
  })
})
