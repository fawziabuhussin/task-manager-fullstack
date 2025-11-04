// server/src/types/global.d.ts

// If you don't want to install @types/bcrypt, keep this:
// (Install @types/bcrypt instead for better typing.)
declare module 'bcrypt' {
  const anyBcrypt: any;
  export default anyBcrypt;
}
