import { loginGoogle } from "./firebase";

// Aceptamos una "prop" (función) llamada activarInvitado
function Login({ activarInvitado }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-4 text-center">Task Manager Pro</h1>
      
      <p className="mb-8 text-gray-400 text-center max-w-md">
        Organiza tus tareas diarias. Puedes iniciar sesión para guardar tu progreso o probar la app como invitado.
      </p>
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {/* BOTÓN 1: Google */}
        <button
          onClick={loginGoogle}
          className="bg-white text-gray-900 px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2"
        >
          <span className="text-xl">G</span> Iniciar con Google
        </button>

        {/* BOTÓN 2: Invitado */}
        <button
          onClick={activarInvitado} // Ejecutamos la función que nos mandó App.jsx
          className="bg-gray-700 text-white px-6 py-3 rounded-full font-bold hover:bg-gray-600 transition border border-gray-600"
        >
          Entrar como Invitado
        </button>
      </div>
    </div>
  );
}

export default Login;