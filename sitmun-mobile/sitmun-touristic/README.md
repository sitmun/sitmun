# SITMUN Touristic

## Plataforma de desarrollo

La aplicación en `sitmun-mobile/sitmun-touristic` usa Ionic, Angular y Capacitor.

## Requisitos

Las versiones salen del `catalog` de [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml).

- Node.js 24.22.0 ([`.nvmrc`](../../.nvmrc)) y pnpm (`packageManager` en el `package.json` de la raíz)
- Angular 22, Ionic 8 y Capacitor 8
- JDK 21 y Android SDK 36 para compilar Android. Capacitor 8 compila con Java 21 y `compileSdk` 36. La versión mínima de Android es la 7.0 (`minSdk` 24). No hay proyecto `android/` versionado.

La aplicación necesita un [sitmun/sitmun](https://github.com/sitmun/sitmun) desplegado y un servicio que devuelva la lista de instancias.

## Servicio de instancias

El servicio devuelve un JSON. Cada clave es una instancia. `name` es el texto del selector de instancia y `urlBackend` es la URL del backend.

```json
{
  "menorca": {
    "name": "Menorca",
    "urlBackend": "https://sitmun.menorca.es/backend"
  },
  "barcelona": {
    "name": "Barcelona",
    "urlBackend": "https://sitmun.barcelona.es/backend"
  }
}
```

Para probar en local, este servicio Flask sirve ese fichero:

```python
from flask import Flask, send_file

app = Flask(__name__)

@app.route('/instances')
def serve():
    return send_file('./instancias_sitmun.json', mimetype='application/json')


if __name__ == '__main__':
    app.run(host='0.0.0.0')
```

En `src/environments/environment.ts`, `environment.prod.ts` y `environment.dev.ts`, `instancesUrl` es la URL de ese servicio. Si `instancesUrl` está vacía, la aplicación usa `instancesData`, con el mismo formato.

## Instalación

Desde la raíz del repositorio:

```bash
pnpm ci --filter ./sitmun-mobile/sitmun-touristic...
```

## Integración con Capacitor

Desde `sitmun-mobile/sitmun-touristic`, añadir la plataforma Android (no está en el repositorio):

```bash
pnpm exec cap add android
```

Copiar `resources/android/AndroidManifest.xml` a `android/app/src/main`.

## Compilar y abrir Android Studio

```bash
pnpm run android
```

El script hace `pnpm exec ng build`, `pnpm exec cap sync android`, `pnpm exec cap copy android` y `pnpm exec cap open android`. En Android Studio, **Build / Generate APK** deja la APK de depuración en `android/app/build/outputs/apk/debug`.

Para ejecutarla en un dispositivo conectado por USB con las opciones de desarrollador activadas:

```bash
pnpm exec ng build
pnpm exec cap run android
```

`cap run` pregunta qué dispositivo o emulador usar.
