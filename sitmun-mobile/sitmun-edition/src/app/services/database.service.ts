import { Injectable } from '@angular/core';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { SQLiteService } from './sqlite.service';
import { Capacitor } from '@capacitor/core';
import { InstancesService } from './instances.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  private db: SQLiteDBConnection | null = null;
  private dbName: string = '';
  private dbUsers: string = 'users'

  constructor(private instanceService: InstancesService, private sqlite: SQLiteService) {
    this.dbName = this.instanceService.instanceName + '.db';
  }

  async loadConnectionDefault() {
    await this.loadConnection(this.dbName);
  }

  async loadConnection(name: string) {
    try {
      let isConnection = await this.sqlite.isConnection(name);
      if (isConnection.result) {
        console.log("Obteniendo conexion");
        this.db = await this.sqlite.retrieveConnection(name);
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

  async initDatabase(dbName: string) {
    if (!this.checkPlugin()) {
      console.log('Plugin no disponible');
      return;
    }
    try {
      this.dbName = dbName;
      console.log('Inicializando base de datos');
      await this.loadConnection(this.dbName);
      await this.createTables();
      await this.closeConnection(this.dbName);
      console.log(`Base de datos ${this.dbName} inicializada`);
    } catch (error) {
      throw Error(`DatabaseServiceError: ${error}`);
    }
  }

  async initUsersDatabase() {
    if (!this.checkPlugin()) {
      console.log('Plugin no disponible');
      return;
    }
    try {
      console.log('Inicializando base de datos');
      await this.loadConnection(this.dbUsers);
      await this.createUsersTables();
      await this.closeConnection(this.dbUsers);
      console.log(`Base de datos ${this.dbUsers} inicializada`);
    } catch (error) {
      throw Error(`DatabaseServiceError: ${error}`);
    }
  }

  private async createTables(): Promise<void> {
    await this.createAppsTable();
    await this.createTerritoryTable();
    await this.createLayersTable();
    await this.createAppTerLayerTable();
  }

  private async createUsersTables(): Promise<void> {
    await this.createUserLoginTable();
  }

  private async createUserLoginTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS userlogin (
        instance TEXT,
        name TEXT,
        logged BOOLEAN,
        last_login DATETIME,
        PRIMARY KEY (instance, name)
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
        id TEXT PRIMARY KEY,
        name TEXT,
        geojson TEXT
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

  async insertApp(id: number, title: string, logo: string) {
    await this.loadConnection(this.dbName);
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
    await this.closeConnection(this.dbName);
  }

  async insertTerritory(id: number, name: string) {
    await this.loadConnection(this.dbName);
    const statement = `INSERT OR REPLACE INTO territory (id, name) VALUES (?, ?)`;
    const values = [id, name];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`Territorio ${name} agregado`);
      }
    } catch (error) {
      console.error('Error al insertar el territorio', error);
    }
    await this.closeConnection(this.dbName);
  }

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

  async insertLayer(idLayer: string, name: string, geojson: string) {
    //await this.loadConnection(this.dbName);
    const statement = `INSERT OR REPLACE INTO layers (id, name, geojson) VALUES (?, ?, ?)`;
    const values = [idLayer, name, geojson];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`Layer ${name} agregado`);
      }
    } catch (error) {
      console.error('Error al insertar el layer', error);
    }
    //await this.closeConnection(this.dbName);
  }

  async insertUserLogin(instance: string, name: string) {
    await this.loadConnection(this.dbUsers);
    const statement = `INSERT OR REPLACE INTO userlogin (instance, name, logged, last_login) VALUES (?, ?, TRUE, strftime('%s', 'now'))`;
    const values = [instance, name];

    try {
      if (this.db) {
        await this.db.run(statement, values);
        console.log(`Usuario ${name} agregado`);
      }
    } catch (error) {
      console.error('Error al insertar el usuario', error);
    }
    await this.closeConnection(this.dbUsers);
  }

  async logoutUser() {
    await this.loadConnection(this.dbUsers);
    const statement = 'UPDATE userlogin SET logged = FALSE';

    try {
      if (this.db) {
        await this.db.run(statement);
        console.log(`Usuario actualizado`);
      }
    } catch (error) {
      console.error('Ha ocurrido un error al actualizar el usuario', error);
    }
    await this.closeConnection(this.dbUsers);
  }

  async getLoginUsers() {
    await this.loadConnection(this.dbUsers);
    const statement = `SELECT instance, name, logged, datetime(last_login, 'unixepoch') as last_login FROM userlogin`;

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
      await this.closeConnection(this.dbUsers);
    }
  }

  async getApps() {
    await this.loadConnection(this.dbName);
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
      await this.closeConnection(this.dbName);
    }
  }

  async getTerritoriesByApp(idApp: Number) {
    await this.loadConnection(this.dbName);
    const statement = 'SELECT * FROM territory WHERE id IN (SELECT id_ter FROM app_ter_layer WHERE id_app = ?)';
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
      console.error('Error obteniendo las apps:', error);
      return [];
    } finally {
      await this.closeConnection(this.dbName);
    }
  }


}
