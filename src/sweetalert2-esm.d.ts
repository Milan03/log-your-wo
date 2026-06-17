// SweetAlert2 ships no `exports` map, so the bare `sweetalert2` specifier
// resolves to its UMD bundle (a CommonJS optimization bailout under esbuild).
// Import the ESM bundle directly instead, re-exporting the package's official
// types so call sites stay fully typed.
declare module 'sweetalert2/dist/sweetalert2.esm.all.js' {
    export * from 'sweetalert2';
    export { default } from 'sweetalert2';
}
