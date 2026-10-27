import { Injectable } from '@angular/core';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { SQLiteService } from './sqlite.service';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private db: SQLiteDBConnection | null = null;
  private dbPublic: string = 'public.db';
  private dbUser: string = ''

  constructor(private sqlite: SQLiteService) {
  }

  async loadConnection(name: string) {
    try {
      let isConnection = await this.sqlite.isConnection(name);
      if (isConnection.result) {
        console.log("Obteniendo conexion");
        this.db = await this.sqlite.retrieveConnection(name);
        await this.db.open();
      } else {
        console.log("Creando conexion");
        this.db = await this.sqlite.createConnection(name, false, "no-encryption", 1);
        console.log("Abriendo conexion");
        await this.db.open();
      }
    } catch (error) {
      throw Error(`DatabaseServiceError: ${error}`);
    }
  }

  async closeConnection(name: string): Promise<void> {
    await this.sqlite.closeConnection(name);
    this.db = null;
    console.log("Conexion cerrada");
  }

  checkPlugin() {
    let available = true;
    if (!Capacitor.isPluginAvailable('CapacitorSQLite')) {
      available = false;
      console.error('CapacitorSQLite plugin no disponible');
    } else {
      console.log('CapacitorSQLite plugin disponible');
    }
    return available;
  }

  async initDatabase(dbName: string, createTables: Function) {
    try {
      console.log('Inicializando base de datos');
      if (this.sqlite.getPlatform() === 'web') {
        await this.sqlite.initializeWebStore();
        console.log('Web store inicializado');
      }
      await this.loadConnection(dbName);
      await createTables();
      await this.closeConnection(dbName);
      console.log(`Base de datos ${dbName} inicializada`);
    } catch (error) {
      throw Error(`DatabaseServiceError: ${error}`);
    }
  }

  async initUserDatabase(dbName: string) {
    if (this.sqlite.getPlatform() !== 'web' && !this.checkPlugin()) {
      console.log('Plugin no disponible');
      return;
    }
    this.dbUser = `${dbName}.db`;
    await this.initDatabase(this.dbUser, this.createUserTables.bind(this));
  }

  async initPublicDatabase() {
    if (this.sqlite.getPlatform() !== 'web' && !this.checkPlugin()) {
      console.log('Plugin no disponible');
      return;
    }
    await this.initDatabase(this.dbPublic, this.createPublicTables.bind(this));
  }

  private async createUserTables(): Promise<void> {
    await this.createAppsTable();
    await this.createTerritoryTable();
    await this.createLayersTable();
    await this.createbgLayersTable();
    await this.createFeatureEditionsTable();
    //await this.createAppTerLayerTable();
  }

  private async createPublicTables(): Promise<void> {
    await this.createUserLoginTable();
    await this.createInstanceTable();
  }

  private async createUserLoginTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS userlogin (
        name TEXT PRIMARY KEY,
        logged BOOLEAN,
        last_login DATETIME
      );
    `;

    try {
      if(this.db) {
        console.log("Creando tabla userlogin...");
        const changes = await this.db.execute(createTableQuery);
        console.log('Tabla userlogin creada correctamente');
      } else {
        console.log("Conexion nula (userlogin)");
      }
    } catch (error) {
      console.error('Error creando tabla userlogin:', error);
    }
  }

  private async createInstanceTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS instances (
        instance TEXT,
        PRIMARY KEY (instance)
      );
    `;

    try {
      if(this.db) {
        console.log("Creando tabla instances...");
        const changes = await this.db.execute(createTableQuery);
        console.log('Tabla instances creada correctamente');
      } else {
        console.log("Conexion nula (instances)");
      }
    } catch (error) {
      console.error('Error creando tabla instances:', error);
    }
  }

  private async createAppsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS apps (
        id INTEGER PRIMARY KEY,
        title TEXT,
        logo TEXT
      );
    `;

    try {
      if(this.db) {
        console.log("Creando tabla apps...");
        const changes = await this.db.execute(createTableQuery);
        console.log('Tabla apps creada correctamente');
      } else {
        console.log("Conexion nula (apps)");
      }
    } catch (error) {
      console.error('Error creando tabla apps:', error);
    }
  }

  private async createTerritoryTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS territory (
        id INTEGER PRIMARY KEY,
        id_app INTEGER,
        name TEXT
      );
    `;

    try {
      if(this.db) {
        console.log("Creando tabla territorio...");
        const changes = await this.db.execute(createTableQuery);
        console.log('Tabla territorio creada correctamente');
      } else {
        console.log("Conexion nula (territorio)");
      }
    } catch (error) {
      console.error('Error creando tabla territorio:', error);
    }
  }

  private async createLayersTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS layers (
        id_app INTEGER,
        id_ter INTEGER,
        id_layer TEXT,
        name TEXT,
        fieldsjson TEXT,
        geojson TEXT,
        extension TEXT,
        zoom INTEGER,
        proj TEXT,        
        PRIMARY KEY(id_app, id_ter, id_layer)
      );
    `;

    try {
      if(this.db) {
        console.log("Creando tabla layers...");
        const changes = await this.db.execute(createTableQuery);
        console.log('Tabla layers creada correctamente');
      } else {
        console.log("Conexion nula (layers)");
      }
    } catch (error) {
      console.error('Error creando tabla layers:', error);
    }
  }

  private async createbgLayersTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS bgLayers (
        id_app INTEGER,
        id_ter INTEGER,
        title TEXT,
        path TEXT,      
        PRIMARY KEY(id_app, id_ter)
      );
    `;

    try {
      if(this.db) {
        console.log("Creando tabla bglayers...");
        const changes = await this.db.execute(createTableQuery);
        console.log('Tabla bglayers creada correctamente');
      } else {
        console.log("Conexion nula (bglayers)");
      }
    } catch (error) {
      console.error('Error creando tabla bglayers:', error);
    }
  }

   private async createFeatureEditionsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS featureEditions (
        id_app INTEGER,
        id_ter INTEGER,
        id_layer TEXT,
        editionjson TEXT, 
        PRIMARY KEY(id_app, id_ter, id_layer)
      );
    `;

    try {
      if(this.db) {
        console.log("Creando tabla ediciones...");
        const changes = await this.db.execute(createTableQuery);
        console.log('Tabla Ediciones creada correctamente');
      } else {
        console.log("Conexion nula (ediciones)");
      }
    } catch (error) {
      console.error('Error creando tabla Ediciones:', error);
    }
  }
/*
  private async createAppTerLayerTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS app_ter_layer (
        id_app INTEGER,
        id_ter INTEGER,
        id_layer TEXT,
        PRIMARY KEY(id_app, id_ter, id_layer)
      );
    `;

    try {
      if(this.db) {
        console.log("Creando tabla app_ter_layer...");
        const changes = await this.db.execute(createTableQuery);
        console.log('Tabla app_ter_layer creada correctamente');
      } else {
        console.log("Conexion nula (app_ter_layer)");
      }
    } catch (error) {
      console.error('Error creando tabla app_ter_layer:', error);
    }
  }
  */
  async insertApp(id: number, title: string, logo: string) {
    await this.loadConnection(this.dbUser);
    const statement = `INSERT OR REPLACE INTO apps (id, title, logo) VALUES (?, ?, ?)`;
    const values = [id, title, logo];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`App ${title} agregada`);
      }
    } catch (error) {
      console.error('Error al insertar la app', error);
    }
    await this.closeConnection(this.dbUser);
  }

  async insertTerritory(id: number, idApp: number, name: string) {
    await this.loadConnection(this.dbUser);
    const statement = `INSERT OR REPLACE INTO territory (id, id_app, name) VALUES (?, ?, ?)`;
    const values = [id, idApp, name];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`Territorio ${name} agregado`);
      }
    } catch (error) {
      console.error('Error al insertar el territorio', error);
    }
    await this.closeConnection(this.dbUser);
  }
/*
  async insertAppTerLayer(idApp: number, idTer: number, idLayer: string) {
    //await this.loadConnection(this.dbName);
    const statement = `INSERT OR REPLACE INTO app_ter_layer (id_app, id_ter, id_layer) VALUES (?, ?, ?)`;
    const values = [idApp, idTer, idLayer];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`app_ter_layer agregada`);
      }
    } catch (error) {
      console.error('Error al insertar la app_ter_layer', error);
    }
    //await this.closeConnection(this.dbName);
  }
*/
  async insertLayer(idApp: number, idTer: number, idLayer: string, 
    name: string, fields: string, geojson: string, extension: string, zoom: number, proj: string) {
    await this.loadConnection(this.dbUser);
    const statement = `INSERT OR REPLACE INTO layers (id_app, id_ter, id_layer, name, fieldsjson, geojson, extension, zoom, proj) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [idApp, idTer, idLayer, name, fields, geojson, extension, zoom, proj];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`Layer ${name} agregado`);
      }
    } catch (error) {
      console.error('Error al insertar el layer', error);
    }
    await this.closeConnection(this.dbUser);
  }

  async insertbgLayer(idApp: number, idTer: number, title: string, path: string) {
    await this.loadConnection(this.dbUser);
    const statement = `INSERT OR REPLACE INTO bgLayers (id_app, id_ter, title, path) VALUES (?, ?, ?, ?)`;
    const values = [idApp, idTer, title, path];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`bgLayer agregado`);
      }
    } catch (error) {
      console.error('Error al insertar el bglayer', error);
    }
    await this.closeConnection(this.dbUser);
  }

  async insertEdition(idApp: number, idTer: number, idLayer: string, edition: string) {
    await this.loadConnection(this.dbUser);
    const statement = `INSERT OR REPLACE INTO featureEditions (id_app, id_ter, id_layer, editionjson) VALUES (?, ?, ?, ?)`;
    const values = [idApp, idTer, idLayer, edition];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`Edición agregada`);
      }
    } catch (error) {
      console.error('Error al insertar la edición', error);
    }
    await this.closeConnection(this.dbUser);
  }

  async insertUserLogin(name: string) {
    await this.loadConnection(this.dbPublic);
    const statement = `INSERT OR REPLACE INTO userlogin (name, logged, last_login) VALUES (?, TRUE, strftime('%s', 'now'))`;
    const values = [name];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`Usuario ${name} agregado`);
      }
    } catch (error) {
      console.error('Error al insertar el usuario', error);
    }
    await this.closeConnection(this.dbPublic);
  }

   async insertInstance(instance: string) {
    await this.loadConnection(this.dbPublic);
    await this.truncateInstances();
    const statement = `INSERT OR REPLACE INTO instances (instance) VALUES (?)`;
    const values = [instance];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`Instancia ${instance} agregada`);
      }
    } catch (error) {
      console.error('Error al insertar la instancia', error);
    }
    await this.closeConnection(this.dbPublic);
  }

  private async truncateInstances() {
    const statement = 'DELETE FROM instances';

    try {
      if (this.db) {
        await this.db.run(statement);
        console.log('Instancias eliminadas');
      }
    } catch (error) {
      console.error('Error al eliminar instancias:', error);
    }
  }

  async logoutUser() {
    await this.loadConnection(this.dbPublic);
    const statement = 'UPDATE userlogin SET logged = FALSE';

    try {
      if (this.db) {
        await this.db.run(statement);
        console.log(`Usuario actualizado`);
      }
    } catch (error) {
      console.error('Ha ocurrido un error al actualizar el usuario', error);
    }
    await this.closeConnection(this.dbPublic);
  }

  async getLoginUsers() {
    await this.loadConnection(this.dbPublic);
    const statement = `SELECT name, logged, datetime(last_login, 'unixepoch') as last_login FROM userlogin ORDER BY last_login DESC`;

    try {
      if (this.db) {
        const results = (await this.db.query(statement)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo los usuarios:', error);
      return [];
    } finally {
      await this.closeConnection(this.dbPublic);
    }
  }

  async getLoggedUser() {
    await this.loadConnection(this.dbPublic);
    const statement = `SELECT name, logged, datetime(last_login, 'unixepoch') as last_login FROM userlogin WHERE logged = TRUE`;

    try {
      if (this.db) {
        const results = (await this.db.query(statement)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo el usuario logueado:', error);
      return [];
    } finally {
      await this.closeConnection(this.dbPublic);
    }
  }

  async getInstances() {
    await this.loadConnection(this.dbPublic);
    const statement = `SELECT * FROM instances`;

    try {
      if (this.db) {
        const results = (await this.db.query(statement)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo las instancias:', error);
      return [];
    } finally {
      await this.closeConnection(this.dbPublic);
    }
  }

  async getApps() {
    await this.loadConnection(this.dbUser);
    const statement = 'SELECT * FROM apps';

    try {
      if (this.db) {
        const results = (await this.db.query(statement)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo las apps:', error);
      return [];
    } finally {
      await this.closeConnection(this.dbUser);
    }
  }

  async getTerritoriesByApp(idApp: Number) {
    await this.loadConnection(this.dbUser);
    const statement = 'SELECT * FROM territory WHERE id_app = ?';
    const values = [idApp];
    try {
      if (this.db) {
        const results = (await this.db.query(statement, values)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo los territorios:', error);
      return [];
    } finally {
      await this.closeConnection(this.dbUser);
    }
  }

  async getLayersByApp(idApp: Number) {
    await this.loadConnection(this.dbUser);
    const statement = 'SELECT * FROM layers WHERE id_app = ?';
    const values = [idApp];

    try {
      if (this.db) {
        const results = (await this.db.query(statement, values)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo las layers:', error);
      return [];
    } finally {
      await this.closeConnection(this.dbUser);
    }
  }


  async getLayersByAppAndTer(idApp: Number, idTer: number) {
    await this.loadConnection(this.dbUser);
    const statement = 'SELECT * FROM layers WHERE id_app = ? AND id_ter = ?';
    const values = [idApp, idTer];

    try {
      if (this.db) {
        const results = (await this.db.query(statement, values)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo las layers:', error);
      return [];
    } finally {
      await this.closeConnection(this.dbUser);
    }
  }

   async getbgLayerByAppAndTer(idApp: Number, idTer: number) {
    await this.loadConnection(this.dbUser);
    const statement = 'SELECT * FROM bgLayers WHERE id_app = ? AND id_ter = ?';
    const values = [idApp, idTer];

    try {
      if (this.db) {
        const results = (await this.db.query(statement, values)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo las bgLayers:', error);
      return [];
    } finally {
      await this.closeConnection(this.dbUser);
    }
  }

  async getEditionsByAppAndTer(idApp: Number, idTer: number) {
    await this.loadConnection(this.dbUser);
    const statement = 'SELECT * FROM featureEditions WHERE id_app = ? AND id_ter = ?';
    const values = [idApp, idTer];

    try {
      if (this.db) {
        const results = (await this.db.query(statement, values)).values;
        if (results) {
          return results;
        } else {
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('Error obteniendo las editions:', error);
      return [];
    } finally {
      await this.closeConnection(this.dbUser);
    }
  }

  async deleteAllEditions(idApp: Number, idTer: number) {
    await this.loadConnection(this.dbUser);
    const statement = 'DELETE FROM featureEditions WHERE id_app = ? AND id_ter = ?';
    const values = [idApp, idTer];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log('Ediciones eliminadas');
      }
    } catch (error) {
      console.error('Error al eliminar ediciones:', error);
    } finally {
      await this.sqlite.closeConnection(this.dbUser);
    }
  }

  async deleteEditionsByLayer(idApp: Number, idTer: number, layerId: string) {
    await this.loadConnection(this.dbUser);
    const statement = 'DELETE FROM featureEditions WHERE id_app = ? AND id_ter = ? AND id_layer = ?';
    const values = [idApp, idTer, layerId];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log('Ediciones eliminadas');
      }
    } catch (error) {
      console.error('Error al eliminar ediciones:', error);
    } finally {
      await this.sqlite.closeConnection(this.dbUser);
    }
  }

  //elimina app si no hay territorios asociados
  async deleteApp(idApp: number) {
    await this.loadConnection(this.dbUser);
    const statement = 'DELETE FROM apps WHERE id = ? AND id NOT IN (SELECT id_app FROM territory)';
    const values = [idApp];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log('App eliminado si no tiene otros territorios descargados');
      }
    } catch (error) {
      console.error('Error al eliminar la app:', error);
    } finally {
      await this.sqlite.closeConnection(this.dbUser);
    }
  }

  async deleteTer(idTer: number) {
    await this.loadConnection(this.dbUser);
    const statement = 'DELETE FROM territory WHERE id = ?';
    const values = [idTer];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log('Territorio eliminado');
      }
    } catch (error) {
      console.error('Error al eliminar territorio:', error);
    } finally {
      await this.sqlite.closeConnection(this.dbUser);
    }
  }

  async deleteLayersByAppAndTer(idApp: Number, idTer: number) {
    await this.loadConnection(this.dbUser);
    const statement = 'DELETE FROM layers WHERE id_app = ? AND id_ter = ?';
    const values = [idApp, idTer];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log('Capas previas eliminadas');
      }
    } catch (error) {
      console.error('Error al eliminar capas:', error);
    } finally {
      await this.sqlite.closeConnection(this.dbUser);
    }
  }


}
