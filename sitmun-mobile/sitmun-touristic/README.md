# SITMUN Touristic Mobile Application

## Plataforma de desarrollo

**touristic-mobile-app** ha sido desarrollada
utilizando el **framework Ionic**, en conjunto con **Angular** para la construcción de la interfaz y lógica de negocio, y **Capacitor** para acceder a funcionalidades nativas de los dispositivos móviles.


## REQUISITOS DEL SISTEMA

|                            |                       |                                                          |
|----------------------------|-----------------------|----------------------------------------------------------|
| Herramienta                | Versión recomendada   | Notas                                                    |
| Node.js                    | 22.x LTS              | <https://nodejs.org/es>                                  |
| npm (Node Package Manager) | 10.x                  | Se instala con Node.js                                   |
| Ionic CLI                  | 7.x                   | <https://ionicframework.com/>                            |
| Angular CLI                | 19.x                  | <https://angular.dev/installation>                       |
| Capacitor                  | 6.x                   | Incluido en Ionic                                        |
| Java JDK                   | 17.x                  | <https://www.oracle.com/es/java/technologies/downloads/> |
| Android SDK                | 34.x                  | <https://developer.android.com/studio?hl=es-419>         |
| Git                        | Cualquiera compatible | Para clonar el repositorio                               |
| Dispositivo móvil Android  | Android 13.x          | Para pruebas físicas                                     |

Para que la aplicación funcione correctamente, previamente será
necesario tener desplegado **sitmun-application-stack** así como el servicio que devuelve la lista de instancias disponibles.

Para pruebas en local se puede montar de forma muy sencilla con python y Flask el servicio que devuelva un fichero json con la lista de instancias
```python
from flask import Flask, send_file

app = Flask(__name__)

@app.route('/instances')
def serve():
    return send_file('./instancias_sitmun.json', mimetype='application/json')


if __name__ == '__main__':
    app.run(host='0.0.0.0')
```

Formato del json de instancias:
```json
{
   "menorca": {
     "name": "Menorca", //texto que se muestra en el selector de instancia
     "urlBackend": "https://sitmun.menorca.es/backend"
   },
   "barcelona": {
     "name": "Barcelona",
     "urlBackend": "https://sitmun.barcelona.es/backend"
   }
}
```


## CLONACIÓN DEL PROYECTO

Clonar el proyecto utilizando git en el directorio local deseado:
```bash
git clone https://github.com/sitmun/touristic-mobile-app.git
```
## INSTALACIÓN DE DEPENDENCIAS

Instalar las dependencias necesarias de la aplicación:
```bash
cd ./touristic-mobile-app
npm install
```
## INTEGRACIÓN CON CAPACITOR

Añadir plataforma para compilar en Android:
```bash
ionic cap add android
```

## CONFIGURACIONES

1\. **Establecer la url al servicio de instancias**

En los ficheros de entorno hay que establecer la url a la que se van a realizar la petición de obtención de instancias (**instancesUrl**).

>src/environments/environment.ts
>
>src/environments/environment.prod.ts
>
>src/environments/environment.dev.ts

Como opción alternativa se puede establecer el json de instancias en las propias variables de entorno (**instancesData**) y se usará si **instanceUrl** es nula o cadena vacía.

2\. **Copiar configuraciones SO**

**Android:**

Copiar el fichero /resources/android/AndroidManifest.xml en /android/app/src/main


## COMPILAR Y EJECUTAR EN ANDROID

Compilar la aplicación:
```bash
ionic cap build
```
Copia los ficheros a la versión Android:
```bash
ionic cap copy android
```
Para generar la apk, es posible utilizar solo las herramientas de líneas
de comandos, obtenidas en el paquete SDK de android, o mediante Android
Studio, que tiene incorporado las mismas herramientas.

1\. Línea de comandos

Para poder ejecutar la aplicación mediante linea de comandos en un dispositivo físico debe estar conectado por USB y tener las opciones de desarrollador activadas.

Compilar y ejecutar la aplicación en el dispositivo móvil
```bash
ionic cap run android --device
```
Este comando mostrará las opciones de dispositivos y emuladores disponibles. Seleccionar el deseado.

El comando, aparte de ejecutar la app en el dispositivo elegido, genera la apk. Se encuentra en el directorio del proyecto, en
**/android/app/build/outputs/apk/debug**.
Si se prefiere usar la apk, transferir la APK al
dispositivo (por USB, correo, Drive, etc.) y abrir el archivo *.apk*
desde un **gestor de archivos** o el navegador.

2\. Instalar la app en el dispositivo a través de Android
Studio:

Abrir la aplicación en Android Studio:
```bash
ionic cap open android
```
Una vez la aplicación ha sido cargada en Android Studio, generar la APK
correspondiente en la opción Build / Generate APK de Android Studio.

El fichero generado se encuentra en el directorio del proyecto, en
**/android/app/build/outputs/apk/debug**. Transferir la APK al
dispositivo (por USB, correo, Drive, etc.) y abrir el archivo *.apk*
desde un **gestor de archivos** o el navegador.
