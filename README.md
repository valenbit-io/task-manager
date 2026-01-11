# 🚀 ValenBit Task Manager

![MERN Stack](https://img.shields.io/badge/MERN-Full%20Stack-blue)
![Status](https://img.shields.io/badge/Status-Completed-success)
![License](https://img.shields.io/badge/License-MIT-green)

Una aplicación web full-stack para la gestión de tareas, diseñada para maximizar la productividad personal. Construida con la arquitectura **MERN** (MongoDB, Express, React, Node.js) y desplegada en la nube.

🔗 **Demo en vivo:** [https://taskmanagerbit.vercel.app](https://taskmanagerbit.vercel.app)

---

## 📸 Vista Previa

![Dashboard Preview](./screenshot.png)

---

## ✨ Características Destacadas

* **🔐 Autenticación Segura:** Inicio de sesión mediante Google (Firebase Auth).
* **🗑️ Sistema de Auto-Limpieza (TTL):** Las tareas se eliminan automáticamente de la base de datos 24 horas después de creadas para mantener el enfoque en el día a día.
* **🔄 Arrastrar y Soltar (Drag & Drop):** Posibilidad de reordenar la prioridad de las tareas visualmente (Backend sincronizado).
* **⚡ CRUD en Tiempo Real:** Crear, leer, actualizar y eliminar tareas instantáneamente.
* **🎨 Diseño UI/UX Moderno:** Interfaz limpia y responsiva construida con **Tailwind CSS**.
* **🛡️ Seguridad:** Configuración de CORS dinámica y protección contra inyecciones NoSQL.

---

## 🛠️ Stack Tecnológico

### Frontend (Cliente)
* **React.js (Vite):** Framework principal.
* **Tailwind CSS:** Estilos y diseño responsivo.
* **Firebase SDK:** Gestión de identidad y autenticación.
* **Axios:** Consumo de API REST.

### Backend (Servidor)
* **Node.js & Express:** API RESTful robusta.
* **MongoDB Atlas:** Base de datos NoSQL en la nube.
* **Mongoose:** Modelado de datos (Schemas y Validaciones).
* **Cors:** Gestión de seguridad de orígenes cruzados.

### Infraestructura (DevOps)
* **Frontend:** Vercel.
* **Backend:** Render (Web Service).

---

## ⚙️ Instalación y Ejecución Local

Si deseas probar el código en tu máquina:

1.  **Clonar el repositorio**
    ```bash
    git clone [https://github.com/valenbit-io/task-manager.git](https://github.com/valenbit-io/task-manager.git)
    cd task-manager
    ```

2.  **Configurar Backend**
    ```bash
    cd server
    npm install
    ```
    *Crea un archivo `.env` en la carpeta `server` con tus credenciales:*
    ```env
    PORT=5000
    MONGO_URI=tu_cadena_de_conexion_de_mongodb
    CLIENT_URL=http://localhost:5173
    ```
    *Iniciar servidor:*
    ```bash
    npm start
    ```

3.  **Configurar Frontend**
    *Abre una nueva terminal:*
    ```bash
    cd client
    npm install
    npm run dev
    ```

---

## 👨‍💻 Autor

**ValenBit** - Desarrollador Full Stack
* GitHub: [@valenbit-io](https://github.com/valenbit-io)

---

Hecho con 💜 y mucho código.