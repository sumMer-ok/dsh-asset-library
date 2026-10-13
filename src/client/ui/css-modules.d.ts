/**
 * Ambient type for CSS Modules imports.
 *
 * tsdown's client preset compiles `*.module.css` with lightningcss and exports the
 * hashed class map as the module's default export, so every stylesheet import in
 * this directory is a plain string record at runtime.
 */

declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
